import type { Server } from "socket.io";
import sql from "../lib/db.ts";
import { userIdFromToken, resolveAccount, type Account } from "../lib/auth.ts";
import { cheapestAvailableFloor, safeMaxBid, validateBid } from "./rules.db.ts";
import { floorForRank, effectiveRank } from "./gameDefaults.ts";

/**
 * The live auction engine, ported from the Mongo version to Neon/SQL.
 *
 * Design rules (unchanged):
 *  - The SERVER is the single source of truth. Clients only render.
 *  - The TIMER lives here, not on any client. Clients render a countdown from
 *    `timerEndsAt`. The server decides when a player is sold.
 *  - Bids apply with an ATOMIC conditional UPDATE (WHERE current_price < amount),
 *    so two simultaneous bids can't corrupt the price — one wins, one re-bids.
 */

// In-memory sell-timer handles, keyed by tournamentId. Rebuilt on boot from
// auction_sessions (see resumeTimers).
const timers = new Map<string, NodeJS.Timeout>();

// `protectThroughSlot` (admin-configurable, auction_sessions.safe_max_slots) is the last
// slot safe-max still reserves budget for. Once a team has filled one short of it, the
// next pick is treated as their last protected slot — safe-max stops reserving beyond it
// so they can go all-in. Setting it to the full roster size reproduces the original
// behavior (reservation covers every open slot, subs included).
function effectiveOpenSlots(filled: number, openSlots: number, protectThroughSlot: number): number {
  return filled >= protectThroughSlot - 1 ? Math.min(openSlots, 1) : openSlots;
}

let ioRef: Server | null = null;

const room = (tournamentId: string) => `auction:${tournamentId}`;

type ActionResult = { ok: true } | { error: string };

/** Player display fields the game-aware PlayerCard needs, from the snapshot. */
async function playerView(registrationId: string | null, game: string) {
  if (!registrationId) return null;
  const [r] = await sql`
    SELECT r.id,
           r."userId",
           r."snapshotDisplayName"    AS name,
           r."snapshotRiotId",
           r."snapshotRankTier",
           r."snapshotPeakRankTier",
           r."snapshotValorantRoles",
           r."snapshotSteamId64",
           r."snapshotCs2PeakPremier",
           r."snapshotCs2FaceitRank",
           r."snapshotOlympusId",
           r."snapshotDateOfBirth",
           u."riotPlayerCard"         AS card_url,
           u."riotPlayerCardWide"     AS card_url_wide
    FROM "TournamentRegistration" r
    LEFT JOIN "User" u ON u.id = r."userId"
    WHERE r.id = ${registrationId}
  `;
  if (!r) return null;

  // Only badges from this auction's game count (a Valorant auction shouldn't show CS2/FC26
  // trophies). Badges with no tournament linked can't be attributed to a game, so always show.
  const badges = r.userId
    ? await sql<{ label: string }[]>`
        SELECT pb.label
        FROM "PlayerBadge" pb
        LEFT JOIN "Tournament" t ON t.id = pb."tournamentId"
        WHERE pb."userId" = ${r.userId}
          AND (pb."tournamentId" IS NULL OR t.game = ${game})
        ORDER BY pb."awardedAt" DESC
      `
    : [];
  return Object.assign(r, { badges: badges.map((b) => b.label) });
}

/**
 * Full public snapshot sent to all clients. Per-team budgets/rosters so
 * captains and observers see everything live.
 */
