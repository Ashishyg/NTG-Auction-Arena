import type { Server } from "socket.io";
import sql from "../lib/db.ts";
import { userIdFromToken, resolveAccount, type Account } from "../lib/auth.ts";
import { cheapestAvailableFloor, safeMaxBid, validateBid } from "./rules.db.ts";

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

let ioRef: Server | null = null;

const room = (tournamentId: string) => `auction:${tournamentId}`;

type ActionResult = { ok: true } | { error: string };

/** Player display fields the game-aware PlayerCard needs, from the snapshot. */
async function playerView(registrationId: string | null) {
  if (!registrationId) return null;
  const [r] = await sql`
    SELECT id,
           "userId",
           "snapshotDisplayName"    AS name,
           "snapshotRiotId",
           "snapshotRankTier",
           "snapshotValorantRoles",
           "snapshotSteamId64",
           "snapshotCs2PeakPremier",
           "snapshotCs2FaceitRank",
           "snapshotOlympusId",
           "snapshotDateOfBirth"
    FROM "TournamentRegistration"
    WHERE id = ${registrationId}
  `;
  return r ?? null;
}

/**
 * Full public snapshot sent to all clients. Per-team budgets/rosters so
 * captains and observers see everything live.
 */
async function buildSnapshot(tournamentId: string) {
  const [session] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (!session) return null;

  const [teams, sold, [counts], allPlayers] = await Promise.all([
    sql`SELECT * FROM auction_teams WHERE session_id = ${session.id}`,
    sql`
      SELECT ap.team_id, ap.sold_price, r."snapshotDisplayName" AS name
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
             COALESCE(r."snapshotRankTier", r."snapshotCs2PeakPremier") AS rank
      FROM auction_players ap
      JOIN "TournamentRegistration" r ON r.id = ap.registration_id
      WHERE ap.session_id = ${session.id}
      ORDER BY r."snapshotDisplayName"
    `,
  ]);

  const rosterSize = session.roster_size;
  const cheapestFloor = await cheapestAvailableFloor(tournamentId);

  const teamView = teams.map((t) => {
    const roster = sold.filter((s) => s.team_id === t.id);
    const openSlots = rosterSize - roster.length;
    return {
      id: t.id,
      name: t.name,
      currentBudget: t.current_budget,
      rosterCount: roster.length,
      rosterSize,
      openSlots,
      roster: roster.map((s) => ({ name: s.name, price: s.sold_price })),
      safeMax: safeMaxBid({ currentBudget: t.current_budget, openSlots, cheapestFloor }),
    };
  });

  return {
    tournamentId,
    game: session.game,
    status: session.status,
    pass: session.pass,
    settings: {
      minBidIncrement: session.min_bid_increment,
      rosterSize,
      timerSeconds: session.timer_seconds,
    },
    currentPlayer: await playerView(session.current_registration_id),
    currentPrice: session.current_price,
    highestBidder: session.highest_bidder_id,
    highestBidderName: session.highest_bidder_name,
    timerEndsAt: session.timer_ends_at,
    bidHistory: session.bid_history,
    saleLog: sold
      .slice(-8)
      .reverse()
      .map((s) => ({ playerName: s.name, teamName: teams.find((t) => t.id === s.team_id)?.name, price: s.sold_price })),
    teams: teamView,
    counts,
    players: allPlayers.map((p) => ({
      registrationId: p.registration_id,
      name: p.name,
      rank: p.rank,
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

  const player = await playerView(state.current_registration_id);

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
    // UNSOLD. No bids — goes to the pass-2 re-auction pool.
    await sql`UPDATE auction_players SET status = 'unsold' WHERE session_id = ${state.id} AND registration_id = ${state.current_registration_id}`;
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
  const available = await sql`
    SELECT registration_id, floor_price
    FROM auction_players
    WHERE session_id = ${state.id} AND status = ${drawStatus}
  `;
  if (!available.length) {
    return { error: pass === 2 ? "No unsold players remain" : "The pool is empty" };
  }

  const pick = available[Math.floor(Math.random() * available.length)];
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
  await sql`
    UPDATE auction_sessions
    SET status = 'live', timer_ends_at = NOW() + (${ms} * interval '1 millisecond'), updated_at = NOW()
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
  await sql`
    UPDATE auction_sessions
    SET status = 'live', timer_ends_at = NOW() + (${ms} * interval '1 millisecond'),
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

  await sql.begin(async (tx) => {
    // Replace prior published teams (cascades to TournamentTeamPlayer).
    await tx`DELETE FROM "TournamentTeam" WHERE "tournamentId" = ${tournamentId}`;

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
               r."snapshotValorantRoles", r."snapshotRankTier", r."snapshotCs2PeakPremier",
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
        await tx`
          INSERT INTO "TournamentTeamPlayer"
            (id, "teamId", "userId", "registrationId", "displayName", "riotGameName", "riotTagLine",
             "valorantRoles", "peakPremierRank", "sortOrder")
          VALUES (
            ${crypto.randomUUID()}, ${teamId}, ${m.userId}, ${m.id},
            ${m.snapshotDisplayName ?? "Player"}, ${gameName || null}, ${tagLine || null},
            ${m.snapshotValorantRoles ? sql.json(m.snapshotValorantRoles) : null},
            ${session.game === "CS2" ? m.snapshotCs2PeakPremier : m.snapshotRankTier}, ${order++}
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
  { timerSeconds, minBidIncrement, rosterSize }: { timerSeconds?: number; minBidIncrement?: number; rosterSize?: number },
): Promise<ActionResult> {
  const clamp = (v: unknown, lo: number, hi: number) => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : null;
  };
  const ts = clamp(timerSeconds, 3, 600);
  const mi = clamp(minBidIncrement, 1, 1000);
  const rs = clamp(rosterSize, 1, 20);
  await sql`
    UPDATE auction_sessions SET
      timer_seconds = COALESCE(${ts}, timer_seconds),
      min_bid_increment = COALESCE(${mi}, min_bid_increment),
      roster_size = COALESCE(${rs}, roster_size),
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
  const view = await playerView(targetId);
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
  const openSlots = state.roster_size - soldCount;
  const cheapestFloor = await cheapestAvailableFloor(tournamentId);

  const check = validateBid({
    auctionStatus: state.status,
    amount,
    currentPrice: state.current_price,
    minIncrement: state.min_bid_increment,
    teamIsHighestBidder: state.highest_bidder_id === teamId,
    openSlots,
    currentBudget: team.current_budget,
    cheapestFloor,
  });
  if (!check.ok) return { error: check.reason };

  // Atomic apply: only succeeds if still live AND the price hasn't moved past
  // what this bid beats. If another bid landed first, 0 rows update → re-bid.
  const ms = state.timer_seconds * 1000;
  const bidEntry = { team: teamId, teamName: team.name, amount, at: new Date().toISOString() };
  const updated = await sql`
    UPDATE auction_sessions
    SET current_price = ${amount}, highest_bidder_id = ${teamId}, highest_bidder_name = ${team.name},
        timer_ends_at = NOW() + (${ms} * interval '1 millisecond'),
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
        if (account?.role !== "auctioneer") return ack?.({ error: "Auctioneer only" });
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
    socket.on("setFloor", guard((tid, p) => setFloor(tid, p)));

    socket.on("bid", async ({ amount }: { amount: number }, ack?: (r: ActionResult) => void) => {
      if (!joined) return ack?.({ error: "Join a tournament first" });
      if (account?.role !== "captain" || !account.team) return ack?.({ error: "Only captains can bid" });
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
