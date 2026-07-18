import { useState, useEffect } from "react";

const PRIMARY = "cta rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:brightness-110 disabled:opacity-40";
const GHOST = "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-30";
const FIELD = "w-24 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm tabular-nums text-white focus:border-brand focus:outline-none";

const DEFAULT_VALORANT_RANKS: { rank: string; floor: number }[] = [
  { rank: "Immortal", floor: 12 },
  { rank: "Ascendant", floor: 10 },
  { rank: "Diamond", floor: 8 },
  { rank: "Platinum", floor: 6 },
  { rank: "Gold", floor: 4 },
  { rank: "Silver", floor: 2 },
  { rank: "Bronze", floor: 1 },
  { rank: "Iron", floor: 1 },
];

/** Tier accent dots for the rank-points editor. */
const RANK_DOT: Record<string, string> = {
  Immortal: "#b45e6b",
  Ascendant: "#22c55e",
  Diamond: "#b794f4",
  Platinum: "#5eead4",
  Gold: "#f6c177",
  Silver: "#cbd5e1",
  Bronze: "#b08d57",
  Iron: "#8a8f98",
};

/** Pre-auction config: editable settings + publish-to-main-site. */
export function SetupPanel({ state, actions }: { state: any; actions: any }) {
  const [ts, setTs] = useState<number>(state?.settings?.timerSeconds ?? 15);
  const [inc, setInc] = useState<number>(state?.settings?.minBidIncrement ?? 1);
  const [ranks, setRanks] = useState<{ rank: string; floor: number }[]>(() => {
    const raw = Array.isArray(state?.rankTable) && state.rankTable.length ? state.rankTable : DEFAULT_VALORANT_RANKS;
    return raw.filter((r: any) => r.rank.toLowerCase().trim() !== "unranked");
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmPub, setConfirmPub] = useState(false);

  // Sync state with incoming props changes (e.g. from server updates)
  useEffect(() => {
    if (state?.settings?.timerSeconds !== undefined) {
      setTs(state.settings.timerSeconds);
    }
    if (state?.settings?.minBidIncrement !== undefined) {
      setInc(state.settings.minBidIncrement);
    }
    if (Array.isArray(state?.rankTable) && state.rankTable.length) {
      setRanks(state.rankTable.filter((r: any) => r.rank.toLowerCase().trim() !== "unranked"));
    }
  }, [state?.settings?.timerSeconds, state?.settings?.minBidIncrement, state?.rankTable]);

  const act = (fn: () => Promise<{ error?: string }>) => async () => {
    setMsg(null);
    const r = await fn();
    setMsg(r?.error ?? "✓ saved");
  };

  return (
    <div className="panel p-5">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Settings</p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-white/55">
          Timer (s)
          <input
            type="number"
            min={3}
            max={600}
            value={ts === 0 ? "" : ts}
            placeholder="0"
            onChange={(e) => {
              const val = e.target.value;
              setTs(val === "" ? 0 : Number(val));
            }}
            className={`${FIELD} mt-1 block`}
          />
        </label>
        
        <label className="text-xs text-white/55">
          Min Bid Increment
          <input
            type="number"
            min={1}
            value={inc === 0 ? "" : inc}
            placeholder="1"
            onChange={(e) => {
              const val = e.target.value;
              setInc(val === "" ? 0 : Number(val));
            }}
            className={`${FIELD} mt-1 block`}
          />
        </label>

        <div className="text-xs text-white/40">
          Roster size
          <span className="mt-1 block rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm tabular-nums text-white/70">
            {state?.settings?.rosterSize ?? "—"}
          </span>
        </div>
        <button className={PRIMARY} onClick={act(() => actions.updateSettings({ timerSeconds: ts, minBidIncrement: inc }))}>
          Save
        </button>
      </div>

      <p className="mt-3 text-[11px] text-white/30">
        Roster size (captain + co-captains + drafted players) is set on the main site. Player floor prices are edited in the table below.
      </p>

      {state?.game === "VALORANT" && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Rank Points</p>
            <button className={GHOST} onClick={() => setRanks(DEFAULT_VALORANT_RANKS)}>Reset</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ranks.map((row, i) => (
              <div
                key={row.rank}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition-colors focus-within:border-brand/50 focus-within:bg-white/[0.04]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: RANK_DOT[row.rank] ?? "#6b7280" }} />
                  <span className="text-[11px] font-medium text-white/70">{row.rank}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  aria-label={`${row.rank} points`}
                  value={row.floor === 0 ? "" : row.floor}
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = val === "" ? 0 : Number(val);
                    setRanks(ranks.map((r, j) => (j === i ? { ...r, floor: num } : r)));
                  }}
                  className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm font-mono tabular-nums text-white focus:border-brand focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className={PRIMARY} onClick={act(() => actions.setRankTable(ranks))}>Save rank points</button>
          </div>
          <p className="mt-2 text-[11px] text-white/30">
            Re-floors every player still in the pool. Sold players keep their price.
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Team Colors</p>
        <div className="space-y-3.5 select-none max-w-md">
          {!state?.teams || state.teams.length === 0 ? (
            <p className="text-xs text-white/30 italic">No teams registered.</p>
          ) : (
            state.teams.map((t: any) => {
              const colors = [
                "#06b6d4", // Cyan
                "#a855f7", // Purple/Violet
                "#10b981", // Emerald
                "#f43f5e", // Rose
                "#f59e0b", // Gold
                "#d946ef", // Magenta
                "#6366f1", // Indigo
                "#f97316", // Orange
              ];
              const activeColor = t.color || (() => {
                let hash = 0;
                for (let i = 0; i < t.id.length; i++) {
                  hash = t.id.charCodeAt(i) + ((hash << 5) - hash);
                }
                const index = Math.abs(hash) % colors.length;
                return colors[index];
              })();

              return (
                <div key={t.id} className="flex items-center justify-between gap-4 py-1.5 border-b border-white/[0.02] last:border-0">
                  <span className="text-xs font-semibold text-white/80 truncate max-w-[150px]">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    {colors.map((c) => {
                      const isActive = activeColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={act(() => actions.setTeamColor(t.id, c))}
                          className="h-4 w-4 rounded-full border transition-all hover:scale-110 cursor-pointer"
                          style={{
                            backgroundColor: c,
                            borderColor: isActive ? "#000000" : "rgba(255,255,255,0.15)",
                            borderWidth: isActive ? "2px" : "1px",
                            boxShadow: isActive ? "0 0 0 2px #ffffff" : "none",
                          }}
                        />
                      );
                    })}
                    {/* Custom Color Selector */}
                    {(() => {
                      const isCustom = !colors.includes(activeColor);
                      return (
                        <div 
                          className="relative flex items-center justify-center h-4 w-4 rounded-full border transition hover:scale-110 cursor-pointer overflow-hidden"
                          style={{
                            backgroundColor: isCustom ? activeColor : "rgba(255,255,255,0.04)",
                            borderColor: isCustom ? "#000000" : "rgba(255,255,255,0.2)",
                            borderWidth: isCustom ? "2px" : "1px",
                            boxShadow: isCustom ? "0 0 0 2px #ffffff" : "none",
                          }}
                        >
                          <input
                            type="color"
                            value={activeColor.startsWith("#") ? activeColor : "#06b6d4"}
                            onChange={async (e) => {
                              const customColor = e.target.value;
                              setMsg(null);
                              const r = await actions.setTeamColor(t.id, customColor);
                              setMsg(r?.error ?? "✓ saved");
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          {!isCustom && <span className="text-[10px] font-bold text-white/60 pointer-events-none select-none">+</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Finalize</p>
        {confirmPub ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/60">Publish current rosters to the main site?</span>
            <button className={PRIMARY} onClick={act(async () => { const r = await actions.publishResults(); setConfirmPub(false); return r; })}>Confirm publish</button>
            <button className={GHOST} onClick={() => setConfirmPub(false)}>Cancel</button>
          </div>
        ) : (
          <button className={GHOST} onClick={() => setConfirmPub(true)}>Publish to main site</button>
        )}
      </div>

      {msg && <p className={`mt-3 text-sm ${msg.startsWith("✓") ? "text-brand" : "text-magenta"}`}>{msg}</p>}
    </div>
  );
}

export default SetupPanel;