async function buildSnapshot(tournamentId: string) {
  const [session] = await sql`
    SELECT s.*, t.name AS tournament_name, t.game AS tournament_game
    FROM auction_sessions s
    LEFT JOIN "Tournament" t ON t.id = s.tournament_id
    WHERE s.tournament_id = ${tournamentId}
  `;
  if (!session) return null;

  const [teams, sold, [counts], allPlayers, captains] = await Promise.all([
    sql`SELECT * FROM auction_teams WHERE session_id = ${session.id} ORDER BY name`,
    sql`
      SELECT ap.team_id, ap.sold_price, r.id AS registration_id, r."snapshotDisplayName" AS name,
             r."participantRole" AS participant_role, r."snapshotPhone" AS phone,
             COALESCE(r."snapshotRankTier", r."snapshotCs2PeakPremier") AS rank,
             r."snapshotValorantRoles" AS roles
      FROM auction_players ap
      JOIN "TournamentRegistration" r ON r.id = ap.registration_id
      WHERE ap.session_id = ${session.id} AND ap.status = 'sold'
      ORDER BY ap.sold_at ASC
    `,
    sql`
      SELECT
        count(*) FILTER (WHERE status IN ('pool','on_auction'))::int AS pool,
        count(*) FILTER (WHERE status = 'sold')::int                AS sold,
        count(*) FILTER (WHERE status = 'unsold')::int              AS unsold
      FROM auction_players WHERE session_id = ${session.id}
    `,
    sql`
      SELECT ap.registration_id, ap.status, ap.floor_price, ap.sold_price, ap.team_id,
             r."snapshotDisplayName" AS name,
             COALESCE(r."snapshotRankTier", r."snapshotCs2PeakPremier") AS rank,
             r."snapshotValorantRoles" AS roles
      FROM auction_players ap
      JOIN "TournamentRegistration" r ON r.id = ap.registration_id
      WHERE ap.session_id = ${session.id}
      ORDER BY r."snapshotDisplayName"
    `,
    sql`
      SELECT r.id AS registration_id, r."snapshotDisplayName" AS name, r."snapshotPhone" AS phone,
             COALESCE(r."snapshotRankTier", r."snapshotCs2PeakPremier") AS rank,
             r."snapshotValorantRoles" AS roles, t.id AS team_id
      FROM "TournamentRegistration" r
      JOIN auction_teams t ON t.registration_id = r.id
      WHERE t.session_id = ${session.id}
    `,
  ]);

  const rosterSize = session.roster_size;
  const safeMaxProtectThroughSlot = session.safe_max_slots;
  const cheapestFloor = await cheapestAvailableFloor(tournamentId);

  const teamView = teams.map((t) => {
    const draftRoster = sold.filter((s) => s.team_id === t.id);
    // Roster size counts the captain + co-captains + drafted players. The captain
    // isn't in `sold`, so subtract 1 for them; co-captains are pre-sold and already in `sold`.
    const filled = draftRoster.length + 1;
    const openSlots = Math.max(rosterSize - filled, 0);
    const safeMaxOpenSlots = effectiveOpenSlots(filled, openSlots, safeMaxProtectThroughSlot);

    const captain = captains.find((c) => c.team_id === t.id);
    const captainRosterItem = captain ? [{
      registrationId: captain.registration_id,
      name: captain.name,
      rank: captain.rank,
      roles: captain.roles,
      phone: captain.phone,
      role: "captain" as const,
      price: null,
    }] : [];

    const draftRosterItems = draftRoster.map((s) => ({
      registrationId: s.registration_id,
      name: s.name,
      rank: s.rank,
      roles: s.roles,
      phone: s.phone,
      role: s.participant_role === "CO_CAPTAIN" ? ("co_captain" as const) : ("player" as const),
      price: s.sold_price,
    }));

    return {
      id: t.id,
      name: t.name,
      currentBudget: t.current_budget,
      color: t.color,
      rosterCount: filled,
      rosterSize,
      openSlots,
      roster: [...captainRosterItem, ...draftRosterItems],
      safeMax: safeMaxBid({ currentBudget: t.current_budget, openSlots: safeMaxOpenSlots, cheapestFloor }),
    };
  });

  return {
    tournamentId,
    tournamentName: session.tournament_name || "AUC CUP IV",
    game: session.tournament_game || session.game || "VALORANT",
    rankTable: session.rank_table,
    status: session.status,
    pass: session.pass,
    settings: {
      minBidIncrement: session.min_bid_increment,
      rosterSize,
      timerSeconds: session.timer_seconds,
      coCaptainSlots: session.co_captain_slots,
      auctionStartsAt: session.auction_starts_at,
      auctionEndsAt: session.auction_ends_at,
      safeMaxSlots: safeMaxProtectThroughSlot,
      finalized: session.finalized,
    },
    currentPlayer: await playerView(session.current_registration_id, session.tournament_game || session.game || "VALORANT"),
    currentPrice: session.current_price,
    highestBidder: session.highest_bidder_id,
    highestBidderName: session.highest_bidder_name,
    timerEndsAt: session.timer_ends_at,
    pausedRemainingMs: session.paused_remaining_ms,
    bidHistory: session.bid_history,
    saleLog: sold
      .slice(-8)
      .reverse()
      .map((s) => ({ playerName: s.name, teamName: teams.find((t) => t.id === s.team_id)?.name, price: s.sold_price })),
    // Highest sale across the WHOLE auction, not just the last 8 in saleLog.
    topSale: sold.reduce<{ playerName: string; teamName?: string; price: number } | null>((top, s) => {
      if (top && top.price >= s.sold_price) return top;
      return { playerName: s.name, teamName: teams.find((t) => t.id === s.team_id)?.name, price: s.sold_price };
    }, null),
    teams: teamView,
    counts,
    players: allPlayers.map((p) => ({
      registrationId: p.registration_id,
      name: p.name,
      rank: p.rank,
      roles: p.roles,
      status: p.status,
      floor: p.floor_price,
      soldPrice: p.sold_price,
      teamName: teams.find((t) => t.id === p.team_id)?.name ?? null,
    })),
    serverTime: Date.now(),
  };
}

async function broadcast(tournamentId: string) {
  const snap = await buildSnapshot(tournamentId);
  if (snap && ioRef) ioRef.to(room(tournamentId)).emit("state", snap);
}

function clearTimer(tournamentId: string) {
  const handle = timers.get(tournamentId);
  if (handle) {
    clearTimeout(handle);
    timers.delete(tournamentId);
  }
}

