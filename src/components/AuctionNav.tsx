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
    <div className="flex h-9 shrink-0 overflow-hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-0 pl-1 pr-2.5 sm:h-10 sm:gap-2.5 sm:pr-4">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[10px] font-bold text-[#06121a] sm:h-8 sm:w-8 sm:text-xs"
        style={{ background: r.color }}
      >
        {account.name?.charAt(0)?.toUpperCase() ?? "?"}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block max-w-[3.5rem] truncate text-[11px] font-medium text-white/95 sm:max-w-[9rem] sm:text-[12.5px]">{account.name}</span>
        <span className="block max-w-[4.8rem] truncate text-[8px] font-medium uppercase tracking-normal sm:max-w-[9rem] sm:text-[9px] sm:tracking-[0.2em]" style={{ color: r.color }}>
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
    <header className="sticky top-0 lg:static z-50 px-2 pt-3 sm:px-4 sm:pt-4">
      <nav className="glass mx-auto flex max-w-7xl items-center justify-between gap-1.5 rounded-2xl px-2 py-1.5 sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ntg-logo.png"
            alt="NTG"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[0_0_12px_rgba(94,234,212,0.5)]"
          />
          <span className="hidden truncate font-display text-[14px] font-semibold tracking-[0.14em] text-white/95 sm:inline">
            NTG{" "}
            <span className="bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent">
              AUCTION ARENA
            </span>
          </span>
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] p-0.5 sm:gap-1 sm:p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onTab?.(t.key)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] transition sm:px-5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.18em] ${
                  activeTab === t.key ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2.5">
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
