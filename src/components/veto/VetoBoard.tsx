"use client";

import { useEffect, useRef, useState } from "react";
import type { VetoAccount } from "@/lib/veto-auth";
import { mapBanner, mapSplash } from "@/veto/map-art";

type ActFn = (p: { map?: string; side?: "attack" | "defence" }) => Promise<{ ok: true } | { error: string }>;
type SetFormatFn = (f: "BO1" | "BO3" | "BO5") => Promise<{ ok: true } | { error: string }>;
type SetReadyFn = (ready: boolean) => Promise<{ ok: true } | { error: string }>;

const FORMATS = ["BO1", "BO3", "BO5"] as const;

/** Existing brand tokens — A takes the cyan side, B the magenta side. */
const TEAM_COLOR: Record<"A" | "B", string> = { A: "#22d3ee", B: "#d946ef" };

function roleVars(color: string, live: boolean) {
  return {
    "--role-border-color": `${color}${live ? "88" : "33"}`,
    "--role-border-color-hover": `${color}aa`,
    "--role-glow": `${color}22`,
    "--role-glow-hover": `${color}55`,
  } as React.CSSProperties;
}

/** One side of the board: name, state, and everything that side has done. */
function TeamSide({
  side,
  name,
  actions,
  isTurn,
  isYou,
  turnLabel,
}: {
  side: "A" | "B";
  name: string;
  actions: { kind: string; map: string; side?: string }[];
  isTurn: boolean;
  isYou: boolean;
  turnLabel: string | null;
}) {
  const color = TEAM_COLOR[side];
  const bans = actions.filter((a) => a.kind === "ban");
  const picks = actions.filter((a) => a.kind === "pick");

  return (
    <div
      style={roleVars(color, isTurn)}
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl p-3 transition-all duration-300 sm:p-5 lg:p-6 ${
        isTurn ? "neon-glow-card-live" : "neon-glow-card"
      }`}
    >
      <div className="text-center">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.28em]"
          style={{ color: `${color}b0` }}
        >
          {side === "A" ? "Team A" : "Team B"}
          {isYou ? " · You" : ""}
        </p>
        <h2 className="mt-1 font-display text-sm leading-tight font-bold text-white sm:mt-2 sm:text-xl lg:text-2xl">
          {name}
        </h2>

        <div className="mt-3 h-6">
          {isTurn ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                borderColor: `${color}55`,
                background: `${color}14`,
                color,
              }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: color }}
              />
              {turnLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto text-left sm:mt-4 sm:space-y-3">
        {picks.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Picked
            </p>
            <ul className="space-y-1">
              {picks.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-white sm:px-3 sm:py-2 sm:text-sm"
                  style={{ borderColor: `${color}44`, background: `${color}12` }}
                >
                  {a.map}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {bans.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Banned
            </p>
            <ul className="space-y-1">
              {bans.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[11px] text-white/35 line-through sm:px-3 sm:py-2 sm:text-sm"
                >
                  {a.map}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {picks.length === 0 && bans.length === 0 ? (
          <p className="text-center text-[11px] text-white/20">Nothing yet</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The full turn order as a progress track: a filled bar showing how far the
 * veto has come, plus a card per step. The active card is scrolled into view
 * automatically, which is what makes this usable on a phone.
 *
 * Every step is derived from the server's turnOrder, never recomputed here.
 */
function SequenceStrip({
  turnOrder,
  currentTurn,
  actions,
  format,
  teamName,
  complete,
}: {
  turnOrder: { team: "A" | "B"; kind: "ban" | "pick" | "side"; target?: number | "decider" }[];
  currentTurn: number;
  actions: { team: string; kind: string; map: string; side?: string }[];
  format: string;
  teamName: (s: "A" | "B") => string;
  complete: boolean;
}) {
  const listRef = useRef<HTMLOListElement | null>(null);

  // Centre the active step. Assigning scrollLeft rather than calling
  // scrollIntoView({behavior:"smooth"}) — smooth scrolling is a silent no-op in
  // some engines, and scrollIntoView also scrolls ancestor containers.
  useEffect(() => {
    const list = listRef.current;
    const el = list?.children[currentTurn] as HTMLElement | undefined;
    if (!list || !el) return;
    list.scrollLeft = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2;
  }, [currentTurn]);

  const total = turnOrder.length || 1;
  const doneCount = complete ? total : Math.min(currentTurn, total);
  const pct = Math.round((doneCount / total) * 100);

  return (
    <section className="mt-3 w-full shrink-0 rounded-2xl p-3 panel sm:mt-4 sm:p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 sm:text-[11px] sm:tracking-[0.24em]">
          <span className="hidden sm:inline">Official </span>
          {format} sequence
        </p>
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-brand sm:text-[11px]">
          {complete ? "Complete" : `Step ${Math.min(currentTurn + 1, total)} / ${total}`}
        </p>
      </div>

      {/* Progress track — one glance tells you how far in the veto is. */}
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${TEAM_COLOR.A}, ${TEAM_COLOR.B})`,
          }}
        />
      </div>

      <ol ref={listRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
        {turnOrder.map((t, i) => {
          const color = TEAM_COLOR[t.team];
          const done = i < currentTurn;
          const active = !complete && i === currentTurn;
          const action = done ? actions[i] : undefined;

          const label = t.kind === "side" ? "Side" : t.kind === "ban" ? "Ban" : "Pick";
          const outcome = done
            ? action
              ? t.kind === "side"
                ? action.side ?? "—"
                : action.map
              : "Done"
            : active
              ? "In progress"
              : i === currentTurn + 1
                ? "Next"
                : "—";

          return (
            <li
              key={i}
              style={{
                borderColor: active ? `${color}aa` : done ? `${color}30` : "rgba(255,255,255,0.06)",
                background: active ? `${color}14` : done ? "rgba(255,255,255,0.03)" : "transparent",
                boxShadow: active ? `0 0 20px -8px ${color}` : undefined,
              }}
              className={`relative w-[116px] shrink-0 snap-center overflow-hidden rounded-lg border pl-2.5 pr-2 py-2 transition-all duration-300 sm:w-auto sm:flex-1 sm:min-w-[120px] ${
                done || active ? "" : "opacity-50"
              }`}
            >
              {/* Team stripe — reads as "whose step" without needing the name. */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: done || active ? color : "rgba(255,255,255,0.12)" }}
              />
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[9px] font-bold tabular-nums"
                  style={{ color: done || active ? color : "rgba(255,255,255,0.35)" }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: done || active ? color : "rgba(255,255,255,0.35)" }}
                >
                  {label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-white/75">
                {teamName(t.team)}
              </p>
              <p
                className={`truncate text-[9px] uppercase tracking-[0.1em] ${
                  active ? "text-white/70" : done ? "text-white/45" : "text-white/25"
                }`}
              >
                {outcome}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function VetoBoard({
  state,
  account,
  act,
  setFormat,
  setReady,
}: {
  state: any;
  account: VetoAccount;
  act: ActFn;
  setFormat: SetFormatFn;
  setReady: SetReadyFn;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ready value the viewer just asked for, held until the server confirms. */
  const [pendingReady, setPendingReady] = useState<boolean | null>(null);

  const turn = state.turn as { team: "A" | "B"; kind: "ban" | "pick" | "side" } | null;
  const complete = state.status === "complete";
  const inLobby = state.phase === "lobby";
  const myServerReady = account.side === "B" ? state.readyB : state.readyA;
  const myReadyShown = pendingReady !== null ? pendingReady : myServerReady;
  const myTurn =
    !complete && !!turn && (turn.team === account.side || (!account.side && account.isAdmin));

  const teamName = (s: "A" | "B") => (s === "A" ? state.teamAName : state.teamBName);
  const actionsFor = (s: "A" | "B") => state.actions.filter((a: any) => a.team === s);
  const turnLabel = turn
    ? turn.kind === "side"
      ? "Choosing side"
      : turn.kind === "ban"
        ? "Banning"
        : "Picking"
    : null;

  async function send(payload: { map?: string; side?: "attack" | "defence" }) {
    setBusy(true);
    setError(null);
    const res = await act(payload);
    if ("error" in res) setError(res.error);
    setBusy(false);
  }

  /** Which map a `side` turn is deciding — a picked map, or the decider. */
  const sideTarget = (turn as { target?: number | "decider" } | null)?.target;
  const sideTargetMap: string | null =
    turn?.kind === "side"
      ? sideTarget === "decider"
        ? state.decider
        : (state.picked?.[sideTarget as number] ?? null)
      : null;

  /** Who acted on a map, for colouring the centre grid. */
  const actorFor = (map: string) =>
    state.actions.find((a: any) => a.map === map && a.kind !== "side") as
      | { team: "A" | "B"; kind: string }
      | undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col px-3 py-4 sm:px-6 sm:py-5 lg:h-screen lg:overflow-hidden lg:px-10">
      <header className="mb-3 shrink-0 text-center sm:mb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/40">
          {state.format} Map Veto
        </p>
        <h1 className="mt-1 font-display text-xl leading-tight font-bold sm:mt-2 sm:text-3xl lg:text-4xl">
          <span style={{ color: TEAM_COLOR.A }}>{state.teamAName}</span>
          <span className="mx-2 text-white/25 sm:mx-3">vs</span>
          <span style={{ color: TEAM_COLOR.B }}>{state.teamBName}</span>
        </h1>
        {!account.side && account.isAdmin ? (
          <p className="mt-1 text-[11px] text-gold">Admin — you can act for either team</p>
        ) : !account.side ? (
          <p className="mt-1 text-[11px] text-white/35">Spectating</p>
        ) : null}
      </header>

      {/* Lobby — both sides ready up before any ban is accepted. */}
      {inLobby ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
          <div className="w-full max-w-md rounded-2xl p-5 text-center panel">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">
              Series format
            </p>
            <div className="flex justify-center gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  disabled={busy || (!account.side && !account.isAdmin)}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    const res = await setFormat(f);
                    if ("error" in res) setError(res.error);
                    setBusy(false);
                  }}
                  className={`rounded-full px-6 py-2 text-sm font-bold transition disabled:opacity-40 ${
                    state.format === f
                      ? "cta"
                      : "border border-white/15 text-white/70 hover:border-white/40"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
            {(["A", "B"] as const).map((side) => {
              const color = TEAM_COLOR[side];
              const serverReady = side === "A" ? state.readyA : state.readyB;
              // Show the intent while the write is in flight — the round trip can
              // take seconds, and a button that looks unchanged invites a re-click.
              const isReady = pendingReady !== null && side === account.side ? pendingReady : serverReady;
              const isPending = pendingReady !== null && side === account.side && pendingReady !== serverReady;
              return (
                <div
                  key={side}
                  style={roleVars(color, isReady)}
                  className={`rounded-2xl p-6 text-center transition-all duration-300 ${
                    isReady ? "neon-glow-card-live" : "neon-glow-card"
                  }`}
                >
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.28em]"
                    style={{ color: `${color}b0` }}
                  >
                    Team {side}
                    {account.side === side ? " · You" : ""}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">
                    {teamName(side)}
                  </h2>
                  <p
                    className={`mt-3 text-sm font-bold uppercase tracking-[0.18em] ${isPending ? "animate-pulse" : ""}`}
                    style={{ color: isReady ? color : "rgba(255,255,255,0.3)" }}
                  >
                    {isReady ? "Ready" : "Not ready"}
                  </p>
                </div>
              );
            })}
          </div>

          {account.side || account.isAdmin ? (
            <button
              type="button"
              disabled={busy || pendingReady !== null}
              onClick={async () => {
                const mine =
                  account.side === "B" ? state.readyB : account.side === "A" ? state.readyA : false;
                const target = account.side ? !mine : true;
                setPendingReady(target);
                setError(null);
                const res = await setReady(target);
                if ("error" in res) setError(res.error);
                setPendingReady(null);
              }}
              className={`rounded-full px-10 py-3.5 text-sm font-bold uppercase tracking-[0.18em] transition disabled:opacity-60 ${
                account.side && myReadyShown
                  ? "border border-white/20 text-white/70 hover:border-white/40"
                  : "cta"
              }`}
            >
              {pendingReady !== null
                ? "Saving…"
                : account.side
                  ? myReadyShown
                    ? "Cancel ready"
                    : "I'm ready"
                  : "Ready next team"}
            </button>
          ) : (
            <p className="text-sm text-white/35">Waiting for both teams to ready up…</p>
          )}

          {error ? <p className="text-xs text-magenta">{error}</p> : null}
        </div>
      ) : null}

      {!inLobby ? (
      <div className="grid w-full min-h-0 flex-1 grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2.4fr)_minmax(280px,1fr)] lg:gap-5">
        {/* Left — Team A */}
        <TeamSide
          side="A"
          name={teamName("A")}
          actions={actionsFor("A")}
          isTurn={!complete && turn?.team === "A"}
          isYou={account.side === "A"}
          turnLabel={turnLabel}
        />

        {/* Centre — the maps */}
        <section className="order-first col-span-2 flex min-h-0 flex-col overflow-hidden rounded-2xl p-4 panel sm:p-5 lg:order-none lg:col-span-1">
          <div className="mb-4 text-center">
            {complete ? (
              <p className="font-display text-lg font-bold text-brand">Veto complete</p>
            ) : turn ? (
              <>
                <p className="text-sm">
                  <span
                    className="font-bold"
                    style={{ color: myTurn ? "#fff" : `${TEAM_COLOR[turn.team]}cc` }}
                  >
                    {myTurn ? "Your turn" : `${teamName(turn.team)}'s turn`}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/35">
                  {turn.kind === "side" ? "Choose a side" : `${turn.kind} a map`}
                </p>
              </>
            ) : null}
            {error ? <p className="mt-2 text-xs text-magenta">{error}</p> : null}
          </div>

          {/* Side selection — always shows which map the side is for. */}
          {!complete && turn?.kind === "side" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5">
              {sideTargetMap ? (
                <div
                  style={{ backgroundImage: mapSplash(sideTargetMap) ? `url(${mapSplash(sideTargetMap)})` : undefined }}
                  className="relative h-[120px] w-full overflow-hidden rounded-xl border border-white/15 bg-cover bg-center"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(7,11,20,0.2), rgba(7,11,20,0.6) 45%, rgba(7,11,20,0.6) 55%, rgba(7,11,20,0.2))",
                    }}
                  />
                  <span className="relative flex h-full flex-col items-center justify-center">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/50">
                      Side on
                    </span>
                    <span className="font-display text-2xl font-bold uppercase tracking-[0.1em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {sideTargetMap}
                    </span>
                  </span>
                </div>
              ) : null}

              <div className="flex gap-4">
                {(["attack", "defence"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!myTurn || busy}
                    onClick={() => void send({ side: s })}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-12 py-6 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:border-white/35 hover:bg-white/[0.08] disabled:opacity-30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Map banners — splash art, dimmed until it's your turn. */}
          {!complete && turn?.kind !== "side" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {state.pool.map((map: string) => {
                const available = state.remaining.includes(map);
                const actor = actorFor(map);
                const color = actor ? TEAM_COLOR[actor.team] : null;
                const picked = actor?.kind === "pick";
                const banned = actor?.kind === "ban";
                const splash = mapBanner(map);
                const selectable = available && myTurn && !busy;

                return (
                  <button
                    key={map}
                    type="button"
                    disabled={!selectable}
                    onClick={() => void send({ map })}
                    style={{
                      backgroundImage: splash ? `url(${splash})` : undefined,
                      borderColor: picked && color ? `${color}88` : undefined,
                    }}
                    className={`group relative min-h-[52px] shrink-0 overflow-hidden rounded-xl border bg-cover bg-center transition-all duration-300 lg:min-h-[54px] lg:flex-1 lg:shrink ${
                      picked
                        ? ""
                        : banned
                          ? "border-white/[0.06] grayscale"
                          : selectable
                            ? "border-white/10 hover:scale-[1.015] hover:border-white/40"
                            : "border-white/[0.08]"
                    }`}
                  >
                    {/* Scrim keeps the label readable over any splash. */}
                    <span
                      aria-hidden
                      className="absolute inset-0 transition-colors duration-300"
                      style={{
                        background: picked && color
                          ? `linear-gradient(90deg, ${color}88, rgba(7,11,20,0.45) 45%, rgba(7,11,20,0.45) 55%, ${color}88)`
                          : banned
                            ? "rgba(7,11,20,0.82)"
                            : "linear-gradient(90deg, rgba(7,11,20,0.25), rgba(7,11,20,0.62) 42%, rgba(7,11,20,0.62) 58%, rgba(7,11,20,0.25))",
                      }}
                    />
                    <span className="relative flex h-full items-center justify-center">
                      <span
                        className={`font-display text-base font-bold uppercase tracking-[0.12em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-xl lg:text-2xl ${
                          banned ? "text-white/30 line-through" : "text-white"
                        }`}
                      >
                        {map}
                      </span>
                    </span>

                    {actor ? (
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
                        style={{
                          background: banned ? "rgba(255,255,255,0.06)" : `${color}33`,
                          color: banned ? "rgba(255,255,255,0.35)" : color!,
                        }}
                      >
                        {banned ? "Banned" : "Picked"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Final result */}
          {complete && state.result ? (
            <ol className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
              {state.result.maps.map((m: any, i: number) => {
                const color = m.pickedBy ? TEAM_COLOR[m.pickedBy as "A" | "B"] : null;
                const splash = mapBanner(m.map);
                return (
                  <li
                    key={m.map}
                    style={{
                      backgroundImage: splash ? `url(${splash})` : undefined,
                      borderColor: color ? `${color}66` : "rgba(255,255,255,0.12)",
                    }}
                    className="relative min-h-[70px] flex-1 overflow-hidden rounded-xl border bg-cover bg-center"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: color
                          ? `linear-gradient(90deg, ${color}77, rgba(7,11,20,0.5) 60%)`
                          : "linear-gradient(90deg, rgba(7,11,20,0.3), rgba(7,11,20,0.6))",
                      }}
                    />
                    <span className="relative flex h-full items-center justify-between px-5">
                      <span className="flex items-center gap-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                          Map {i + 1}
                        </span>
                        <span className="font-display text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                          {m.map}
                        </span>
                      </span>
                      <span className="text-right text-[11px] text-white/70">
                        {m.pickedBy ? teamName(m.pickedBy) : "Decider"}
                        {m.side ? <span className="text-white/45"> · {m.side}</span> : null}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}

        </section>

        {/* Right — Team B */}
        <TeamSide
          side="B"
          name={teamName("B")}
          actions={actionsFor("B")}
          isTurn={!complete && turn?.team === "B"}
          isYou={account.side === "B"}
          turnLabel={turnLabel}
        />
      </div>

      ) : null}

      {/* Sequence progression */}
      {!inLobby ? (
      <SequenceStrip
        turnOrder={state.turnOrder ?? []}
        currentTurn={state.currentTurn ?? 0}
        actions={state.actions ?? []}
        format={state.format}
        teamName={teamName}
        complete={complete}
      />
      ) : null}

    </main>
  );
}

export default VetoBoard;