/** Arms the server-side sell timer; on fire, finalize the current player. */
function armTimer(tournamentId: string, msFromNow: number) {
  clearTimer(tournamentId);
  timers.set(
    tournamentId,
    setTimeout(() => {
      finalizeSale(tournamentId).catch((e) => console.error("[auction] finalize failed:", e));
    }, msFromNow),
  );
}

/**
 * Concludes the current player's auction: sells to the highest bidder or marks
 * unsold, then resets the block back to idle.
 */
async function finalizeSale(tournamentId: string) {
  clearTimer(tournamentId);
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || !["live", "paused"].includes(state.status)) return;
  if (!state.current_registration_id) return;

  const player = await playerView(state.current_registration_id, state.game);

  if (state.highest_bidder_id) {
    // SOLD. Deduct credits and mark the player won (this row IS the roster entry).
    await sql`UPDATE auction_teams SET current_budget = current_budget - ${state.current_price} WHERE id = ${state.highest_bidder_id}`;
    await sql`
      UPDATE auction_players
      SET status = 'sold', sold_price = ${state.current_price},
          team_id = ${state.highest_bidder_id}, sold_at = NOW()
      WHERE session_id = ${state.id} AND registration_id = ${state.current_registration_id}
    `;
    ioRef?.to(room(tournamentId)).emit("playerSold", {
      playerName: player?.name,
      teamName: state.highest_bidder_name,
      price: state.current_price,
    });
  } else {
    // UNSOLD. No bids — goes to the pass-2 re-auction pool. Apply a 25% discount.
    const [ap] = await sql<{ floor_price: number }[]>`
      SELECT floor_price 
      FROM auction_players 
      WHERE session_id = ${state.id} AND registration_id = ${state.current_registration_id}
    `;
    const currentFloor = ap?.floor_price ?? 0;
    const discounted = Math.max(1, Math.floor(currentFloor * 0.75));
    await sql`
      UPDATE auction_players 
      SET status = 'unsold', floor_price = ${discounted} 
      WHERE session_id = ${state.id} AND registration_id = ${state.current_registration_id}
    `;
    ioRef?.to(room(tournamentId)).emit("playerUnsold", { playerName: player?.name });
  }

  await sql`
    UPDATE auction_sessions
    SET status = 'idle', current_registration_id = NULL, current_price = 0,
        highest_bidder_id = NULL, highest_bidder_name = NULL, timer_ends_at = NULL,
        paused_remaining_ms = NULL, bid_history = '[]'::jsonb, updated_at = NOW()
    WHERE tournament_id = ${tournamentId}
  `;
  await broadcast(tournamentId);
}

/* ----------------------------- Auctioneer actions ----------------------------- */

/** Draws a random pool (pass 1) or unsold (pass 2) player into the showcase. */
async function selectPlayer(tournamentId: string, { pass }: { pass?: number }): Promise<ActionResult> {
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || state.status !== "idle") {
    return { error: "Finish the current player before drawing the next" };
  }

  const drawStatus = pass === 2 ? "unsold" : "pool";
  const [pick] = await sql`
    SELECT registration_id, floor_price
    FROM auction_players
    WHERE session_id = ${state.id} AND status = ${drawStatus}
    ORDER BY RANDOM()
    LIMIT 1
  `;
  if (!pick) {
    return { error: pass === 2 ? "No unsold players remain" : "The pool is empty" };
  }

  await sql`UPDATE auction_players SET status = 'on_auction' WHERE session_id = ${state.id} AND registration_id = ${pick.registration_id}`;
  await sql`
    UPDATE auction_sessions
    SET status = 'showcase', pass = ${pass || 1}, current_registration_id = ${pick.registration_id},
        current_price = ${pick.floor_price}, highest_bidder_id = NULL, highest_bidder_name = NULL,
        timer_ends_at = NULL, bid_history = '[]'::jsonb, updated_at = NOW()
    WHERE tournament_id = ${tournamentId}
  `;
  await broadcast(tournamentId);
  return { ok: true };
}

/** Opens bidding on the showcased player and arms the timer. */
async function startAuction(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || state.status !== "showcase") return { error: "No player is in the showcase" };

  const ms = state.timer_seconds * 1000;
  const endsAt = new Date(Date.now() + ms);
  await sql`
    UPDATE auction_sessions
    SET status = 'live', timer_ends_at = ${endsAt}, updated_at = NOW()
    WHERE tournament_id = ${tournamentId}
  `;
  armTimer(tournamentId, ms);
  await broadcast(tournamentId);
  return { ok: true };
}

/** Auctioneer ends the current player early ("hammer"). */
async function hammer(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT status FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || state.status !== "live") return { error: "Nothing live to hammer" };
  await finalizeSale(tournamentId);
  return { ok: true };
}

/** Pauses a live auction, banking the remaining time. */
async function pause(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || state.status !== "live") return { error: "Nothing live to pause" };

  clearTimer(tournamentId);
  const remaining = Math.max(new Date(state.timer_ends_at).getTime() - Date.now(), 0);
  await sql`
    UPDATE auction_sessions
    SET status = 'paused', paused_remaining_ms = ${remaining}, timer_ends_at = NULL, updated_at = NOW()
    WHERE tournament_id = ${tournamentId}
  `;
  await broadcast(tournamentId);
  return { ok: true };
}

