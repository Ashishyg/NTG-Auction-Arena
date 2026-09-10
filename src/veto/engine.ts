import type { Server } from "socket.io";
import sql from "../lib/db.ts";
import { userIdFromToken } from "../lib/auth.ts";
import { resolveVetoAccount, type VetoAccount, type VetoSide } from "../lib/veto-auth.ts";
import {
  DEFAULT_VALORANT_POOL,
  applyAction,
  buildTurnOrder,
  currentTurn,
  deciderMap,
  isComplete,
  pickedMaps,
  remainingMaps,
  vetoResult,
  type VetoFormat,
  type VetoState,
} from "./rules.ts";

/**
 * Live map veto. Same rules as the auction engine: the SERVER is the single
 * source of truth, clients only render and forward intent.
 *
 * Turn advancement is an atomic conditional UPDATE on `version` — any team
 * member may act, so two teammates clicking at once must not both land.
 */

const room = (matchId: string) => `veto:${matchId}`;

type SessionRow = {
  id: string;
  match_id: string;
  format: VetoFormat;
  map_pool: string[];
  turn_order: VetoState["turnOrder"];
  current_turn: number;
  actions: VetoState["actions"];
  status: "live" | "complete";
  ready_a: boolean;
  ready_b: boolean;
  version: number;
};

/**
 * jsonb columns come back parsed on some driver/column paths and as raw text on
 * others — normalise both so the pure rules never see a string.
 */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeFormat(value: unknown): VetoFormat {
  return value === "BO5" ? "BO5" : value === "BO3" ? "BO3" : "BO1";
}

/** Cup-configured pool, falling back to the built-in default. */
function resolveMapPool(configured: unknown): string[] {
  const raw = parseJson<unknown>(configured, null);
  const pool = Array.isArray(raw)
    ? raw.filter((m): m is string => typeof m === "string" && m.trim() !== "")
    : [];
  return pool.length >= 2 ? pool : [...DEFAULT_VALORANT_POOL];
}

function toState(row: SessionRow): VetoState {
  return {
    format: row.format,
    pool: parseJson(row.map_pool, [] as string[]),
    turnOrder: parseJson(row.turn_order, [] as VetoState["turnOrder"]),
    currentTurn: row.current_turn,
    actions: parseJson(row.actions, [] as VetoState["actions"]),
  };
}

/** Creates the session on first join; every later join reuses it. */
async function getOrCreateSession(matchId: string): Promise<SessionRow | null> {
  const [existing] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  if (existing) return existing;

  const [match] = await sql`
    SELECT m.id, m.format, t."vetoMapPool"
    FROM "TournamentMatch" m
    JOIN "Tournament" t ON t.id = m."tournamentId"
    WHERE m.id = ${matchId}
  `;
  if (!match) return null;

  const format = normalizeFormat(match.format);
  const pool = resolveMapPool(match.vetoMapPool);
  const turnOrder = buildTurnOrder(format, pool.length);

  const [created] = await sql<SessionRow[]>`
    INSERT INTO veto_sessions
      (match_id, format, map_pool, turn_order, current_turn, actions, status)
    VALUES (
      ${matchId}, ${format}, ${sql.json(pool)}, ${sql.json(turnOrder)},
      0, '[]', 'live'
    )
    ON CONFLICT (match_id) DO NOTHING
    RETURNING *
  `;
  if (created) return created;

  const [raced] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  return raced ?? null;
}

/** Team names can't change mid-veto, so each match's are fetched once per process. */
// ponytail: never evicted — a cup has a few dozen matches at most.
const teamNames = new Map<string, { a: string; b: string }>();

async function namesFor(matchId: string): Promise<{ a: string; b: string }> {
  const cached = teamNames.get(matchId);
  if (cached) return cached;
  const [match] = await sql`
    SELECT a.name AS team_a_name, b.name AS team_b_name
    FROM "TournamentMatch" m
    JOIN "TournamentTeam" a ON a.id = m."teamAId"
    JOIN "TournamentTeam" b ON b.id = m."teamBId"
    WHERE m.id = ${matchId}
  `;
  if (!match) return { a: "Team A", b: "Team B" };
  const names = { a: match.team_a_name as string, b: match.team_b_name as string };
  teamNames.set(matchId, names);
  return names;
}

