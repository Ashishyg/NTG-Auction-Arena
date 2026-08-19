"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Timer } from "./Timer";
import { getAgentIconUrl } from "@/lib/valorantAgents";

export function getRankIconUrl(rank: string | null | undefined): string {
  const uuid = "03621f52-342b-cf4e-4f86-9350a49c6d04";
  if (!rank) return `https://media.valorant-api.com/competitivetiers/${uuid}/0/largeicon.png`;
  const r = rank.trim().toLowerCase();

  if (r.startsWith("iron 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/3/largeicon.png`;
  if (r.startsWith("iron 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/4/largeicon.png`;
  if (r.startsWith("iron 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/5/largeicon.png`;
  if (r.startsWith("iron")) return `https://media.valorant-api.com/competitivetiers/${uuid}/3/largeicon.png`;
  if (r.startsWith("bronze 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/6/largeicon.png`;
  if (r.startsWith("bronze 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/7/largeicon.png`;
  if (r.startsWith("bronze 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/8/largeicon.png`;
  if (r.startsWith("bronze")) return `https://media.valorant-api.com/competitivetiers/${uuid}/6/largeicon.png`;
  if (r.startsWith("silver 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/9/largeicon.png`;
  if (r.startsWith("silver 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/10/largeicon.png`;
  if (r.startsWith("silver 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/11/largeicon.png`;
  if (r.startsWith("silver")) return `https://media.valorant-api.com/competitivetiers/${uuid}/9/largeicon.png`;
  if (r.startsWith("gold 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/12/largeicon.png`;
  if (r.startsWith("gold 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/13/largeicon.png`;
  if (r.startsWith("gold 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/14/largeicon.png`;
  if (r.startsWith("gold")) return `https://media.valorant-api.com/competitivetiers/${uuid}/12/largeicon.png`;
  if (r.startsWith("platinum 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/15/largeicon.png`;
  if (r.startsWith("platinum 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/16/largeicon.png`;
  if (r.startsWith("platinum 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/17/largeicon.png`;
  if (r.startsWith("platinum")) return `https://media.valorant-api.com/competitivetiers/${uuid}/15/largeicon.png`;
  if (r.startsWith("diamond 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/18/largeicon.png`;
  if (r.startsWith("diamond 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/19/largeicon.png`;
  if (r.startsWith("diamond 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/20/largeicon.png`;
  if (r.startsWith("diamond")) return `https://media.valorant-api.com/competitivetiers/${uuid}/18/largeicon.png`;
  if (r.startsWith("ascendant 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/21/largeicon.png`;
  if (r.startsWith("ascendant 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/22/largeicon.png`;
  if (r.startsWith("ascendant 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/23/largeicon.png`;
  if (r.startsWith("ascendant")) return `https://media.valorant-api.com/competitivetiers/${uuid}/21/largeicon.png`;
  if (r.startsWith("immortal 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/24/largeicon.png`;
  if (r.startsWith("immortal 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/25/largeicon.png`;
  if (r.startsWith("immortal 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/26/largeicon.png`;
  if (r.startsWith("immortal")) return `https://media.valorant-api.com/competitivetiers/${uuid}/24/largeicon.png`;
  if (r.startsWith("radiant")) return `https://media.valorant-api.com/competitivetiers/${uuid}/27/largeicon.png`;
  return `https://media.valorant-api.com/competitivetiers/${uuid}/0/largeicon.png`;
}

const DEFAULT_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";
const DOT = "·";

type PlayerBadge = { label: string; kind?: string; iconKey?: string | null } | string;

function badgeLabel(b: PlayerBadge): string {
  return typeof b === "string" ? b : b.label;
}

function trophyCounts(labels: PlayerBadge[]): { gold: number; silver: number } {
  let gold = 0;
  let silver = 0;
  for (const b of labels) {
    const label = badgeLabel(b);
    if (/RUNNER-UP$/i.test(label)) silver++;
    else if (/WINNER$/i.test(label)) gold++;
  }
  return { gold, silver };
}

function customBadges(badges: PlayerBadge[]): string[] {
  return badges
    .filter((b) => {
      const label = badgeLabel(b);
      if (/WINNER$/i.test(label) || /RUNNER-UP$/i.test(label)) return false;
      if (typeof b !== "string" && b.kind === "PLACEMENT") return false;
      return true;
    })
    .map(badgeLabel);
}

function formatRoles(raw: unknown): string | null {
  const list: string[] = Array.isArray(raw)
    ? raw.map(String)
    : String(raw || "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
  if (!list.length) return null;
  return list
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase())
    .join(` ${DOT} `);
}

function RankTile({ label, rank }: { label: string; rank?: string | null }) {
  return (
    <div className="relative flex min-w-0 items-center gap-1.5 overflow-hidden sm:gap-3">
      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center sm:h-11 sm:w-11">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getRankIconUrl(rank)} alt="" className="h-7 w-7 object-contain drop-shadow-md sm:h-11 sm:w-11" />
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <p className="text-[7px] font-bold tracking-[0.16em] text-white/35 uppercase sm:text-[8px]">{label}</p>
        <p
          className="truncate font-display text-[11px] font-bold leading-tight tracking-tight text-white/90 sm:text-base"
          title={rank || "Unranked"}
        >
          {rank || "Unranked"}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, children, accent }: { label: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-[7px] font-bold tracking-[0.12em] text-white/35 uppercase sm:text-[8px]">{label}</p>
      <div className={`mt-0.5 font-display text-[11px] font-bold tabular-nums leading-none sm:text-lg ${accent ? "text-[#5eead4]" : "text-white"}`}>
        {children}
      </div>
    </div>
  );
}

function PortraitCard({
  cardUrl,
  name,
  rankText,
}: {
  cardUrl: string;
  name: string;
  rankText: string;
}) {
  return (
    <div className="group relative aspect-[268/640] w-[6.75rem] shrink-0 overflow-hidden rounded-xl shadow-[0_20px_40px_-18px_rgba(0,0,0,0.95)] ring-1 ring-white/15 sm:w-[13.5rem] sm:rounded-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardUrl}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-1.5 pb-2 text-center sm:px-3.5 sm:pb-4">
        <p className="w-full truncate px-0.5 font-display text-[10px] font-bold leading-tight tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-[15px]">
          {name}
        </p>
        <div className="mt-1 flex h-8 w-8 items-center justify-center sm:mt-2.5 sm:h-12 sm:w-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getRankIconUrl(rankText)} alt="" className="h-8 w-8 object-contain drop-shadow-lg sm:h-12 sm:w-12" />
        </div>
        <p className="mt-0.5 max-w-full truncate font-display text-[8px] font-black tracking-[0.1em] text-white/90 uppercase drop-shadow-md sm:mt-1 sm:text-[11px]">
          {rankText}
        </p>
      </div>
    </div>
  );
}

function TournamentStatsBlock({
  stats,
  leaderboard,
  agents,
}: {
  stats: any;
  leaderboard: any;
  agents: { agent: string; times: number }[];
}) {
  return (
    <div className="relative w-full min-w-0 space-y-1.5 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent px-2.5 py-2 sm:space-y-3 sm:rounded-2xl sm:px-4 sm:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[7px] font-bold tracking-[0.16em] text-white/40 uppercase sm:text-[8px]">Tournament stats</p>
        {leaderboard?.rank != null && leaderboard?.total ? (
          <span className="font-display text-[11px] font-black tabular-nums text-[#f6c177] sm:text-sm">
            #{leaderboard.rank}/{leaderboard.total}
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:text-[8px]">K / D / A</p>
          <p className="mt-0.5 font-display text-base font-black tabular-nums leading-none tracking-tight sm:mt-1 sm:text-3xl">
            <span className="text-emerald-300">{stats.kills}</span>
            <span className="mx-0.5 text-white/20 sm:mx-1">/</span>
            <span className="text-rose-300/90">{stats.deaths}</span>
            <span className="mx-0.5 text-white/20 sm:mx-1">/</span>
            <span className="text-sky-300/90">{stats.assists}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-end gap-4 text-right">
          <div>
            <p className="text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:text-[8px]">K/D</p>
            <p className="mt-0.5 font-display text-base font-black tabular-nums leading-none text-white sm:mt-1 sm:text-3xl">
              {stats.kd}
            </p>
          </div>
          {leaderboard?.rating != null ? (
            <div>
              <p className="text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:text-[8px]">Rating</p>
              <p className="mt-0.5 font-display text-base font-black tabular-nums leading-none text-white sm:mt-1 sm:text-3xl">
                {leaderboard.rating}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex w-full items-stretch divide-x divide-white/[0.08] rounded-lg bg-black/25 px-0.5 py-1.5 sm:px-1 sm:py-2.5">
        <MiniStat label="GP">{stats.gp}</MiniStat>
        <MiniStat label="ACS" accent>{stats.acs ?? "—"}</MiniStat>
        <MiniStat label="ADR">{stats.adr ?? "—"}</MiniStat>
        <MiniStat label="HS%">{stats.hsPct != null ? `${Math.round(stats.hsPct)}%` : "—"}</MiniStat>
        <MiniStat label="FK/FD">{stats.fkFd ?? "—"}</MiniStat>
      </div>

      {agents.length > 0 ? (
        <div>
          <p className="mb-1 text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:mb-1.5 sm:text-[8px]">
            Agents played
          </p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            {agents.map((a) => {
              const icon = getAgentIconUrl(a.agent);
              return (
                <div key={a.agent} title={`${a.agent} ×${a.times}`} className="flex flex-col items-center gap-0.5">
                  <div className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/15 sm:h-10 sm:w-10">
                    {icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={icon} alt="" className="h-full w-full scale-110 object-cover object-top" />
                    ) : (
                      <span className="text-[8px] font-bold text-white/45">{a.agent.slice(0, 2)}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold tabular-nums text-white/50">×{a.times}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BidRow({
  live,
  price,
  highestBidderName,
}: {
  live: boolean;
  price?: number;
  highestBidderName?: string | null;
}) {
  const leadingName = highestBidderName?.trim() || null;
  const leading = Boolean(leadingName);
  const initial = leading ? leadingName!.charAt(0).toUpperCase() : null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
      <div
        className={`flex flex-col justify-center rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${
          live ? "border-cyan-500/30 bg-[#091724]/40" : "border-white/[0.06] bg-white/[0.03]"
        }`}
      >
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">Current bid</span>
        <span key={price} className="bid-update-flash mt-1 font-display text-2xl font-black tabular-nums text-white sm:text-3xl">
          {price ?? 0}
          <span className="ml-1.5 text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase">pts</span>
        </span>
      </div>

      <div
        className={`relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${
          leading
            ? "border-emerald-400/35 bg-gradient-to-r from-[#09241b]/55 to-[#0a1a14]/30 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]"
            : "border-white/[0.06] bg-white/[0.03]"
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-black sm:h-12 sm:w-12 sm:text-xl ${
            leading
              ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/40"
              : "bg-white/[0.04] text-white/25 ring-1 ring-white/10"
          }`}
          aria-hidden
        >
          {initial ?? "—"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">Highest bidder</span>
            {leading && live ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-px text-[8px] font-black tracking-[0.14em] text-emerald-300 uppercase">
                Leading
              </span>
            ) : null}
          </div>
          <p
            key={highestBidderName || "none"}
            className={`bid-update-flash mt-0.5 truncate font-display font-black tracking-tight ${
              leading ? "text-lg text-white sm:text-xl" : "text-base text-white/30 sm:text-lg"
            }`}
            title={leadingName || undefined}
          >
            {leadingName || "Waiting for a bid"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimerBadge({
  isUrgent,
  live,
  status,
  timerEndsAt,
  clockOffset,
  displaySeconds,
}: {
  isUrgent: boolean;
  live: boolean;
  status?: string;
  timerEndsAt?: string | null;
  clockOffset?: number;
  displaySeconds: number;
}) {
  return (
    <div
      className={`shrink-0 flex flex-col items-center justify-center rounded-2xl border px-4 py-2.5 backdrop-blur-md select-none min-w-[96px] sm:min-w-[110px] sm:px-5 sm:py-3 ${
        isUrgent
          ? "border-red-500/40 bg-red-950/30 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
          : live || status === "paused"
            ? "border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            : "border-white/[0.06] bg-black/40"
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 mb-0.5">Time left</span>
      <Timer
        endsAt={timerEndsAt}
        clockOffset={clockOffset}
        defaultSeconds={displaySeconds}
        size="text-2xl sm:text-3xl font-black leading-none tracking-tight tabular-nums"
      />
    </div>
  );
}

type LastResult =
  | { type: "sold"; playerName: string; teamName: string; price: number }
  | { type: "unsold"; playerName: string }
  | null;

/** Auction spotlight — layout mirrors NTG registration profile card. */
export function PlayerCard({
  player,
  game,
  price,
  highestBidderName,
  status,
  lastResult,
  timerEndsAt,
  clockOffset,
  defaultSeconds = 15,
  layoutMode = "desktop",
  pausedRemainingMs,
}: {
  player: any;
  game: string;
  price?: number;
  highestBidderName?: string | null;
  status?: string;
  lastResult?: LastResult;
  timerEndsAt?: string | null;
  clockOffset?: number;
  defaultSeconds?: number;
  layoutMode?: "desktop" | "mobile";
  pausedRemainingMs?: number | null;
}) {
  const live = status === "live";
  const [isUrgent, setIsUrgent] = useState(false);

  const displaySeconds =
    status === "paused" && typeof pausedRemainingMs === "number"
      ? pausedRemainingMs / 1000
      : defaultSeconds;

  useEffect(() => {
    if (status === "paused") {
      setIsUrgent(typeof pausedRemainingMs === "number" && pausedRemainingMs > 0 && pausedRemainingMs < 5000);
      return;
    }
    if (!timerEndsAt || !live) {
      setIsUrgent(false);
      return;
    }
    const checkTime = () => {
      const msLeft = Math.max(new Date(timerEndsAt).getTime() - (Date.now() - (clockOffset || 0)), 0);
      setIsUrgent(msLeft > 0 && msLeft < 5000);
    };
    checkTime();
    const id = setInterval(checkTime, 250);
    return () => clearInterval(id);
  }, [timerEndsAt, clockOffset, live, status, pausedRemainingMs]);

  const renderContent = () => {
    if (!player) {
      if (lastResult?.type === "sold") {
        return (
          <div className="grid min-h-[280px] place-items-center p-6 text-center w-full">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400">Sold</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold text-white">{lastResult.playerName}</h2>
              <p className="mt-2 text-base text-white/50">
                to <span className="font-semibold text-[#5eead4]">{lastResult.teamName}</span>
              </p>
              <p className="mt-3 font-display text-2xl font-black tabular-nums text-gold">{lastResult.price} pts</p>
            </div>
          </div>
        );
      }
      if (lastResult?.type === "unsold") {
        return (
          <div className="grid min-h-[280px] place-items-center p-6 text-center w-full">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold">Unsold</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold text-white">{lastResult.playerName}</h2>
              <p className="mt-2 text-sm text-white/40">No bids — returns to the pool for the next pass.</p>
            </div>
          </div>
        );
      }
      return (
        <div className="grid min-h-[280px] place-items-center p-6 text-center w-full">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">No player on the block</p>
            <p className="mt-2 text-sm text-white/30">Draw a player to begin.</p>
          </div>
        </div>
      );
    }

    const rolesLabel = formatRoles(player.snapshotValorantRoles || player.roles);
    const rankText =
      game === "VALORANT"
        ? player.snapshotRankTier || "Unranked"
        : player.snapshotRankTier || player.snapshotCs2PeakPremier || "Unranked";
    const cardUrl = player.card_url || (game === "VALORANT" ? DEFAULT_CARD : null) || DEFAULT_CARD;
    const badges: PlayerBadge[] = Array.isArray(player.badges) ? player.badges : [];
    const { gold, silver } = trophyCounts(badges);
    const customs = customBadges(badges);
    const agents: { agent: string; times: number }[] = Array.isArray(player.agents) ? player.agents : [];
    const stats = player.stats;
    const lb = player.leaderboard;
    const riotId = player.snapshotRiotId;

    const timer = (
      <TimerBadge
        isUrgent={isUrgent}
        live={live}
        status={status}
        timerEndsAt={timerEndsAt}
        clockOffset={clockOffset}
        displaySeconds={displaySeconds}
      />
    );

    const identity = (
      <div className="min-w-0 flex-1">
        <p className="text-[8px] font-bold tracking-[0.18em] text-[#5eead4] uppercase">On the block</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h2 className="break-words font-display text-xl font-black tracking-tight text-white sm:text-3xl">
            {player.name}
          </h2>
          {gold > 0 ? (
            <span
              title={`${gold} cup win${gold === 1 ? "" : "s"}`}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-400/15 px-2 py-0.5 font-display text-sm font-black tabular-nums text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.18)] sm:px-2.5 sm:py-1 sm:text-base"
            >
              <span className="text-base leading-none sm:text-lg" aria-hidden>
                🏆
              </span>
              <span>×{gold}</span>
            </span>
          ) : null}
          {silver > 0 ? (
            <span
              title={`${silver} runner-up${silver === 1 ? "" : "s"}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300/30 bg-slate-300/10 px-2 py-0.5 font-display text-sm font-black tabular-nums text-slate-200 sm:px-2.5 sm:py-1 sm:text-base"
            >
              <span
                className="text-base leading-none sm:text-lg"
                style={{ filter: "grayscale(1) brightness(1.5)" }}
                aria-hidden
              >
                🏆
              </span>
              <span>×{silver}</span>
            </span>
          ) : null}
          {customs.map((label) => (
            <span
              key={label}
              title={label}
              className="inline-flex max-w-full items-center truncate rounded-full border border-violet-400/30 bg-violet-400/12 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-100 uppercase sm:px-2.5 sm:py-1 sm:text-[11px]"
            >
              {label}
            </span>
          ))}
        </div>
        {riotId ? <p className="mt-0.5 truncate text-[10px] text-white/35 sm:text-xs">{riotId}</p> : null}
        {rolesLabel ? (
          <div className="mt-1.5 sm:mt-2">
            <p className="text-[7px] font-bold tracking-[0.16em] text-white/35 uppercase sm:text-[9px]">Roles</p>
            <p className="mt-0.5 text-[11px] font-semibold text-white/70 sm:text-[13px]">{rolesLabel}</p>
          </div>
        ) : null}
      </div>
    );

    const ranks =
      game === "VALORANT" ? (
        <div className="grid min-w-0 grid-cols-2 gap-3 border-y border-white/[0.06] py-2 sm:gap-4 sm:py-2.5">
          <RankTile label="Current" rank={player.snapshotRankTier} />
          <RankTile label="Peak" rank={player.snapshotPeakRankTier} />
        </div>
      ) : (
        <p className="border-y border-white/[0.06] py-2 text-sm text-white/60">{rankText}</p>
      );

    const statsBlock =
      game === "VALORANT" && stats ? (
        <TournamentStatsBlock stats={stats} leaderboard={lb} agents={agents} />
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-[12px] text-white/45">
          No cup games published for this player yet.
        </div>
      );

    const bids = <BidRow live={live} price={price} highestBidderName={highestBidderName} />;

    // Mobile — same card as before; timer sits under the name row so it cannot overlap
    if (layoutMode === "mobile") {
      return (
        <div className="flex w-full flex-col gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <PortraitCard cardUrl={cardUrl} name={player.name} rankText={rankText} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {identity}
              <div className="self-start">{timer}</div>
            </div>
          </div>
          {ranks}
          {statsBlock}
          {bids}
        </div>
      );
    }

    // Desktop — registration card layout + timer + bids
    return (
      <div className="flex w-full min-w-0 items-start gap-5">
        <PortraitCard cardUrl={cardUrl} name={player.name} rankText={rankText} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            {identity}
            {timer}
          </div>
          {ranks}
          {statsBlock}
          {bids}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative rounded-2xl p-4 sm:rounded-[1.35rem] sm:p-5 transition-all duration-300 ${
        isUrgent ? "neon-glow-card-urgent" : live ? "neon-glow-card-live" : "neon-glow-card"
      }`}
    >
      {!player && (
        <div className="absolute top-4 right-4 z-10">
          <TimerBadge
            isUrgent={isUrgent}
            live={live}
            status={status}
            timerEndsAt={timerEndsAt}
            clockOffset={clockOffset}
            displaySeconds={displaySeconds}
          />
        </div>
      )}
      {renderContent()}
    </div>
  );
}

export default PlayerCard;