/** Resumes a paused auction with the banked time restored. */
async function resume(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || state.status !== "paused") return { error: "Auction is not paused" };

  const ms = state.paused_remaining_ms ?? 0;
  const endsAt = new Date(Date.now() + ms);
  await sql`
    UPDATE auction_sessions
    SET status = 'live', timer_ends_at = ${endsAt},
        paused_remaining_ms = NULL, updated_at = NOW()
    WHERE tournament_id = ${tournamentId}
  `;
  armTimer(tournamentId, ms);
  await broadcast(tournamentId);
  return { ok: true };
}

/**
 * Undoes the most recent completed sale: refunds the team and returns the
 * player to the pool. Only safe between players (status must be idle).
 */
async function undoLastSale(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };
  if (state.status !== "idle") return { error: "Finish or hammer the current player before undoing" };

  const [last] = await sql`
    SELECT registration_id, team_id, sold_price
    FROM auction_players
    WHERE session_id = ${state.id} AND status = 'sold'
    ORDER BY sold_at DESC LIMIT 1
  `;
  if (!last) return { error: "Nothing to undo" };

  await sql`UPDATE auction_teams SET current_budget = current_budget + ${last.sold_price} WHERE id = ${last.team_id}`;
  await sql`
    UPDATE auction_players
    SET status = 'pool', sold_price = NULL, team_id = NULL, sold_at = NULL
    WHERE session_id = ${state.id} AND registration_id = ${last.registration_id}
  `;
  await broadcast(tournamentId);
  return { ok: true };
}

/** Admin correction tool: revert a single sold player back to the pool and refund their team,
 *  regardless of when they were sold (unlike `undoLastSale`, which only undoes the most recent). */
async function unsellPlayer(tournamentId: string, { registrationId }: { registrationId?: string }): Promise<ActionResult> {
  if (!registrationId) return { error: "Missing player" };
  const [state] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };

  const [sale] = await sql`
    SELECT team_id, sold_price FROM auction_players
    WHERE session_id = ${state.id} AND registration_id = ${registrationId} AND status = 'sold'
  `;
  if (!sale) return { error: "Player is not currently sold" };

  await sql`UPDATE auction_teams SET current_budget = current_budget + ${sale.sold_price} WHERE id = ${sale.team_id}`;
  await sql`
    UPDATE auction_players
    SET status = 'pool', sold_price = NULL, team_id = NULL, sold_at = NULL
    WHERE session_id = ${state.id} AND registration_id = ${registrationId}
  `;
  await broadcast(tournamentId);
  return { ok: true };
}

/**
 * Publishes the final rosters to the main site by writing into its existing
 * "TournamentTeam" / "TournamentTeamPlayer" tables — the only place the auction
 * writes outside auction_*. The main tournament page already renders these.
 * Idempotent: replaces this tournament's team rows. Each roster = captain first,
 * then the players that team won.
 *
 * Prisma generates id/updatedAt in-client (no DB default), so we supply them.
 */
async function publishResults(tournamentId: string): Promise<ActionResult> {
  const [session] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!session) return { error: "No auction" };
  const teams = await sql`SELECT * FROM auction_teams WHERE session_id = ${session.id}`;
  if (!teams.length) return { error: "No teams to publish" };

  // Delete existing teams BEFORE the transaction so a retry never hits the unique constraint.
  // Cascades to TournamentTeamPlayer via FK.
  await sql`DELETE FROM "TournamentTeam" WHERE "tournamentId" = ${tournamentId}`;

  await sql.begin(async (tx) => {
    for (let ti = 0; ti < teams.length; ti++) {
      const team = teams[ti];
      const teamId = crypto.randomUUID();
      await tx`
        INSERT INTO "TournamentTeam"
          (id, "tournamentId", name, "captainUserId", "sourceRegistrationId", "sortOrder", "updatedAt")
        VALUES (${teamId}, ${tournamentId}, ${team.name}, ${team.captain_user_id}, ${team.registration_id}, ${ti}, NOW())
      `;

      // Roster: the captain's registration (sortOrder 0) + this team's sold players.
      const members = await tx`
        SELECT r.id, r."userId", r."snapshotDisplayName", r."snapshotRiotId",
               r."snapshotValorantRoles", r."snapshotRankTier", r."snapshotPeakRankTier", r."snapshotCs2PeakPremier",
               (r.id <> ${team.registration_id})::int AS is_player
        FROM "TournamentRegistration" r
        WHERE r.id = ${team.registration_id}
           OR r.id IN (
             SELECT registration_id FROM auction_players
             WHERE session_id = ${session.id} AND status = 'sold' AND team_id = ${team.id}
           )
        ORDER BY is_player ASC
      `;

      let order = 0;
      for (const m of members) {
        const [gameName, tagLine] = String(m.snapshotRiotId ?? "").split("#");
        let finalRank = session.game === "CS2" ? m.snapshotCs2PeakPremier : m.snapshotRankTier;
        if (session.game === "VALORANT") {
          const isUnranked = !m.snapshotRankTier || m.snapshotRankTier.toLowerCase().trim() === "unranked";
          if (isUnranked && m.snapshotPeakRankTier) {
            finalRank = m.snapshotPeakRankTier;
          }
        }
        await tx`
          INSERT INTO "TournamentTeamPlayer"
            (id, "teamId", "userId", "registrationId", "displayName", "riotGameName", "riotTagLine",
             "valorantRoles", "peakPremierRank", "sortOrder")
          VALUES (
            ${crypto.randomUUID()}, ${teamId}, ${m.userId}, ${m.id},
            ${m.snapshotDisplayName ?? "Player"}, ${gameName || null}, ${tagLine || null},
            ${m.snapshotValorantRoles ? sql.json(m.snapshotValorantRoles) : null},
            ${finalRank}, ${order++}
          )
        `;
      }
    }
  });
  return { ok: true };
}

