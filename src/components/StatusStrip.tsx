"use client";

import { Timer } from "./Timer";

const STATUS: Record<string, { label: string; color: string; ping?: boolean }> = {
  idle: { label: "Idle", color: "rgb(255 255 255 / 0.45)" },
  showcase: { label: "Showcase", color: "var(--color-bio)" },
  live: { label: "Live", color: "#f87171", ping: true },
  paused: { label: "Paused", color: "var(--color-gold)" },
  complete: { label: "Complete", color: "var(--color-brand)" },
};

export function StatusBadge({ status }: { status?: string }) {
  const s = STATUS[status ?? "idle"] ?? STATUS.idle;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ring-1 ring-inset"
      style={{ color: s.color, "--tw-ring-color": `${s.color}55` } as React.CSSProperties}
    >
      {s.ping && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: s.color }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
        </span>
      )}
      {s.label}
    </span>
  );
}

export function StatusStrip({
  game,
  status,
  pass,
  counts,
  timerEndsAt,
  clockOffset,
  eyebrow = "Live Auction",
}: {
  game?: string;
  status?: string;
  pass?: number;
  counts?: { pool?: number; sold?: number; unsold?: number };
  timerEndsAt?: string | null;
  clockOffset?: number;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 mt-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.42em] text-[var(--color-brand)]/85">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
          {game ?? "Auction"} <span className="text-white/25">Arena</span>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          {pass ? <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Pass {pass}</span> : null}
          {counts && (
            <span className="text-[11px] tabular-nums text-white/45">
              pool <span className="text-white/80">{counts.pool ?? 0}</span> · sold{" "}
              <span className="text-brand">{counts.sold ?? 0}</span> · unsold{" "}
              <span className="text-white/80">{counts.unsold ?? 0}</span>
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Time left</p>
        <Timer endsAt={timerEndsAt} clockOffset={clockOffset} size="text-5xl" />
      </div>
    </div>
  );
}

export default StatusStrip;