export async function buildVetoSnapshot(matchId: string) {
  const [row] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  return row ? snapshot(row, await namesFor(matchId)) : null;
}

/** Client view of a session row. Writes that RETURN the row use it directly, skipping a re-read. */
function snapshot(row: SessionRow, names: { a: string; b: string }) {
  const state = toState(row);
  const bothReady = row.ready_a && row.ready_b;
  return {
    matchId: row.match_id,
    format: row.format,
    status: row.status,
    // lobby → both captains ready up; live → banning; complete → done.
    phase: row.status === "complete" ? "complete" : bothReady ? "live" : "lobby",
    readyA: row.ready_a,
    readyB: row.ready_b,
    pool: state.pool,
    remaining: remainingMaps(state),
    picked: pickedMaps(state),
    decider: deciderMap(state),
    actions: state.actions,
    turnOrder: state.turnOrder,
    currentTurn: state.currentTurn,
    turn: currentTurn(state),
    version: row.version,
    teamAName: names.a,
    teamBName: names.b,
    result: vetoResult(state),
    serverNow: new Date().toISOString(),
  };
}

/**
 * Persist an advanced state, but only if nobody else moved first. Returns the
 * saved row, or null when the version check loses the race — the caller resyncs.
 */
async function commit(row: SessionRow, next: VetoState): Promise<SessionRow | null> {
  const done = isComplete(next);
  const [saved] = await sql<SessionRow[]>`
    UPDATE veto_sessions
    SET current_turn = ${next.currentTurn},
        actions = ${sql.json(next.actions)},
        status = ${done ? "complete" : "live"},
        version = version + 1,
        updated_at = NOW()
    WHERE id = ${row.id} AND version = ${row.version}
    RETURNING *
  `;
  if (!saved) return null;

  if (done) await writeBackResult(row.match_id, next);
  return saved;
}

/**
 * The only place the veto writes outside veto_* — mirrors how the auction
 * publishes rosters. The main site reads TournamentMatch and renders it.
 */
async function writeBackResult(matchId: string, state: VetoState) {
  const result = vetoResult(state);
  if (!result) return;
  await sql`
    UPDATE "TournamentMatch"
    SET "vetoResult" = ${sql.json(result)},
        status = 'VETO_COMPLETE',
        "updatedAt" = NOW()
    WHERE id = ${matchId}
  `;
}

type ActionResult = { ok: true } | { error: string };
/** Internal write result — carries the saved row so the broadcast needs no re-read. */
type WriteResult = { ok: true; row: SessionRow } | { error: string };

/** Toggle a side's ready flag. Locked once the veto is under way. */
async function setReady(
  matchId: string,
  side: VetoSide,
  ready: boolean,
  retried = false,
): Promise<WriteResult> {
  // One round trip on the happy path — the locks live in the WHERE clause.
  // Deliberately NOT version-guarded. Each side writes only its own column to an
  // absolute value, so there is no read-modify-write to lose. Guarding it meant
  // two captains readying up in the same round trip clobbered each other, and
  // the loser's click silently did nothing.
  const column = side === "A" ? sql`ready_a` : sql`ready_b`;
  const [row] = await sql<SessionRow[]>`
    UPDATE veto_sessions
    SET ${column} = ${ready}, version = version + 1, updated_at = NOW()
    WHERE match_id = ${matchId} AND status = 'live' AND actions = '[]'::jsonb
    RETURNING *
  `;
  if (row) return { ok: true, row };

  // Nothing updated — find out why. This also rebuilds a session that an admin
  // format change restarted, after which the ready is applied once more.
  const existing = await getOrCreateSession(matchId);
  if (!existing) return { error: "No veto for this match." };
  if (existing.status !== "live") return { error: "This veto is already finished." };
  if (toState(existing).actions.length > 0) return { error: "The veto has already started." };
  return retried ? { error: "Ready not saved — try again." } : setReady(matchId, side, ready, true);
}