/* ----------------------------- Admin overrides ----------------------------- */

/** Patch session settings (timer length, min increment, roster size). */
async function updateSettings(
  tournamentId: string,
  { timerSeconds, minBidIncrement, rosterSize, safeMaxSlots }: { timerSeconds?: number; minBidIncrement?: number; rosterSize?: number; safeMaxSlots?: number },
): Promise<ActionResult> {
  const clamp = (v: unknown, lo: number, hi: number) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : null;
  };
  const ts = clamp(timerSeconds, 3, 600);
  const mi = clamp(minBidIncrement, 1, 1000);
  const rs = clamp(rosterSize, 1, 20);
  const sms = clamp(safeMaxSlots, 1, 20);
  await sql`
    UPDATE auction_sessions SET
      timer_seconds = COALESCE(${ts}, timer_seconds),
      min_bid_increment = COALESCE(${mi}, min_bid_increment),
      roster_size = COALESCE(${rs}, roster_size),
      safe_max_slots = LEAST(COALESCE(${sms}, safe_max_slots), COALESCE(${rs}, roster_size)),
      updated_at = NOW()
    WHERE tournament_id = ${tournamentId}
  `;
  await broadcast(tournamentId);
  return { ok: true };
}

/** Add (or remove, if negative) time on the current live countdown. */
async function addTime(tournamentId: string, { ms }: { ms?: number }): Promise<ActionResult> {
  const delta = Number(ms);
  if (!Number.isFinite(delta)) return { error: "Invalid amount" };
  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || state.status !== "live") return { error: "Auction is not live" };
  const newEnd = new Date(new Date(state.timer_ends_at).getTime() + delta);
  await sql`UPDATE auction_sessions SET timer_ends_at = ${newEnd}, updated_at = NOW() WHERE tournament_id = ${tournamentId}`;
  armTimer(tournamentId, Math.max(newEnd.getTime() - Date.now(), 0));
  await broadcast(tournamentId);
  return { ok: true };
}

