"use client";

import type { Account } from "@/lib/auth";

const ROLE: Record<string, { label: string; color: string }> = {
  auctioneer: { label: "Auctioneer", color: "var(--color-gold)" },
  captain: { label: "Captain", color: "var(--color-brand)" },
  observer: { label: "Observer", color: "var(--color-bio)" },
};

function UserChip({ account }: { account: Account }) {
  const r = ROLE[account.role] ?? ROLE.observer;
  return (
    <div className="flex h-10 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-0 pl-1 pr-3.5">
      <span
        className="grid h-8 w-8 place-items-center rounded-full font-display text-xs font-bold text-[#06121a]"
        style={{ background: r.color }}
      >
        {account.name?.charAt(0)?.toUpperCase() ?? "?"}
      </span>
      <span className="leading-tight">
        <span className="block max-w-[8rem] truncate text-[12px] text-white/85">{account.name}</span>
        <span className="block text-[9px] uppercase tracking-[0.18em]" style={{ color: r.color }}>{r.label}</span>
      </span>
    </div>
  );
}

export type NavTab = { key: string; label: string };

export function AuctionNav({
  account,
  connected,
  tabs,
  activeTab,
  onTab,
}: {
  account: Account;
  connected: boolean;
  tabs?: NavTab[];
  activeTab?: string;
  onTab?: (key: string) => void;
}) {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav className="glass mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-iris)] to-[var(--color-brand)] font-display text-[13px] font-bold text-[#06121a] shadow-[0_0_12px_rgba(94,234,212,0.5)]">
            NA
          </span>
          <span className="hidden truncate font-display text-[14px] font-semibold tracking-[0.14em] text-white/95 sm:inline">
            NTG{" "}
            <span className="bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent">
              AUCTION ARENA
            </span>
          </span>
          <span className="font-display text-[13px] font-semibold tracking-[0.16em] text-white/95 sm:hidden">
            NTG <span className="bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent">ARENA</span>
          </span>
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onTab?.(t.key)}
                className={`rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition sm:px-5 ${
                  activeTab === t.key ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset sm:inline-flex ${
              connected ? "text-brand ring-brand/30" : "text-magenta ring-magenta/30"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-brand" : "bg-magenta"}`} />
            {connected ? "Live" : "Offline"}
          </span>
          <UserChip account={account} />
        </div>
      </nav>
    </header>
  );
}

export default AuctionNav;
