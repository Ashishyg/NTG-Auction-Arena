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
  minPoolSize,
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

export async function buildVetoSnapshot(matchId: string) {
  const [row] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  if (!row) return null;

  const [match] = await sql`
    SELECT a.name AS team_a_name, b.name AS team_b_name
    FROM "TournamentMatch" m
    JOIN "TournamentTeam" a ON a.id = m."teamAId"
    JOIN "TournamentTeam" b ON b.id = m."teamBId"
    WHERE m.id = ${matchId}
  `;

  const state = toState(row);
  const bothReady = row.ready_a && row.ready_b;
  return {
    matchId,
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
    teamAName: match?.team_a_name ?? "Team A",
    teamBName: match?.team_b_name ?? "Team B",
    result: vetoResult(state),
    serverNow: new Date().toISOString(),
  };
}

/**
 * Persist an advanced state, but only if nobody else moved first. Returns
 * false when the version check loses the race — the caller resyncs instead.
 */
async function commit(row: SessionRow, next: VetoState): Promise<boolean> {
  const done = isComplete(next);
  const result = await sql`
    UPDATE veto_sessions
    SET current_turn = ${next.currentTurn},
        actions = ${sql.json(next.actions)},
        status = ${done ? "complete" : "live"},
        version = version + 1,
        updated_at = NOW()
    WHERE id = ${row.id} AND version = ${row.version}
  `;
  if (result.count === 0) return false;

  if (done) await writeBackResult(row.match_id, next);
  return true;
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

/**
 * Switch BO1/BO3/BO5 before anyone has acted. Locked once the first ban lands,
 * so a team can't change the series length mid-veto to suit its position.
 */
async function setFormat(matchId: string, format: VetoFormat): Promise<ActionResult> {
  const [row] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  if (!row) return { error: "No veto for this match." };

  const state = toState(row);
  if (state.actions.length > 0) return { error: "The veto has already started." };
  if (row.ready_a && row.ready_b) return { error: "Both teams are ready — format is locked." };
  if (state.pool.length < minPoolSize(format)) {
    return { error: `${format} needs at least ${minPoolSize(format)} maps in the pool.` };
  }

  const turnOrder = buildTurnOrder(format, state.pool.length);
  const result = await sql`
    UPDATE veto_sessions
    SET format = ${format},
        turn_order = ${sql.json(turnOrder)},
        current_turn = 0,
        version = version + 1,
        updated_at = NOW()
    WHERE id = ${row.id} AND version = ${row.version}
  `;
  if (result.count === 0) return { error: "Someone else changed it first — resyncing." };

  await sql`UPDATE "TournamentMatch" SET format = ${format}::"VetoFormat", "updatedAt" = NOW() WHERE id = ${matchId}`;
  return { ok: true };
}

/** Toggle a side's ready flag. Locked once the veto is under way. */
async function setReady(
  matchId: string,
  side: VetoSide,
  ready: boolean,
): Promise<ActionResult> {
  const [row] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  if (!row) return { error: "No veto for this match." };
  if (row.status !== "live") return { error: "This veto is already finished." };
  if (toState(row).actions.length > 0) return { error: "The veto has already started." };

  // Deliberately NOT version-guarded. Each side writes only its own column to an
  // absolute value, so there is no read-modify-write to lose. Guarding it meant
  // two captains readying up in the same round trip clobbered each other, and
  // the loser's click silently did nothing.
  const column = side === "A" ? sql`ready_a` : sql`ready_b`;
  await sql`
    UPDATE veto_sessions
    SET ${column} = ${ready}, version = version + 1, updated_at = NOW()
    WHERE id = ${row.id}
  `;
  return { ok: true };
}

async function act(
  matchId: string,
  side: VetoSide,
  input: { map?: string; side?: "attack" | "defence" },
): Promise<ActionResult> {
  const [row] = await sql<SessionRow[]>`
    SELECT * FROM veto_sessions WHERE match_id = ${matchId}
  `;
  if (!row) return { error: "No veto for this match." };
  if (row.status !== "live") return { error: "This veto is already finished." };
  if (!row.ready_a || !row.ready_b) return { error: "Both teams must ready up first." };

  const applied = applyAction(toState(row), { team: side, map: input.map, side: input.side });
  if (!applied.ok) return { error: applied.error };

  const saved = await commit(row, applied.state);
  if (!saved) return { error: "Someone on your team acted first — resyncing." };
  return { ok: true };
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
          ack?.(res);
          const snap = await buildVetoSnapshot(joined);
          if (snap) nsp.to(room(joined)).emit("veto:state", snap);
        } catch (err) {
          console.error("[veto] action failed:", err);
          ack?.({ error: "Server error - action did not complete" });
        }
      },
    );

    socket.on(
      "veto:setFormat",
      async ({ format }: { format?: string }, ack?: (r: ActionResult) => void) => {
        if (!joined || !account) return ack?.({ error: "Join a match first" });
        if (!account.side && !account.isAdmin) {
          return ack?.({ error: "Only players in this match can change the format" });
        }
        try {
          const res = await setFormat(joined, normalizeFormat(format));
          ack?.(res);
          const snap = await buildVetoSnapshot(joined);
          if (snap) nsp.to(room(joined)).emit("veto:state", snap);
        } catch (err) {
          console.error("[veto] setFormat failed:", err);
          ack?.({ error: "Server error - format not changed" });
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
          ack?.(res);
          const snap = await buildVetoSnapshot(joined);
          if (snap) nsp.to(room(joined)).emit("veto:state", snap);
        } catch (err) {
          console.error("[veto] ready failed:", err);
          ack?.({ error: "Server error - ready not saved" });
        }
      },
    );

    socket.on("veto:resync", async (_p: unknown, ack?: (r: unknown) => void) => {
      const snap = joined ? await buildVetoSnapshot(joined) : null;
      ack?.(snap ?? { error: "Not in a veto" });
    });
  });

}
