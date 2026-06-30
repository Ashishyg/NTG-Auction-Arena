"use client";

/** All teams: budget, open slots, roster. Highlights the winning bidder. */
export function TeamsPanel({ teams, highlightId }: { teams: any[]; highlightId?: string }) {
  return (
    <div className="glass p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40 mb-4">Teams</p>
      <ul className="space-y-3">
        {(teams ?? []).map((t) => (
          <li
            key={t.id}
            className={`rounded-2xl p-3 border ${
              t.id === highlightId ? "border-brand/60 bg-brand/[0.06]" : "border-white/[0.07] bg-white/[0.02]"
            }`}
          >
            <div className="flex justify-between items-baseline">
              <span className="font-display text-white/90">{t.name}</span>
              <span className="text-gold tabular-nums text-sm">{t.currentBudget}</span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {t.rosterCount}/{t.rosterSize} slots · safe max {t.safeMax}
            </div>
            {t.roster?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {t.roster.map((p: any, i: number) => (
                  <li key={i} className="text-[11px] rounded-full bg-white/[0.05] px-2 py-0.5 text-white/70">
                    {p.name} <span className="text-gold">{p.price}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TeamsPanel;
