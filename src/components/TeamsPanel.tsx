"use client";

import { useState, useEffect } from "react";
import { Timer } from "./Timer";

function getTeamColor(teamId: string) {
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
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = teamId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

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

const getIndividualRoleColor = (role: string) => {
  const r = role.trim().toUpperCase();
  if (r.includes("DUELIST")) return "text-[#f43f5e]";
  if (r.includes("INITIATOR")) return "text-[#8b5cf6]";
  if (r.includes("SENTINEL")) return "text-[#10b981]";
  if (r.includes("CONTROLLER")) return "text-[#06b6d4]";
  if (r.includes("FLEX")) return "text-cyan-400";
  return "text-white/40";
};

export function RenderRoles({ roles }: { roles: any }) {
  if (!roles) {
    return <span className="text-cyan-400">FLEX</span>;
  }
  const rolesArray: string[] = Array.isArray(roles)
    ? roles
    : typeof roles === "string"
      ? roles.split(",").map(r => r.trim()).filter(Boolean)
      : [];
  if (rolesArray.length === 0) {
    return <span className="text-cyan-400">FLEX</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1 select-none">
      {rolesArray.map((role, idx) => {
        const color = getIndividualRoleColor(role);
        return (
          <span key={idx} className="inline-flex items-center">
            <span className={color}>{role.toUpperCase()}</span>
            {idx < rolesArray.length - 1 && (
              <span className="text-white/25 mx-0.5 font-normal">,</span>
            )}
          </span>
        );
      })}
    </span>
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

function getRankScore(rank?: string | null): number {
  if (!rank) return 0;
  const r = rank.trim().toLowerCase();

  // CS2 Premier score (numeric string like "15200" or "23500")
  if (/^\d+$/.test(r)) {
    return parseInt(r, 10);
  }

  // CS2 Faceit Level (e.g. "Level 10", "Level 8")
  if (r.startsWith("level ")) {
    const lvl = parseInt(r.replace("level ", ""), 10);
    if (!isNaN(lvl)) return lvl * 1000;
  }

  // Valorant ranks in order
  if (r.startsWith("radiant")) return 100;
  
  if (r.startsWith("immortal")) {
    if (r.includes("3")) return 93;
    if (r.includes("2")) return 92;
    return 91;
  }

  if (r.startsWith("ascendant")) {
    if (r.includes("3")) return 83;
    if (r.includes("2")) return 82;
    return 81;
  }

  if (r.startsWith("diamond")) {
    if (r.includes("3")) return 73;
    if (r.includes("2")) return 72;
    return 71;
  }

  if (r.startsWith("platinum")) {
    if (r.includes("3")) return 63;
    if (r.includes("2")) return 62;
    return 61;
  }

  if (r.startsWith("gold")) {
    if (r.includes("3")) return 53;
    if (r.includes("2")) return 52;
    return 51;
  }

  if (r.startsWith("silver")) {
    if (r.includes("3")) return 43;
    if (r.includes("2")) return 42;
    return 41;
  }

  if (r.startsWith("bronze")) {
    if (r.includes("3")) return 33;
    if (r.includes("2")) return 32;
    return 31;
  }

  if (r.startsWith("iron")) {
    if (r.includes("3")) return 23;
    if (r.includes("2")) return 22;
    return 21;
  }

  if (r.startsWith("unranked")) return 5;

  const parsedNum = parseInt(r, 10);
  if (!isNaN(parsedNum)) {
    return parsedNum;
  }

  return 10;
}

export function PlayerPoolPanel({ players, count }: { players: any[]; count: number }) {
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = getRankScore(a.rank);
    const scoreB = getRankScore(b.rank);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div className="neon-glow-card p-5 flex flex-col h-[300px] lg:h-[350px] rounded-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">PLAYER POOL · {count}</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-none">
        {sortedPlayers.length === 0 ? (
          <p className="text-xs text-white/30 italic py-2">No players in pool.</p>
        ) : (
          sortedPlayers.map((p) => (
            <div key={p.registrationId} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.03]">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-white truncate max-w-[110px]">{p.name}</span>
                  <span className="text-white/35 text-[9px] shrink-0">{p.rank}</span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider shrink-0">
                  <RenderRoles roles={p.roles} />
                </span>
              </div>
              <div className="text-[10px] text-white/40 shrink-0 font-medium tracking-wide self-center">
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
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = getRankScore(a.rank);
    const scoreB = getRankScore(b.rank);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div className="neon-glow-card p-5 flex flex-col h-[300px] lg:h-[350px] rounded-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">UNSOLD · {count}</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-none">
        {sortedPlayers.length === 0 ? (
          <p className="text-[10px] text-white/30 py-4 text-center">
            Return in pass 2 after the pool finishes. None yet.
          </p>
        ) : (
          sortedPlayers.map((p) => (
            <div key={p.registrationId} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.03]">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-white truncate max-w-[110px]">{p.name}</span>
                  <span className="text-white/35 text-[9px] shrink-0">{p.rank}</span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider shrink-0">
                  <RenderRoles roles={p.roles} />
                </span>
              </div>
              <div className="text-[10px] text-white/40 shrink-0 font-medium tracking-wide self-center">
                FLOOR <span className="text-[#f6c177] font-mono ml-0.5">{p.floor}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TeamsPanel({
  teams,
  highlightId,
  editBudget,
  heightClass = "h-[300px] lg:h-[350px]"
}: {
  teams: any[];
  highlightId?: string;
  editBudget?: (teamId: string, budget: number) => void;
  heightClass?: string;
}) {
  const [collapsedTeamIds, setCollapsedTeamIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // On mount, if screen width is mobile/tablet (< 1280), collapse all by default except the highlighted team.
    // On desktop, keep all expanded by default.
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      const initialCollapsed: Record<string, boolean> = {};
      teams.forEach((t) => {
        if (t.id !== highlightId) {
          initialCollapsed[t.id] = true;
        }
      });
      setCollapsedTeamIds(initialCollapsed);
    }
  }, [teams, highlightId]);

  useEffect(() => {
    if (highlightId) {
      setCollapsedTeamIds((prev) => ({ ...prev, [highlightId]: false }));
    }
  }, [highlightId]);

  return (
    <div className={`neon-glow-card p-5 flex flex-col ${heightClass} rounded-2xl`}>
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">TEAMS</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {teams.length === 0 ? (
          <p className="text-xs text-white/30 italic py-2">No teams registered.</p>
        ) : (
          <div className={`grid grid-cols-1 ${teams.length > 5 ? "xl:grid-cols-2" : "grid-cols-1"} gap-3 pb-1 items-start`}>
            {teams.map((t) => {
              const isHighlight = t.id === highlightId;
              const isExpanded = !(collapsedTeamIds[t.id] ?? false);
              const spent = t.roster?.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0) || 0;
              const total = Math.max(t.currentBudget + spent, 150);
              const pct = total > 0 ? (t.currentBudget / total) * 100 : 0;
              const teamColor = t.color || getTeamColor(t.id);

              return (
                <div
                  key={t.id}
                  onClick={() => setCollapsedTeamIds((prev) => ({ ...prev, [t.id]: isExpanded }))}
                  className={`rounded-xl border p-3 transition duration-200 cursor-pointer select-none hover:bg-white/[0.02] ${
                    isHighlight 
                      ? "border-cyan-500/40 bg-cyan-950/[0.12] hover:bg-cyan-950/[0.16]" 
                      : "border-white/[0.06] bg-white/[0.01]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Name + chevron: min-w-0 allows truncation */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-display text-[13px] font-bold text-white truncate block min-w-0">
                        {t.name}
                      </span>
                      <span className="text-[9px] text-white/30 font-sans tracking-normal font-normal shrink-0">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                    {/* Dots + PTS: always shrink-0 so they never get pushed */}
                    <div className="flex items-center gap-2 shrink-0">
                      {typeof t.rosterCount === "number" && typeof t.rosterSize === "number" && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-semibold tabular-nums text-white/35 mr-0.5">
                            {t.rosterCount}/{t.rosterSize}
                          </span>
                          {Array.from({ length: t.rosterSize || 5 }).map((_, idx) => {
                            const isFilled = idx < (t.roster?.length || 0);
                            const dotStyle = isFilled
                              ? { backgroundColor: teamColor, boxShadow: `0 0 5px ${teamColor}` }
                              : {};
                            const dotColor = isFilled
                              ? ""
                              : "bg-white/10 border border-white/20";
                            return (
                              <span
                                key={idx}
                                className={`h-1.5 w-1.5 rounded-full shrink-0 transition-all duration-300 ${dotColor}`}
                                style={dotStyle}
                              />
                            );
                          })}
                        </div>
                      )}
                      <div className="text-[10px] font-bold tracking-wider text-white/40 shrink-0" onClick={(e) => e.stopPropagation()}>
                        PTS{" "}
                        {editBudget ? (
                          <BudgetEditor teamId={t.id} value={t.currentBudget} onSet={editBudget} />
                        ) : (
                          <span className="text-white font-mono text-xs ml-0.5">{t.currentBudget}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remaining Budget Progress Bar */}
                  <div className="mt-2.5 mb-2.5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 50 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        pct > 20 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                        "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  
                  {isExpanded && (
                    t.roster && t.roster.length > 0 ? (
                      <div className="space-y-1.5 border-t border-white/[0.04] pt-2" onClick={(e) => e.stopPropagation()}>
                        {t.roster.map((p: any, idx: number) => {
                          const rolesVal = p.roles ? (Array.isArray(p.roles) ? p.roles.join(", ") : p.roles) : "FLEX";
                          return (
                            <div key={idx} className="flex items-center justify-between text-[11px] leading-tight select-none py-1 border-b border-white/[0.02] last:border-0">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="flex items-baseline gap-1 min-w-0">
                                  <span className="font-medium text-white/95 truncate max-w-[120px]">{p.name}</span>
                                  {p.rank && <span className="text-white/30 text-[9px] shrink-0">{p.rank}</span>}
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5 shrink-0">
                                  <RenderRoles roles={p.roles} />
                                </span>
                              </div>
                              <div className="shrink-0 font-medium self-center">
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
                      <p className="text-[10px] text-white/20 italic mt-1 pl-1" onClick={(e) => e.stopPropagation()}>Empty roster</p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function BidHistoryPanel({ bids }: { bids: any[] }) {
  return (
    <div className="neon-glow-card p-4 flex flex-col h-[200px] lg:h-[390px] rounded-2xl">
      <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">BID HISTORY</p>
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 select-none text-[11px] leading-snug">
        {!bids || bids.length === 0 ? (
          <p className="text-white/20 italic">No bids yet.</p>
        ) : (
          bids.slice().reverse().map((b: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/[0.03] py-1 gap-1">
              <span className="font-semibold text-white/95 truncate">{b.teamName}</span>
              <span className="text-[#10b981] font-mono font-bold shrink-0">{b.amount} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RecentSalesPanel({ sales, heightClass = "h-[200px] lg:h-[390px]" }: { sales: any[]; heightClass?: string }) {
  return (
    <div className={`neon-glow-card p-4 flex flex-col ${heightClass} rounded-2xl`}>
      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">RECENT SALES</p>
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 select-none text-[11px] leading-snug">
        {!sales || sales.length === 0 ? (
          <p className="text-white/20 italic">No sales yet.</p>
        ) : (
          sales.map((s: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/[0.03] py-0.5 gap-1">
              <span className="font-semibold text-white/95 truncate">
                {s.playerName} <span className="text-white/35 font-medium">➔</span> {s.teamName}
              </span>
              <span className="text-[#f6c177] font-mono font-bold shrink-0">{s.price} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TimerPanel({
  timerEndsAt,
  clockOffset,
  defaultSeconds = 15,
}: {
  timerEndsAt?: string | null;
  clockOffset?: number;
  defaultSeconds?: number;
}) {
  return (
    <div className="neon-glow-card p-4 flex flex-col items-center justify-center rounded-2xl text-center select-none min-h-[90px]">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Time left</p>
      <Timer endsAt={timerEndsAt} clockOffset={clockOffset} defaultSeconds={defaultSeconds} size="text-4xl sm:text-5xl font-extrabold tracking-tight" />
    </div>
  );
}

export default TeamsPanel;