/** Manually fix the current asking price (rate fixing — not a bid). */
async function setPrice(tournamentId: string, { amount }: { amount?: number }): Promise<ActionResult> {
  const a = Number(amount);
  if (!Number.isFinite(a) || a < 0) return { error: "Invalid amount" };
  const [state] = await sql`SELECT status, current_registration_id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state || !state.current_registration_id || !["showcase", "live", "paused"].includes(state.status)) {
    return { error: "No player on the block" };
  }
  await sql`UPDATE auction_sessions SET current_price = ${a}, updated_at = NOW() WHERE tournament_id = ${tournamentId}`;
  await broadcast(tournamentId);
  return { ok: true };
}

/**
 * Manually sell a player to a chosen team at a chosen price — bypassing
 * bidding entirely. Works two ways:
 *  - registrationId omitted: sells whoever is currently on the block (used by
 *    a live-round override) and resets the session back to idle.
 *  - registrationId given: sells that specific pool/unsold player directly
 *    (used from the Setup-tab player board) without touching session state,
 *    so it can't interrupt an unrelated live round.
 */
async function manualSell(
  tournamentId: string,
  { registrationId, teamId, price }: { registrationId?: string; teamId?: string; price?: number },
): Promise<ActionResult> {
  const p = Number(price);
  if (!teamId) return { error: "Pick a team" };
  if (!Number.isFinite(p) || p < 0) return { error: "Invalid price" };

  const [state] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };

  const targetId = registrationId ?? state.current_registration_id;
  if (!targetId) return { error: "No player selected" };
  const isCurrent = targetId === state.current_registration_id;
  if (!registrationId && !["showcase", "live", "paused"].includes(state.status)) {
    return { error: "No player on the block" };
  }

  const [player] = await sql`SELECT status FROM auction_players WHERE session_id = ${state.id} AND registration_id = ${targetId}`;
  if (!player) return { error: "Unknown player" };
  if (player.status === "sold") return { error: "Player is already sold" };

  const [team] = await sql`SELECT * FROM auction_teams WHERE id = ${teamId} AND session_id = ${state.id}`;
  if (!team) return { error: "Unknown team" };

  if (isCurrent) clearTimer(tournamentId);
  const view = await playerView(targetId, state.game);
  await sql`UPDATE auction_teams SET current_budget = current_budget - ${p} WHERE id = ${teamId}`;
  await sql`
    UPDATE auction_players SET status = 'sold', sold_price = ${p}, team_id = ${teamId}, sold_at = NOW()
    WHERE session_id = ${state.id} AND registration_id = ${targetId}
  `;
  ioRef?.to(room(tournamentId)).emit("playerSold", { playerName: view?.name, teamName: team.name, price: p });

  if (isCurrent) {
    await sql`
      UPDATE auction_sessions SET status = 'idle', current_registration_id = NULL, current_price = 0,
        highest_bidder_id = NULL, highest_bidder_name = NULL, timer_ends_at = NULL, paused_remaining_ms = NULL,
        bid_history = '[]'::jsonb, updated_at = NOW()
      WHERE tournament_id = ${tournamentId}
    `;
  }
  await broadcast(tournamentId);
  return { ok: true };
}

/** Edit a player's floor price before they're drawn (pool or unsold only). */
async function setFloor(
  tournamentId: string,
  { registrationId, floor }: { registrationId?: string; floor?: number },
): Promise<ActionResult> {
  const f = Number(floor);
  if (!registrationId) return { error: "No player" };
  if (!Number.isFinite(f) || f < 0) return { error: "Invalid floor" };
  const [state] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };
  const res = await sql`
    UPDATE auction_players SET floor_price = ${f}
    WHERE session_id = ${state.id} AND registration_id = ${registrationId} AND status IN ('pool', 'unsold')
    RETURNING registration_id
  `;
  if (!res.length) return { error: "Floor can only be changed before a player is drawn" };
  await broadcast(tournamentId);
  return { ok: true };
}

/** Admin: set a team's remaining budget directly. */
async function setTeamBudget(
  tournamentId: string,
  { teamId, budget }: { teamId?: string; budget?: number },
): Promise<ActionResult> {
  const b = Number(budget);
  if (!teamId) return { error: "Pick a team" };
  if (!Number.isFinite(b) || b < 0) return { error: "Invalid budget" };
  const [state] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };
  const res = await sql`
    UPDATE auction_teams SET current_budget = ${b}
    WHERE id = ${teamId} AND session_id = ${state.id}
    RETURNING id
  `;
  if (!res.length) return { error: "Unknown team" };
  await broadcast(tournamentId);
  return { ok: true };
}

/** Admin: set a team's color. */
async function setTeamColor(
  tournamentId: string,
  { teamId, color }: { teamId?: string; color?: string },
): Promise<ActionResult> {
  if (!teamId) return { error: "Pick a team" };
  if (!color) return { error: "Invalid color" };
  const [state] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };
  const res = await sql`
    UPDATE auction_teams SET color = ${color}
    WHERE id = ${teamId} AND session_id = ${state.id}
    RETURNING id
  `;
  if (!res.length) return { error: "Unknown team" };
  await broadcast(tournamentId);
  return { ok: true };
}

/** Admin: replace the rank->points table, write to main DB, and completely reset the auction. */
/** Update rank->floor prices and re-floor pool players only. Does NOT touch
 *  sold players, team budgets, or the live round — that's what `resetAuction` is for. */
async function setRankTable(
  tournamentId: string,
  { rankTable }: { rankTable?: { rank: string; floor: number }[] },
): Promise<ActionResult> {
  if (!Array.isArray(rankTable)) return { error: "Invalid rank table" };
  const table = rankTable
    .map((r) => ({ rank: String(r?.rank ?? "").trim(), floor: Number(r?.floor) }))
    .filter((r) => r.rank && Number.isFinite(r.floor) && r.floor >= 0);

  const [state] = await sql`SELECT id, game FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };

  await sql`
    UPDATE "Tournament"
    SET "rankPoints" = ${sql.json(table)}, "updatedAt" = NOW()
    WHERE id = ${tournamentId}
  `;

  await sql`
    UPDATE auction_sessions SET rank_table = ${sql.json(table)}, updated_at = NOW()
    WHERE id = ${state.id}
  `;

  const poolPlayers = await sql`
    SELECT ap.registration_id AS rid, r."snapshotRankTier" AS valorant_rank,
           r."snapshotPeakRankTier" AS valorant_peak_rank, r."snapshotCs2PeakPremier" AS cs2_rank
    FROM auction_players ap
    JOIN "TournamentRegistration" r ON r.id = ap.registration_id
    WHERE ap.session_id = ${state.id} AND ap.status = 'pool'
  `;
  for (const p of poolPlayers) {
    const newFloor = floorForRank(effectiveRank(state.game, p), table);
    await sql`UPDATE auction_players SET floor_price = ${newFloor} WHERE session_id = ${state.id} AND registration_id = ${p.rid}`;
  }

  await broadcast(tournamentId);
  return { ok: true };
}

/** Soft reset: puts every non-co-captain player back in the pool, re-floored from the
 *  session's current rank table, clears the live round, and restores team budgets. Blocked
 *  once the auction has been saved (`finalized`) — that lock is what makes Save meaningful. */
