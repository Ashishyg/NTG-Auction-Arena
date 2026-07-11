"use client";

import type { Account } from "@/lib/auth";

const ROLE: Record<string, { label: string; color: string }> = {
  auctioneer: { label: "Auctioneer", color: "var(--color-gold)" },
  captain: { label: "Captain", color: "var(--color-brand)" },
  observer: { label: "Observer", color: "var(--color-bio)" },
};

function UserChip({ account, teamName }: { account: Account; teamName?: string }) {
  // isAdmin and team are independent — an admin captaining a team is both,
  // so the badge reflects whichever capability is relevant here rather than
  // a single mutually-exclusive role.
  const roleKey = account.isAdmin ? "auctioneer" : account.team ? "captain" : "observer";
  const r = ROLE[roleKey];
  const roleLabel = roleKey.toUpperCase();
  const subLabel = account.team && teamName ? `${roleLabel} · ${teamName.toUpperCase()}` : roleLabel;

  return (
    <div className="flex h-10 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-0 pl-1 pr-4">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-xs font-bold text-[#06121a]"
        style={{ background: r.color }}
      >
        {account.name?.charAt(0)?.toUpperCase() ?? "?"}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block max-w-[9rem] truncate text-[12.5px] font-medium text-white/95">{account.name}</span>
        <span className="block truncate text-[9px] font-medium uppercase tracking-[0.2em]" style={{ color: r.color }}>
          {subLabel}
        </span>
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
  teamName,
}: {
  account: Account;
  connected: boolean;
  tabs?: NavTab[];
  activeTab?: string;
  onTab?: (key: string) => void;
  teamName?: string;
}) {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav className="glass mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ntg-logo.png"
            alt="NTG"
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[0_0_12px_rgba(94,234,212,0.5)]"
          />
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

        <div className="flex items-center gap-2.5">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset sm:inline-flex ${
              connected ? "text-brand ring-brand/30" : "text-magenta ring-magenta/30"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-brand" : "bg-magenta"}`} />
            {connected ? "Live" : "Offline"}
          </span>
          <UserChip account={account} teamName={teamName} />
        </div>
      </nav>
    </header>
  );
}

export default AuctionNav;
