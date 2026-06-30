"use client";

import { GAME_FIELDS } from "@/auction/gameDefaults";

/** Game-aware player spotlight: right snapshot fields per game, price, top bid. */
export function PlayerCard({
  player,
  game,
  price,
  highestBidderName,
  status,
}: {
  player: any;
  game: string;
  price?: number;
  highestBidderName?: string | null;
  status?: string;
}) {
  if (!player) {
    return (
      <div className="panel grid min-h-[19rem] place-items-center p-10 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-2xl">🎯</div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">No player on the block</p>
          <p className="mt-2 text-sm text-white/30">Draw a player to begin.</p>
        </div>
      </div>
    );
  }

  const fields = GAME_FIELDS[game] ?? GAME_FIELDS.OTHER;
  const render = (key: string) => {
    const v = player[key];
    if (v == null) return "—";
    if (Array.isArray(v)) return v.join(", ") || "—";
    if (key === "snapshotDateOfBirth") return new Date(v).toLocaleDateString();
    return String(v);
  };
  const live = status === "live";

  return (
    <div className={`overflow-hidden rounded-[1.5rem] border bg-white/[0.02] ${live ? "border-[var(--color-brand)]/30" : "border-white/[0.07]"}`}>
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/80">{game}</p>
            <h2 className="mt-1 truncate font-display text-4xl font-semibold tracking-[-0.02em] text-white">{player.name ?? "Unknown"}</h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{live ? "Current bid" : "Floor"}</p>
            <p className="font-display text-5xl font-semibold leading-none text-gradient-gold tabular-nums">{price ?? 0}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-white/40">{f.label}</dt>
              <dd className="mt-1 truncate text-sm text-white/85">{render(f.key)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-white/[0.06] bg-white/[0.015] px-6 py-3.5 sm:px-7">
        {highestBidderName ? (
          <p className="flex items-center gap-2 text-sm">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Top bid</span>
            <span className="font-display text-white/90">{highestBidderName}</span>
            <span className="text-gold tabular-nums">{price}</span>
          </p>
        ) : (
          <p className="text-sm text-white/35">{live ? "No bids yet — opening at floor." : "Awaiting start."}</p>
        )}
      </div>
    </div>
  );
}

export default PlayerCard;