async function resetAuction(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT id, game, rank_table, finalized FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };
  if (state.finalized) return { error: "Auction is saved and can no longer be reset" };
  const table = state.rank_table || [];

  const activeTimer = timers.get(tournamentId);
  if (activeTimer) {
    clearTimeout(activeTimer);
    timers.delete(tournamentId);
  }

  await sql.begin(async (tx) => {
    await tx`
      UPDATE auction_sessions
      SET status = 'idle', pass = 1, current_registration_id = NULL, current_price = 0,
          highest_bidder_id = NULL, highest_bidder_name = NULL, timer_ends_at = NULL,
          paused_remaining_ms = NULL, bid_history = '[]', updated_at = NOW()
      WHERE id = ${state.id}
    `;

    await tx`UPDATE auction_teams SET current_budget = starting_budget WHERE session_id = ${state.id}`;

    const players = await tx`
      SELECT ap.registration_id AS rid, r."snapshotRankTier" AS valorant_rank,
             r."snapshotPeakRankTier" AS valorant_peak_rank, r."snapshotCs2PeakPremier" AS cs2_rank,
             r."participantRole" AS role, ap.team_id
      FROM auction_players ap
      JOIN "TournamentRegistration" r ON r.id = ap.registration_id
      WHERE ap.session_id = ${state.id}
    `;

    for (const p of players) {
      const newFloor = floorForRank(effectiveRank(state.game, p), table);

      if (p.role === "CO_CAPTAIN" && p.team_id) {
        await tx`
          UPDATE auction_players
          SET status = 'sold', sold_price = ${newFloor}, floor_price = ${newFloor}, sold_at = NOW()
          WHERE session_id = ${state.id} AND registration_id = ${p.rid}
        `;
      } else {
        await tx`
          UPDATE auction_players
          SET status = 'pool', sold_price = NULL, team_id = NULL, sold_at = NULL, floor_price = ${newFloor}
          WHERE session_id = ${state.id} AND registration_id = ${p.rid}
        `;
      }
    }

    const teams = await tx`
      SELECT t.id, r."snapshotRankTier" AS valorant_rank, r."snapshotPeakRankTier" AS valorant_peak_rank,
             r."snapshotCs2PeakPremier" AS cs2_rank
      FROM auction_teams t
      JOIN "TournamentRegistration" r ON r.id = t.registration_id
      WHERE t.session_id = ${state.id}
    `;
    for (const t of teams) {
      const captainCost = floorForRank(effectiveRank(state.game, t), table);
      const [{ sum: coCaptainCost }] = await tx<{ sum: number }[]>`
        SELECT COALESCE(SUM(ap.sold_price), 0)::int AS sum
        FROM auction_players ap
        JOIN "TournamentRegistration" r ON r.id = ap.registration_id
        WHERE ap.session_id = ${state.id} AND ap.team_id = ${t.id} AND r."participantRole" = 'CO_CAPTAIN'
      `;
      await tx`
        UPDATE auction_teams
        SET current_budget = GREATEST(starting_budget - ${captainCost} - ${coCaptainCost}, 0)
        WHERE id = ${t.id}
      `;
    }
  });

  await broadcast(tournamentId);
  return { ok: true };
}

/** Locks the auction in: after this, `resetAuction` refuses and the client reveals Publish. */
async function saveAuction(tournamentId: string): Promise<ActionResult> {
  const [state] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!state) return { error: "No auction" };
  await sql`UPDATE auction_sessions SET finalized = true, updated_at = NOW() WHERE id = ${state.id}`;
  await broadcast(tournamentId);
  return { ok: true };
}

/* ----------------------------- Captain action: bid ----------------------------- */

