"use client";

import { Timer } from "./Timer";
import type { Account } from "@/lib/auth";

const ROLE_STYLE: Record<string, { label: string; color: string }> = {
  auctioneer: { label: "Auctioneer", color: "var(--color-gold)" },
  captain: { label: "Captain", color: "var(--color-brand)" },
  observer: { label: "Observer", color: "var(--color-bio)" },
};

const STATUS_STYLE: Record<string, { label: string; color: string; ping?: boolean }> = {
  idle: { label: "Idle", color: "rgb(255 255 255 / 0.4)" },
  showcase: { label: "Showcase", color: "var(--color-bio)" },
  live: { label: "Live", color: "#f87171", ping: true },
  paused: { label: "Paused", color: "var(--color-gold)" },
  complete: { label: "Complete", color: "var(--color-brand)" },
};

function UserChip({ account }: { account: Account }) {
  const r = ROLE_STYLE[account.role] ?? ROLE_STYLE.observer;
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] py-1 pl-1 pr-3.5">
      <span
        className="grid h-7 w-7 place-items-center rounded-full font-display text-xs font-bold text-ink"
        style={{ background: r.color }}
      >
        {account.name?.charAt(0)?.toUpperCase() ?? "?"}
      </span>
      <span className="leading-tight">
        <span className="block text-xs text-white/85">{account.name}</span>
        <span className="block text-[9px] uppercase tracking-[0.2em]" style={{ color: r.color }}>
          {r.label}
        </span>
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = STATUS_STYLE[status ?? "idle"] ?? STATUS_STYLE.idle;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ring-1 ring-inset"
      style={{ color: s.color, borderColor: s.color, boxShadow: `inset 0 0 0 1px ${s.color}33` }}
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

export function TopBar({
  account,
  game,
  status,
  pass,
  connected,
  timerEndsAt,
  clockOffset,
  counts,
  showTimer = true,
}: {
  account: Account;
  game?: string;
  status?: string;
  pass?: number;
  connected: boolean;
  timerEndsAt?: string | null;
  clockOffset?: number;
  counts?: { pool?: number; sold?: number; unsold?: number };
  showTimer?: boolean;
}) {
  return (
    <header className="glass mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.32em] text-white/40">NTG Auction Arena</p>
          <h1 className="font-display text-xl leading-tight text-gradient-brand">{game ?? "Auction"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {pass ? <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Pass {pass}</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {counts && (
          <div className="hidden items-center gap-3 text-[11px] tabular-nums text-white/45 sm:flex">
            <span>pool <span className="text-white/80">{counts.pool ?? 0}</span></span>
            <span>sold <span className="text-brand">{counts.sold ?? 0}</span></span>
            <span>unsold <span className="text-white/80">{counts.unsold ?? 0}</span></span>
          </div>
        )}
        {showTimer && (
          <div className="min-w-[3.5rem] text-right">
            <Timer endsAt={timerEndsAt} clockOffset={clockOffset} />
          </div>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ring-1 ring-inset ${
            connected ? "text-brand ring-brand/40" : "text-magenta ring-magenta/40"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-brand" : "bg-magenta"}`} />
          {connected ? "Live" : "Offline"}
        </span>
        <UserChip account={account} />
      </div>
    </header>
  );
}

export default TopBar;
