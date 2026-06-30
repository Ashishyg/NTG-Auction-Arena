"use client";

/** All teams: budget, open slots, roster. Highlights the winning bidder. */
export function TeamsPanel({ teams, highlightId }: { teams: any[]; highlightId?: string }) {
  return (
    <div className="panel p-5">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Teams</p>
      <ul className="space-y-3">
        {(teams ?? []).length === 0 && <li className="text-sm text-white/30">No teams yet.</li>}
        {(teams ?? []).map((t) => (
          <li
            key={t.id}
            className={`rounded-2xl border p-3 transition ${
              t.id === highlightId ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display font-medium text-white/90">{t.name}</span>
              <span className="text-sm tabular-nums text-gold">{t.currentBudget}</span>
            </div>
            <div className="mt-1 text-[11px] tabular-nums text-white/40">
              {t.rosterCount}/{t.rosterSize} slots · safe max {t.safeMax}
            </div>
            {t.roster?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {t.roster.map((p: any, i: number) => (
                  <li key={i} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/70">
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