async function placeBid(tournamentId: string, teamId: string, amount: number): Promise<ActionResult> {
  const [[state], [team]] = await Promise.all([
    sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`,
    sql`SELECT * FROM auction_teams WHERE id = ${teamId}`,
  ]);
  if (!state || !team) return { error: "Auction not available" };

  const [{ count: soldCount }] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count
    FROM auction_players
    WHERE session_id = ${state.id} AND status = 'sold' AND team_id = ${teamId}
  `;
  const filled = soldCount + 1;
  const openSlots = Math.max(state.roster_size - filled, 0);
  const cheapestFloor = await cheapestAvailableFloor(tournamentId);

  const check = validateBid({
    auctionStatus: state.status,
    amount,
    currentPrice: state.current_price,
    minIncrement: state.min_bid_increment,
    teamIsHighestBidder: state.highest_bidder_id === teamId,
    openSlots: effectiveOpenSlots(filled, openSlots, state.safe_max_slots),
    currentBudget: team.current_budget,
    cheapestFloor,
  });
  if (!check.ok) return { error: check.reason };

  // Atomic apply: only succeeds if still live AND the price hasn't moved past
  // what this bid beats. If another bid landed first, 0 rows update → re-bid.
  const ms = state.timer_seconds * 1000;
  const endsAt = new Date(Date.now() + ms);
  const bidEntry = { team: teamId, teamName: team.name, amount, at: new Date().toISOString() };
  const updated = await sql`
    UPDATE auction_sessions
    SET current_price = ${amount}, highest_bidder_id = ${teamId}, highest_bidder_name = ${team.name},
        timer_ends_at = ${endsAt},
        bid_history = bid_history || ${sql.json(bidEntry)}::jsonb, updated_at = NOW()
    WHERE tournament_id = ${tournamentId} AND status = 'live' AND current_price < ${amount}
    RETURNING id
  `;
  if (!updated.length) return { error: "Someone bid first - the price moved. Try again." };

  armTimer(tournamentId, ms);
  ioRef?.to(room(tournamentId)).emit("bidPlaced", { teamName: team.name, amount });
  await broadcast(tournamentId);
  return { ok: true };
}

/* ----------------------------- Boot-time recovery ----------------------------- */

/** Re-arm timers for any auction that was live when the process stopped. */
async function resumeTimers() {
  const live = await sql`SELECT tournament_id, timer_ends_at FROM auction_sessions WHERE status = 'live'`;
  for (const s of live) {
    const msLeft = new Date(s.timer_ends_at).getTime() - Date.now();
    if (msLeft > 0) {
      armTimer(s.tournament_id, msLeft);
      console.log(`[auction] resumed timer for tournament ${s.tournament_id}`);
    } else {
      await finalizeSale(s.tournament_id);
    }
  }
}

/* ----------------------------- Socket.io wiring ----------------------------- */

export function initAuctionEngine(io: Server) {
  ioRef = io;

  // Handshake proves identity only; the per-tournament role is resolved on join.
  io.use((socket, next) => {
    const userId = userIdFromToken(socket.handshake.auth?.token);
    if (!userId) return next(new Error("Authentication required"));
    (socket as any).userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId as string;
    let joined: string | null = null;
    let account: Account | null = null;

    socket.on("join", async ({ tournamentId }: { tournamentId?: string }) => {
      if (!tournamentId) return;
      account = await resolveAccount(userId, tournamentId);
      if (!account) return socket.emit("denied", { reason: "You are not registered for this tournament" });
      socket.join(room(tournamentId));
      joined = tournamentId;
      const snap = await buildSnapshot(tournamentId);
      if (snap) socket.emit("state", snap);
    });

    const guard =
      (fn: (tid: string, payload: any) => Promise<ActionResult>) =>
      async (payload: any, ack?: (r: ActionResult) => void) => {
        if (!joined) return ack?.({ error: "Join a tournament first" });
        if (!account?.isAdmin) return ack?.({ error: "Auctioneer only" });
        try {
          ack?.(await fn(joined, payload || {}));
        } catch (err) {
          console.error("[auction] action failed:", err);
          ack?.({ error: "Server error - action did not complete" });
        }
      };

    socket.on("selectPlayer", guard((tid, p) => selectPlayer(tid, p)));
    socket.on("startAuction", guard((tid) => startAuction(tid)));
    socket.on("hammer", guard((tid) => hammer(tid)));
    socket.on("pause", guard((tid) => pause(tid)));
    socket.on("resume", guard((tid) => resume(tid)));
    socket.on("undoLastSale", guard((tid) => undoLastSale(tid)));
    socket.on("publishResults", guard((tid) => publishResults(tid)));
    socket.on("updateSettings", guard((tid, p) => updateSettings(tid, p)));
    socket.on("addTime", guard((tid, p) => addTime(tid, p)));
    socket.on("setPrice", guard((tid, p) => setPrice(tid, p)));
    socket.on("manualSell", guard((tid, p) => manualSell(tid, p)));
    socket.on("unsellPlayer", guard((tid, p) => unsellPlayer(tid, p)));
    socket.on("setFloor", guard((tid, p) => setFloor(tid, p)));
    socket.on("setTeamBudget", guard((tid, p) => setTeamBudget(tid, p)));
    socket.on("setRankTable", guard((tid, p) => setRankTable(tid, p)));
    socket.on("resetAuction", guard((tid) => resetAuction(tid)));
    socket.on("saveAuction", guard((tid) => saveAuction(tid)));
    socket.on("setTeamColor", guard((tid, p) => setTeamColor(tid, p)));

    socket.on("bid", async ({ amount }: { amount: number }, ack?: (r: ActionResult) => void) => {
      if (!joined) return ack?.({ error: "Join a tournament first" });
      if (!account?.team) return ack?.({ error: "Only captains can bid" });
      try {
        ack?.(await placeBid(joined, account.team, Number(amount)));
      } catch (err) {
        console.error("[auction] bid failed:", err);
        ack?.({ error: "Server error - bid did not register" });
      }
    });

    socket.on("resync", async (_p: unknown, ack?: (r: unknown) => void) => {
      const snap = joined ? await buildSnapshot(joined) : null;
      ack?.(snap || { error: "Not in a tournament" });
    });
  });

  resumeTimers().catch((e) => console.error("[auction] resumeTimers failed:", e));
}
