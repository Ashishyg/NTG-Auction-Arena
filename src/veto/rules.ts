/**
 * Pure map-veto rules. No DB, no sockets — the engine calls into this and
 * persists whatever comes back, so the sequencing can be tested on its own.
 *
 * Team A is the bracket's TOP slot and always acts first.
 */

export type VetoFormat = "BO1" | "BO3" | "BO5";
export type Side = "A" | "B";
export type Side_ = "attack" | "defence";

export type TurnKind = "ban" | "pick" | "side";

export type Turn = {
  team: Side;
  kind: TurnKind;
  /** For a `side` turn: which picked map the side is being chosen on.
   *  0-based index into the picked maps, or "decider". */
  target?: number | "decider";
};

export type VetoAction = {
  team: Side;
  kind: TurnKind;
  map: string;
  side?: Side_;
  at: string;
};

/**
 * Valorant competitive pool. Riot rotates this every act, so it is a seed
 * value only — a session snapshots its pool at start so an in-flight veto
 * can't shift underneath the players. Confirm before a real cup.
 */
export const DEFAULT_VALORANT_POOL = [
  "Ascent",
  "Abyss",
  "Haven",
  "Summit",
  "Lotus",
  "Split",
  "Sunset",
];

/** How many maps a format picks before the decider. */
export function picksForFormat(format: VetoFormat): number {
  return format === "BO1" ? 0 : format === "BO3" ? 2 : 4;
}

/** Smallest pool a format can run on — every pick plus a decider. */
export function minPoolSize(format: VetoFormat): number {
  return picksForFormat(format) + 1;
}

/**
 * Turn sequence for a pool of any size, always ending on one decider.
 *
 * BO1 — alternating bans until a single map is left.
 * BO3 — two bans, both picks, then the remaining bans (the classic 7-map
 *       ban/ban/pick/pick/ban/ban/decider).
 * BO5 — all bans first, then the four picks.
 *
 * A pick is always followed by the OTHER team choosing its side, and the
 * decider's side goes to team A.
 */
export function buildTurnOrder(format: VetoFormat, poolSize = 7): Turn[] {
  const picks = picksForFormat(format);
  const bans = Math.max(0, poolSize - picks - 1);
  const turns: Turn[] = [];

  let actor: Side = "A";
  const take = (): Side => {
    const t = actor;
    actor = actor === "A" ? "B" : "A";
    return t;
  };

  // BO3 splits its bans around the picks; BO1 has no picks and BO5 bans first.
  const bansBeforePicks = format === "BO3" ? Math.min(2, bans) : bans;

  for (let i = 0; i < bansBeforePicks; i++) turns.push({ team: take(), kind: "ban" });

  for (let i = 0; i < picks; i++) {
    const picker = take();
    turns.push({ team: picker, kind: "pick" });
    turns.push({ team: picker === "A" ? "B" : "A", kind: "side", target: i });
  }

  for (let i = bansBeforePicks; i < bans; i++) turns.push({ team: take(), kind: "ban" });

  turns.push({ team: "A", kind: "side", target: "decider" });
  return turns;
}

export type VetoState = {
  format: VetoFormat;
  pool: string[];
  turnOrder: Turn[];
  currentTurn: number;
  actions: VetoAction[];
};

/** Maps still selectable — neither banned nor already picked. */
export function remainingMaps(state: VetoState): string[] {
  const used = new Set(
    state.actions.filter((a) => a.kind === "ban" || a.kind === "pick").map((a) => a.map),
  );
  return state.pool.filter((m) => !used.has(m));
}

export function pickedMaps(state: VetoState): string[] {
  return state.actions.filter((a) => a.kind === "pick").map((a) => a.map);
}

/** The single map left once every ban and pick is done, or null if not there yet. */
export function deciderMap(state: VetoState): string | null {
  const rest = remainingMaps(state);
  return rest.length === 1 ? rest[0] : null;
}

export function currentTurn(state: VetoState): Turn | null {
  return state.turnOrder[state.currentTurn] ?? null;
}

export function isComplete(state: VetoState): boolean {
  return state.currentTurn >= state.turnOrder.length;
}

export type ApplyResult =
  | { ok: true; state: VetoState }
  | { ok: false; error: string };

/**
 * Apply one action. Rejects anything out of turn, on the wrong map, or with a
 * missing side — the caller must treat a rejection as "nothing happened".
 */
export function applyAction(
  state: VetoState,
  input: { team: Side; map?: string; side?: Side_ },
  now: Date = new Date(),
): ApplyResult {
  const turn = currentTurn(state);
  if (!turn) return { ok: false, error: "Veto is already complete." };
  if (turn.team !== input.team) return { ok: false, error: "Not your turn." };

  if (turn.kind === "side") {
    if (input.side !== "attack" && input.side !== "defence") {
      return { ok: false, error: "Pick attack or defence." };
    }
    const target =
      turn.target === "decider" ? deciderMap(state) : pickedMaps(state)[turn.target ?? 0];
    if (!target) return { ok: false, error: "No map to choose a side on yet." };
    return {
      ok: true,
      state: {
        ...state,
        currentTurn: state.currentTurn + 1,
        actions: [
          ...state.actions,
          { team: input.team, kind: "side", map: target, side: input.side, at: now.toISOString() },
        ],
      },
    };
  }

  const map = input.map;
  if (!map) return { ok: false, error: "Pick a map." };
  if (!remainingMaps(state).includes(map)) {
    return { ok: false, error: "That map is no longer available." };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentTurn: state.currentTurn + 1,
      actions: [
        ...state.actions,
        { team: input.team, kind: turn.kind, map, at: now.toISOString() },
      ],
    },
  };
}

/** Final outcome, in play order: picked maps then the decider. */
export function vetoResult(state: VetoState): {
  maps: { map: string; side: Side_ | null; pickedBy: Side | null }[];
} | null {
  if (!isComplete(state)) return null;

  const sideFor = (map: string) =>
    state.actions.find((a) => a.kind === "side" && a.map === map)?.side ?? null;

  const picks: { map: string; side: Side_ | null; pickedBy: Side | null }[] = state.actions
    .filter((a) => a.kind === "pick")
    .map((a) => ({ map: a.map, side: sideFor(a.map), pickedBy: a.team }));

  const decider = deciderMap(state);
  if (decider) picks.push({ map: decider, side: sideFor(decider), pickedBy: null });

  return { maps: picks };
}