async function act(
  matchId: string,
  side: VetoSide,
  input: { map?: string; side?: "attack" | "defence" },
): Promise<WriteResult> {
  const row = await getOrCreateSession(matchId);
  if (!row) return { error: "No veto for this match." };
  if (row.status !== "live") return { error: "This veto is already finished." };
  if (!row.ready_a || !row.ready_b) return { error: "Both teams must ready up first." };

  const applied = applyAction(toState(row), { team: side, map: input.map, side: input.side });
  if (!applied.ok) return { error: applied.error };

  const saved = await commit(row, applied.state);
  if (!saved) return { error: "Someone on your team acted first — resyncing." };
  return { ok: true, row: saved };
}

export function initVetoEngine(io: Server) {
  const nsp = io.of("/veto");

  nsp.use((socket, next) => {
    const userId = userIdFromToken(socket.handshake.auth?.token);
    if (!userId) return next(new Error("Invalid token"));
    (socket.data as { userId: string }).userId = userId;
    next();
  });

  nsp.on("connection", (socket) => {
    const userId = (socket.data as { userId: string }).userId;
    let joined: string | null = null;
    let account: VetoAccount | null = null;

    /**
     * New state goes out BEFORE the ack. The client drops its "Saving…" state on
     * the ack, so acking first flashed the old state for a round trip and
     * invited a second click — which could then un-ready the player.
     */
    const publish = async (matchId: string, res: WriteResult) => {
      if ("row" in res) {
        nsp.to(room(matchId)).emit("veto:state", snapshot(res.row, await namesFor(matchId)));
        return;
      }
      // Rejected — resync just this client in case it acted on stale state.
      const snap = await buildVetoSnapshot(matchId);
      if (snap) socket.emit("veto:state", snap);
    };

    socket.on("join", async ({ matchId }: { matchId?: string }) => {
      if (!matchId) return;
      account = await resolveVetoAccount(userId, matchId);
      if (!account) return socket.emit("denied", { reason: "You cannot view this veto" });

      const session = await getOrCreateSession(matchId);
      if (!session) return socket.emit("denied", { reason: "Match not found" });

      joined = matchId;
      socket.join(room(matchId));
      socket.emit("veto:account", account);
      const snap = await buildVetoSnapshot(matchId);
      if (snap) socket.emit("veto:state", snap);
    });

    socket.on(
      "veto:act",
      async (
        payload: { map?: string; side?: "attack" | "defence" },
        ack?: (r: ActionResult) => void,
      ) => {
        if (!joined || !account) return ack?.({ error: "Join a match first" });
        // Admins can force a turn for whichever side is on the clock.
        let side = account.side;
        if (!side) {
          if (!account.isAdmin) return ack?.({ error: "Only players in this match can act" });
          const snap = await buildVetoSnapshot(joined);
          side = snap?.turn?.team ?? null;
          if (!side) return ack?.({ error: "Nothing to act on" });
        }

        try {
          const res = await act(joined, side, payload || {});
          await publish(joined, res);
          ack?.("error" in res ? res : { ok: true });
        } catch (err) {
          console.error("[veto] action failed:", err);
          ack?.({ error: "Server error - action did not complete" });
        }
      },
    );

    socket.on(
      "veto:ready",
      async ({ ready }: { ready?: boolean }, ack?: (r: ActionResult) => void) => {
        if (!joined || !account) return ack?.({ error: "Join a match first" });
        // Admins ready whichever side still needs it, so a stuck lobby can move.
        let side = account.side;
        if (!side) {
          if (!account.isAdmin) return ack?.({ error: "Only players in this match can ready up" });
          const snap = await buildVetoSnapshot(joined);
          side = !snap?.readyA ? "A" : !snap?.readyB ? "B" : "A";
        }
        try {
          const res = await setReady(joined, side, ready !== false);
          await publish(joined, res);
          ack?.("error" in res ? res : { ok: true });
        } catch (err) {
          console.error("[veto] ready failed:", err);
          ack?.({ error: "Server error - ready not saved" });
        }
      },
    );

    socket.on("veto:resync", async (_p: unknown, ack?: (r: unknown) => void) => {
      // Rebuild first — an admin format change may have restarted this veto.
      if (joined) await getOrCreateSession(joined);
      const snap = joined ? await buildVetoSnapshot(joined) : null;
      ack?.(snap ?? { error: "Not in a veto" });
    });
  });

}
