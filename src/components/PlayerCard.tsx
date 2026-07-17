"use client";

import { useState, useEffect } from "react";

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

const ROLE_COLORS: Record<string, string> = {
  DUELIST: "#f43f5e",
  INITIATOR: "#8b5cf6",
  SENTINEL: "#10b981",
  CONTROLLER: "#06b6d4",
  FLEX: "#22d3ee",
};

function roleColor(role: string): string {
  const r = role.toUpperCase();
  for (const key of Object.keys(ROLE_COLORS)) {
    if (r.includes(key)) return ROLE_COLORS[key];
  }
  return "#94a3b8";
}

function RankTile({ label, rank }: { label: string; rank?: string | null }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 sm:p-3">
      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getRankIconUrl(rank)} alt="" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 object-contain" />
        <span className="truncate text-sm sm:text-base font-bold text-white">{rank || "Unranked"}</span>
      </div>
    </div>
  );
}

import { Timer } from "./Timer";

type LastResult =
  | { type: "sold"; playerName: string; teamName: string; price: number }
  | { type: "unsold"; playerName: string }
  | null;

/** Game-aware player spotlight — full uncropped card art, large rank/role display. */
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

  const displaySeconds = status === "paused" && typeof pausedRemainingMs === "number"
    ? pausedRemainingMs / 1000
    : defaultSeconds;

  useEffect(() => {
    if (status === "paused") {
      const urgent = typeof pausedRemainingMs === "number" && pausedRemainingMs > 0 && pausedRemainingMs < 5000;
      setIsUrgent(urgent);
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
          <div className="grid min-h-[340px] sm:min-h-[390px] lg:min-h-[370px] place-items-center p-6 text-center w-full">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400">Sold</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {lastResult.playerName}
              </h2>
              <p className="mt-2 text-base text-white/50">
                to <span className="font-semibold text-[#5eead4]">{lastResult.teamName}</span>
              </p>
              <p className="mt-3 font-display text-2xl font-black tabular-nums text-gold sm:text-3xl">{lastResult.price} pts</p>
            </div>
          </div>
        );
      }
      if (lastResult?.type === "unsold") {
        return (
          <div className="grid min-h-[340px] sm:min-h-[390px] lg:min-h-[370px] place-items-center p-6 text-center w-full">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold">Unsold</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {lastResult.playerName}
              </h2>
              <p className="mt-2 text-sm text-white/40">No bids — returns to the pool for the next pass.</p>
            </div>
          </div>
        );
      }
      return (
        <div className="grid min-h-[340px] sm:min-h-[390px] lg:min-h-[370px] place-items-center p-6 text-center w-full">
          <div>
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.06] text-2xl">🎯</div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">No player on the block</p>
            <p className="mt-2 text-sm text-white/30">Draw a player to begin.</p>
          </div>
        </div>
      );
    }

    const rawRoles = player.snapshotValorantRoles || player.roles;
    const rolesList: string[] = Array.isArray(rawRoles)
      ? rawRoles
      : String(rawRoles || "FLEX")
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
    const rankText =
      game === "VALORANT"
        ? player.snapshotRankTier || "Unranked"
        : player.snapshotRankTier || player.snapshotCs2PeakPremier || "Unranked";

    const cardUrl = player.card_url || (game === "VALORANT" ? "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png" : null);

    if (layoutMode === "mobile") {
      return (
        <div className="flex flex-col gap-4 w-full">
          {/* Header Row: Name on the left, Timer on the right */}
          <div className="flex flex-row justify-between items-end gap-4 w-full">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5eead4]">On the block</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl leading-tight break-words">
                {player.name}
              </h2>
            </div>

            {/* Timer on the right */}
            <div className={`shrink-0 flex flex-col items-center justify-center rounded-xl border px-4 py-2 backdrop-blur-md transition-all duration-300 select-none min-w-[100px] ${
              isUrgent
                ? "border-red-500/40 bg-red-950/30 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
                : (live || status === "paused")
                  ? "border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-white/[0.06] bg-black/40"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 mb-0.5">TIME LEFT</span>
              <Timer
                endsAt={timerEndsAt}
                clockOffset={clockOffset}
                defaultSeconds={displaySeconds}
                size="text-2xl sm:text-3xl font-black leading-none tracking-tight tabular-nums"
              />
            </div>
          </div>

          {/* Row 2: Card art (left) + Ranks (right) */}
          <div className="flex flex-row gap-4 items-stretch w-full">
            {/* Card art — original w-[130px] layout */}
            <div className="w-[130px] shrink-0 sm:w-[150px]">
              <div
                className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-cyan-500/20 shadow-lg"
                style={{
                  background: "linear-gradient(to top, #05111a, rgba(9, 21, 34, 0.9), #122838)",
                  boxShadow: "inset 0 0 24px rgba(34, 211, 238, 0.15)",
                }}
              >
                {cardUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cardUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-4xl">🎮</div>
                )}
                {/* Complete overlay matching PC view layout */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-2 pb-2 pt-8 flex flex-col items-center text-center pointer-events-none select-none">
                  <p className="w-full truncate font-display text-[10px] font-bold text-white tracking-wide">{player.name}</p>
                  <div className="my-1 flex h-6 w-6 items-center justify-center">
                    <img 
                      src={getRankIconUrl(rankText)} 
                      alt="" 
                      className="h-6 w-6 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]" 
                    />
                  </div>
                  <p className="w-full truncate font-display text-[7px] font-black uppercase tracking-wide text-white/90 drop-shadow-md">
                    {rankText}
                  </p>
                  <p className="mt-0.5 w-full truncate text-[7px] font-extrabold uppercase tracking-[0.2em] text-[#5eead4]">
                    {rolesList[0] || "FLEX"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: Ranks stacked vertically, matching card art height */}
            <div className="flex-1 min-w-0 flex flex-col gap-2 self-stretch">
              {game === "VALORANT" ? (
                <div className="flex flex-col gap-2 flex-1 self-stretch">
                  <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Current</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getRankIconUrl(player.snapshotRankTier)} alt="" className="h-7 w-7 object-contain mt-0.5" />
                    <span className="text-xs font-bold text-white mt-0.5 leading-tight">{player.snapshotRankTier || "Unranked"}</span>
                  </div>
                  <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Peak</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getRankIconUrl(player.snapshotPeakRankTier)} alt="" className="h-7 w-7 object-contain mt-0.5" />
                    <span className="text-xs font-bold text-white mt-0.5 leading-tight">{player.snapshotPeakRankTier || "Unranked"}</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 flex flex-col items-center justify-center text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Rank</p>
                  <p className="text-sm font-bold text-white mt-1 leading-tight">{rankText}</p>
                </div>
              )}
            </div>
          </div>

          {/* Roles container matching ranks (rectangle box) */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 sm:p-3 flex items-center gap-4 w-full">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 shrink-0">Roles</span>
            <div className="flex flex-wrap gap-1.5">
              {rolesList.map((r) => (
                <span
                  key={r}
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shrink-0"
                  style={{ background: `${roleColor(r)}22`, color: roleColor(r) }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* ── Row 3: Bid panels — full width 2-col ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`flex flex-col justify-center rounded-xl border px-4 py-3 transition-all duration-300 ${
              live
                ? "border-cyan-500/30 bg-[#091724]/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                : "border-white/[0.06] bg-[#0b1120]/30"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">Current bid</span>
              <span key={price} className="inline-block bid-update-flash mt-1.5 font-display text-3xl font-black leading-none tabular-nums text-white sm:text-4xl">
                {price ?? 0}
              </span>
            </div>

            <div className={`flex min-w-0 flex-col justify-center rounded-xl border px-4 py-3 transition-all duration-300 ${
              highestBidderName
                ? "border-emerald-500/20 bg-[#09241b]/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                : "border-white/[0.06] bg-[#0b1120]/30"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">Highest bidder</span>
              <span key={highestBidderName || "none"} className="inline-block bid-update-flash mt-1.5 truncate font-display text-base font-bold leading-tight text-white">
                {highestBidderName || "—"}
              </span>
              <span className={`mt-1 text-[10px] font-semibold tracking-wide ${highestBidderName ? "text-[#10b981]" : "text-white/30"}`}>
                {highestBidderName ? `Leading at ${price} pts` : "Awaiting first bid"}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Default "desktop" layout
    return (
      <div className="flex flex-row gap-5 sm:gap-6 items-start w-full">
        {/* Full, uncropped Riot player card art */}
        <div className="mx-auto w-full max-w-[220px] shrink-0 sm:max-w-[240px] md:mx-0 md:w-56 lg:w-52">
          <div
            className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-cyan-500/20 shadow-lg"
            style={{
              background: "linear-gradient(to top, #05111a, rgba(9, 21, 34, 0.9), #122838)",
              boxShadow: "inset 0 0 24px rgba(34, 211, 238, 0.15)",
            }}
          >
            {cardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cardUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-5xl">🎮</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-3 pt-12 flex flex-col items-center text-center pointer-events-none select-none">
              <p className="w-full truncate font-display text-sm font-bold text-white tracking-wide">{player.name}</p>
              <div className="my-1.5 flex h-10 w-10 items-center justify-center">
                <img 
                  src={getRankIconUrl(rankText)} 
                  alt="" 
                  className="h-10 w-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]" 
                />
              </div>
              <p className="w-full truncate font-display text-[10px] font-black uppercase tracking-wide text-white/90 drop-shadow-md">
                {rankText}
              </p>
              <p className="mt-1 w-full truncate text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#5eead4]">
                {rolesList[0] || "FLEX"}
              </p>
            </div>
          </div>
        </div>

        {/* Details — larger rank/role display, uses the full width */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5 self-stretch">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5eead4]">On the block</p>
              <h2 className="mt-1 truncate font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {player.name}
              </h2>
            </div>
            
            {/* Embedded Timer Badge */}
            <div className={`shrink-0 flex flex-col items-center justify-center rounded-2xl border px-5 py-3 backdrop-blur-md transition-all duration-300 select-none min-w-[110px] ${
              isUrgent
                ? "border-red-500/40 bg-red-950/30 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
                : (live || status === "paused")
                  ? "border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-white/[0.06] bg-black/40"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 mb-1">TIME LEFT</span>
              <Timer 
                endsAt={timerEndsAt} 
                clockOffset={clockOffset} 
                defaultSeconds={displaySeconds} 
                size="text-3xl sm:text-4xl font-black leading-none tracking-tight tabular-nums" 
              />
            </div>
          </div>

          {/* Group Ranks, Roles and Bids at the bottom to keep them close */}
          <div className="mt-auto flex flex-col gap-3">
            {/* Ranks — side-by-side */}
            {game === "VALORANT" ? (
              <div className="grid grid-cols-2 gap-3">
                <RankTile label="Current" rank={player.snapshotRankTier} />
                <RankTile label="Peak" rank={player.snapshotPeakRankTier} />
              </div>
            ) : (
              <p className="text-base text-white/60 font-medium">
                {rankText}
              </p>
            )}

            {/* Roles — horizontal display in ranks-style rectangle box */}
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 sm:p-3 flex items-center gap-4">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 shrink-0">Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {rolesList.map((r) => (
                  <span
                    key={r}
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{ background: `${roleColor(r)}22`, color: roleColor(r) }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Side-by-side bid panels */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={`flex flex-col justify-center rounded-xl border px-4 py-3.5 shadow-sm transition-all duration-300 sm:px-5 sm:py-4 ${
                live
                  ? "border-cyan-500/30 bg-[#091724]/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                  : "border-white/[0.06] bg-[#0b1120]/30"
              }`}>
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Current bid
                </span>
                <span key={price} className="inline-block bid-update-flash mt-1.5 font-display text-3xl font-black leading-none tabular-nums text-white sm:text-4xl">
                  {price ?? 0}
                </span>
              </div>

              <div className={`flex min-w-0 flex-col justify-center rounded-xl border px-4 py-3.5 shadow-sm transition-all duration-300 sm:px-5 sm:py-4 ${
                highestBidderName
                  ? "border-emerald-500/20 bg-[#09241b]/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                  : "border-white/[0.06] bg-[#0b1120]/30"
              }`}>
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Highest bidder
                </span>
                <span key={highestBidderName || "none"} className="inline-block bid-update-flash mt-1.5 truncate font-display text-base font-bold leading-tight text-white">
                  {highestBidderName || "—"}
                </span>
                <span className={`mt-1 text-[10px] font-semibold tracking-wide ${highestBidderName ? "text-[#10b981]" : "text-white/30"}`}>
                  {highestBidderName ? `Leading at ${price} pts` : "Awaiting first bid"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const rawRoles = player?.snapshotValorantRoles || player?.roles;
  const rolesList: string[] = Array.isArray(rawRoles)
    ? rawRoles
    : String(rawRoles || "FLEX")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
  const uniqueColors = Array.from(new Set(rolesList.map((r) => roleColor(r))));
  const borderColor = uniqueColors.length > 1
    ? `linear-gradient(135deg, ${uniqueColors.join(", ")})`
    : uniqueColors[0] || "#94a3b8";

  const borderColorHover = uniqueColors.length > 1
    ? `linear-gradient(135deg, ${uniqueColors.map((c) => `${c}cc`).join(", ")})`
    : `${uniqueColors[0] || "#94a3b8"}cc`;

  const baseColor = uniqueColors[0] || "#94a3b8";

  const dynamicStyle = {
    "--role-border-color": borderColor,
    "--role-border-color-hover": borderColorHover,
    "--role-glow": `${baseColor}22`,
    "--role-glow-hover": `${baseColor}44`,
  } as React.CSSProperties;

  return (
    <div 
      style={dynamicStyle}
      className={`p-4 sm:p-6 lg:p-5 rounded-2xl sm:rounded-[1.35rem] relative transition-all duration-300 ${
        isUrgent 
          ? "neon-glow-card-urgent" 
          : live 
            ? "neon-glow-card-live" 
            : "neon-glow-card"
      }`}
    >
      {/* Floating Timer Badge (only visible if there is no player, to avoid collision with details) */}
      {!player && (
        <div className={`absolute top-4 right-4 z-10 flex flex-col items-center justify-center rounded-2xl border px-5 py-3.5 backdrop-blur-md transition-all duration-300 select-none min-w-[110px] ${
          isUrgent
            ? "border-red-500/40 bg-red-950/30 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
            : (live || status === "paused")
              ? "border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              : "border-white/[0.06] bg-black/40"
        }`}>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 mb-1">TIME LEFT</span>
          <Timer 
            endsAt={timerEndsAt} 
            clockOffset={clockOffset} 
            defaultSeconds={displaySeconds} 
            size="text-3xl sm:text-4xl font-black leading-none tracking-tight tabular-nums" 
          />
        </div>
      )}

      {renderContent()}
    </div>
  );
}

export default PlayerCard;


