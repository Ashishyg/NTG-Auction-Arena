"use client";

import { useState, useEffect } from "react";

function BudgetEditor({ teamId, value, onSet }: { teamId: string; value: number; onSet: (id: string, budget: number) => void }) {
  const [tempVal, setTempVal] = useState(value);

  // Sync state with incoming props changes (e.g. from server updates)
  useEffect(() => {
    setTempVal(value);
  }, [value]);

  const update = (newVal: number) => {
    if (Number.isFinite(newVal) && newVal >= 0) {
      setTempVal(newVal);
      onSet(teamId, newVal);
    }
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5 ml-1.5 shadow-sm focus-within:border-cyan-500/30 transition-all select-none">
      {/* Minus Button */}
      <button
        type="button"
        onClick={() => update(Math.max(0, tempVal - 5))}
        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white/50 hover:text-white hover:bg-white/[0.06] transition"
      >
        −
      </button>

      {/* Input Field */}
      <input
        type="number"
        min={0}
        value={tempVal === 0 ? "" : tempVal}
        placeholder="0"
        onChange={(e) => {
          const val = e.target.value;
          setTempVal(val === "" ? 0 : Number(val));
        }}
        onBlur={() => {
          if (tempVal !== value) update(tempVal);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-12 text-center bg-transparent border-none p-0 text-xs font-mono font-bold text-white focus:outline-none focus:ring-0 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Plus Button */}
      <button
        type="button"
        onClick={() => update(tempVal + 5)}
        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white/50 hover:text-white hover:bg-white/[0.06] transition"
      >
        +
      </button>
    </div>
  );
}

const getRoleColor = (role: any) => {
  if (!role) return "text-white/40";
  const r = (Array.isArray(role) ? role.join(", ") : String(role)).toUpperCase();
  if (r.includes("DUELIST")) return "text-[#f43f5e]";
  if (r.includes("INITIATOR")) return "text-[#8b5cf6]";
  if (r.includes("SENTINEL")) return "text-[#10b981]";
  if (r.includes("CONTROLLER")) return "text-[#06b6d4]";
  if (r.includes("FLEX")) return "text-cyan-400";
  return "text-white/40";
};

export function PlayerPoolPanel({ players, count }: { players: any[]; count: number }) {
  return (
    <div className="panel p-5 bg-white/[0.025] border-white/[0.08] flex flex-col h-[350px]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">PLAYER POOL · {count}</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-none">
        {players.length === 0 ? (
          <p className="text-xs text-white/30 italic py-2">No players in pool.</p>
        ) : (
          players.map((p) => (
            <div key={p.registrationId} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03]">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-semibold text-white truncate">{p.name}</span>
                <span className="text-white/35 text-[10px] shrink-0">{p.rank}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${getRoleColor(p.roles || "")}`}>
                  {p.roles ? (Array.isArray(p.roles) ? p.roles.join(", ") : p.roles) : "FLEX"}
                </span>
              </div>
              <div className="text-[10px] text-white/40 shrink-0 font-medium tracking-wide">
                FLOOR <span className="text-white font-mono ml-0.5">{p.floor}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function UnsoldPanel({ players, count }: { players: any[]; count: number }) {
  return (
    <div className="panel p-5 bg-white/[0.025] border-white/[0.08] flex flex-col h-[350px]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">UNSOLD · {count}</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-none">
        {players.length === 0 ? (
          <p className="text-[10px] text-white/30 py-4 text-center">
            Return in pass 2 after the pool finishes. None yet.
          </p>
        ) : (
          players.map((p) => (
            <div key={p.registrationId} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03]">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-semibold text-white truncate">{p.name}</span>
                <span className="text-white/35 text-[10px] shrink-0">{p.rank}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${getRoleColor(p.roles || "")}`}>
                  {p.roles ? (Array.isArray(p.roles) ? p.roles.join(", ") : p.roles) : "FLEX"}
                </span>
              </div>
              <div className="text-[10px] text-white/40 shrink-0 font-medium tracking-wide">
                FLOOR <span className="text-[#f6c177] font-mono ml-0.5">{p.floor}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TeamsPanel({ teams, highlightId, editBudget }: { teams: any[]; highlightId?: string; editBudget?: (teamId: string, budget: number) => void }) {
  return (
    <div className="panel p-5 bg-white/[0.025] border-white/[0.08] flex flex-col h-[350px]">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">TEAMS</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
        {teams.length === 0 ? (
          <p className="text-xs text-white/30 italic py-2">No teams registered.</p>
        ) : (
          teams.map((t) => {
            const isHighlight = t.id === highlightId;
            const spent = t.roster?.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0) || 0;
            const total = Math.max(t.currentBudget + spent, 150);
            const pct = total > 0 ? (t.currentBudget / total) * 100 : 0;

            return (
              <div
                key={t.id}
                className={`rounded-xl border p-3 transition duration-200 ${
                  isHighlight 
                    ? "border-cyan-500/40 bg-cyan-950/[0.12]" 
                    : "border-white/[0.06] bg-white/[0.01]"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-display text-[13px] font-bold text-white truncate">{t.name}</span>
                    {typeof t.rosterCount === "number" && typeof t.rosterSize === "number" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] font-semibold tabular-nums text-white/35 mr-0.5">
                          {t.rosterCount}/{t.rosterSize}
                        </span>
                        {Array.from({ length: t.rosterSize || 5 }).map((_, idx) => {
                          const isFilled = idx < (t.roster?.length || 0);
                          const player = t.roster?.[idx];
                          let dotColor = "bg-white/10 border border-white/20";
                          if (isFilled) {
                            const rolesVal = player?.roles ? (Array.isArray(player.roles) ? player.roles.join(", ") : player.roles) : "FLEX";
                            const colorClass = getRoleColor(rolesVal);
                            if (colorClass.includes("#f43f5e")) {
                              dotColor = "bg-[#f43f5e] shadow-[0_0_4px_#f43f5e]";
                            } else if (colorClass.includes("#8b5cf6")) {
                              dotColor = "bg-[#8b5cf6] shadow-[0_0_4px_#8b5cf6]";
                            } else if (colorClass.includes("#10b981")) {
                              dotColor = "bg-[#10b981] shadow-[0_0_4px_#10b981]";
                            } else if (colorClass.includes("#06b6d4")) {
                              dotColor = "bg-[#06b6d4] shadow-[0_0_4px_#06b6d4]";
                            } else {
                              dotColor = "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]";
                            }
                          }
                          return (
                            <span 
                              key={idx} 
                              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${dotColor}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-white/40 shrink-0">
                    PTS{" "}
                    {editBudget ? (
                      <BudgetEditor teamId={t.id} value={t.currentBudget} onSet={editBudget} />
                    ) : (
                      <span className="text-white font-mono text-xs ml-0.5">{t.currentBudget}</span>
                    )}
                  </div>
                </div>

                {/* Remaining Budget Progress Bar */}
                <div className="mt-2.5 mb-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 50 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                      pct > 20 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                      "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                
                {t.roster && t.roster.length > 0 ? (
                  <div className="space-y-1.5 border-t border-white/[0.04] pt-2">
                    {t.roster.map((p: any, idx: number) => {
                      const rolesVal = p.roles ? (Array.isArray(p.roles) ? p.roles.join(", ") : p.roles) : "FLEX";
                      return (
                        <div key={idx} className="flex items-center justify-between text-[11px] leading-tight select-none">
                          <div className="flex items-baseline gap-1 min-w-0">
                            <span className="font-medium text-white/95 truncate">{p.name}</span>
                            {p.rank && <span className="text-white/30 text-[9px] shrink-0">{p.rank}</span>}
                            <span className={`text-[8px] font-bold uppercase tracking-wider shrink-0 ${getRoleColor(rolesVal)}`}>
                              {rolesVal.split(",")[0]}
                            </span>
                          </div>
                          <div className="shrink-0 font-medium">
                            {p.role === "captain" ? (
                              <span className="text-[8px] uppercase tracking-widest font-extrabold text-[#5eead4] bg-[#5eead4]/10 border border-[#5eead4]/20 px-1 py-0.5 rounded">Captain</span>
                            ) : p.role === "co_captain" ? (
                              <span className="text-[8px] uppercase tracking-widest font-extrabold text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-1 py-0.5 rounded">Co-Cap</span>
                            ) : (
                              <span className="text-[#f6c177] font-mono font-semibold">{p.price}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-white/20 italic mt-1 pl-1">Empty roster</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function BidHistoryPanel({ bids }: { bids: any[] }) {
  return (
    <div className="neon-glow-card p-5 flex flex-col h-[200px] rounded-2xl">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">BID HISTORY</p>
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 select-none text-xs">
        {!bids || bids.length === 0 ? (
          <p className="text-white/20 italic">No bids yet.</p>
        ) : (
          bids.slice().reverse().map((b: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/[0.03] py-1">
              <span className="font-semibold text-white/95">{b.teamName}</span>
              <span className="text-[#10b981] font-mono font-bold">{b.amount} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RecentSalesPanel({ sales }: { sales: any[] }) {
  return (
    <div className="neon-glow-card p-5 flex flex-col h-[200px] rounded-2xl">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">RECENT SALES</p>
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 select-none text-xs">
        {!sales || sales.length === 0 ? (
          <p className="text-white/20 italic">No sales yet.</p>
        ) : (
          sales.map((s: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/[0.03] py-1">
              <span className="font-semibold text-white/95">
                {s.playerName} <span className="text-white/35 text-[10px] font-medium font-sans">to</span> {s.teamName}
              </span>
              <span className="text-[#f6c177] font-mono font-bold">{s.price} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TeamsPanel;
