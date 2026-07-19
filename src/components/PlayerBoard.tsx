"use client";

import { useState } from "react";

const STATUS: Record<string, { label: string; color: string }> = {
  pool: { label: "Pool", color: "rgba(255, 255, 255, 0.5)" },
  on_auction: { label: "On block", color: "var(--color-bio)" },
  sold: { label: "Sold", color: "var(--color-brand)" },
  unsold: { label: "Unsold", color: "var(--color-gold)" },
};

const GHOST = "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/80 transition hover:border-white/20 disabled:opacity-25";
const PRIMARY = "cta rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition hover:brightness-110 disabled:opacity-40";

function SellForm({
  p,
  teams,
  onSell,
  onDone,
}: {
  p: any;
  teams: any[];
  onSell: (regId: string, teamId: string, price: number) => Promise<{ error?: string }>;
  onDone: () => void;
}) {
  const [teamId, setTeamId] = useState("");
  const [price, setPrice] = useState<number>(p.floor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === teamId);
  const isOverfull = !!selectedTeam && selectedTeam.openSlots <= 0;

  const sell = async () => {
    if (!teamId) return setErr("Pick a team");
    setBusy(true);
    setErr(null);
    const r = await onSell(p.registrationId, teamId, price);
    setBusy(false);
    if (r?.error) setErr(r.error);
    else onDone();
  };

  return (
    <tr className="border-t border-white/[0.05] bg-white/[0.015]">
      <td colSpan={5} className="py-4 px-3">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-cyan-400/80 mb-2">Select Target Team:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {teams.map((t) => {
                const isSelected = teamId === t.id;
                const overBudget = t.currentBudget < price;
                const full = t.openSlots <= 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={overBudget}
                    onClick={() => setTeamId(t.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20"
                        : overBudget
                          ? "border-white/[0.03] bg-white/[0.01] opacity-40 cursor-not-allowed"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-xs font-semibold text-white truncate w-full">{t.name}</span>
                    <span className={`text-[10px] font-mono mt-1 ${overBudget ? "text-red-400 font-bold" : "text-white/45"}`}>
                      {overBudget ? "Over limit" : `${t.currentBudget} pts`}
                    </span>
                    {full && !overBudget ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-amber-400 mt-0.5">Roster full</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {isOverfull ? (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300">
              {selectedTeam.name} is already at its roster size ({selectedTeam.rosterCount}/{selectedTeam.rosterSize}). You can still sell — this adds an extra player past the normal cap.
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/45">Price:</span>
              <input
                type="number"
                min={0}
                value={price === 0 ? "" : price}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value;
                  setPrice(val === "" ? 0 : Number(val));
                }}
                className="w-20 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm tabular-nums text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              <button className={PRIMARY} disabled={!teamId || busy} onClick={sell}>
                {isOverfull ? "Sell anyway (full)" : "Confirm sell"}
              </button>
              <button className={GHOST} disabled={busy} onClick={onDone}>Cancel</button>
            </div>
          </div>
          {err && <div className="text-[10px] text-magenta font-semibold mt-1">{err}</div>}
        </div>
      </td>
    </tr>
  );
}

function MobileSellForm({
  p,
  teams,
  onSell,
  onDone,
}: {
  p: any;
  teams: any[];
  onSell: (regId: string, teamId: string, price: number) => Promise<{ error?: string }>;
  onDone: () => void;
}) {
  const [teamId, setTeamId] = useState("");
  const [price, setPrice] = useState<number>(p.floor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === teamId);
  const isOverfull = !!selectedTeam && selectedTeam.openSlots <= 0;

  const sell = async () => {
    if (!teamId) return setErr("Pick a team");
    setBusy(true);
    setErr(null);
    const r = await onSell(p.registrationId, teamId, price);
    setBusy(false);
    if (r?.error) setErr(r.error);
    else onDone();
  };

  return (
    <div className="space-y-3 bg-white/[0.015] p-3 rounded-lg border border-white/[0.04]">
      <div>
        <p className="text-[9px] uppercase font-bold tracking-wider text-cyan-400/80 mb-1.5">Select Team:</p>
        <div className="grid grid-cols-2 gap-2">
          {teams.map((t) => {
            const isSelected = teamId === t.id;
            const overBudget = t.currentBudget < price;
            const full = t.openSlots <= 0;
            return (
              <button
                key={t.id}
                type="button"
                disabled={overBudget}
                onClick={() => setTeamId(t.id)}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20"
                    : overBudget
                      ? "border-white/[0.03] bg-white/[0.01] opacity-40 cursor-not-allowed"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-[11px] font-semibold text-white truncate w-full">{t.name}</span>
                <span className="text-[9px] font-mono mt-0.5 text-white/45">{t.currentBudget} pts</span>
                {full && !overBudget ? (
                  <span className="text-[8px] font-bold uppercase tracking-wide text-amber-400 mt-0.5">Roster full</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {isOverfull ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1.5 text-[10px] text-amber-300">
          {selectedTeam.name} is already full ({selectedTeam.rosterCount}/{selectedTeam.rosterSize}). Selling still works — adds an extra player.
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-white/40">Price:</span>
          <input
            type="number"
            min={0}
            value={price === 0 ? "" : price}
            placeholder="0"
            onChange={(e) => {
              const val = e.target.value;
              setPrice(val === "" ? 0 : Number(val));
            }}
            className="w-16 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-center text-sm font-mono text-white focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          <button className={PRIMARY} disabled={!teamId || busy} onClick={sell}>
            {isOverfull ? "Sell anyway" : "Confirm"}
          </button>
          <button className={GHOST} disabled={busy} onClick={onDone}>Cancel</button>
        </div>
      </div>
      {err && <div className="text-[10px] text-magenta font-semibold mt-1">{err}</div>}
    </div>
  );
}

function MobilePlayerCard({
  p,
  teams,
  onSetFloor,
  onSell,
  onUnsell,
}: {
  p: any;
  teams: any[];
  onSetFloor: (regId: string, floor: number) => Promise<{ error?: string }>;
  onSell: (regId: string, teamId: string, price: number) => Promise<{ error?: string }>;
  onUnsell: (regId: string) => void;
}) {
  const [floor, setFloor] = useState<number>(p.floor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const s = STATUS[p.status] ?? STATUS.pool;
  const editable = p.status === "pool" || p.status === "unsold";
  const dirty = floor !== p.floor;

  const save = async () => {
    setBusy(true);
    setErr(null);
    const r = await onSetFloor(p.registrationId, floor);
    if (r?.error) setErr(r.error);
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div>
          <span className="font-semibold text-white text-base leading-tight block">{p.name}</span>
          {p.rank && <span className="text-xs text-white/35 font-medium mt-0.5 block">{p.rank}</span>}
        </div>
        <span 
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.01]" 
          style={{ color: s.color, backgroundColor: `${s.color}08`, borderColor: `${s.color}15` }}
        >
          {s.label}
        </span>
      </div>

      {/* Row details */}
      <div className="flex items-center justify-between text-xs border-t border-b border-white/[0.04] py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-white/40">Floor:</span>
          {editable ? (
            <input
              type="number"
              min={0}
              value={floor === 0 ? "" : floor}
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value;
                setFloor(val === "" ? 0 : Number(val));
              }}
              className="w-14 rounded-lg border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-right font-mono tabular-nums text-white focus:border-brand focus:outline-none"
            />
          ) : (
            <span className="font-mono text-white/65">{p.floor}</span>
          )}
          {editable && dirty && (
            <button onClick={save} disabled={busy} className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold transition">
              Save
            </button>
          )}
        </div>

        <div>
          {p.status === "sold" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white/40 text-[11px]">
                Sold: <span className="text-gold font-mono font-bold">{p.soldPrice}</span> to <span className="text-white font-semibold">{p.teamName}</span>
              </span>
              <button
                onClick={() => onUnsell(p.registrationId)}
                className="bg-magenta/10 border border-magenta/20 hover:bg-magenta/20 text-magenta px-2 py-0.5 rounded text-[10px] uppercase font-bold transition"
              >
                Unsell
              </button>
            </div>
          ) : (
            editable && (
              <button
                onClick={() => setSelling((prev) => !prev)}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3 py-1 rounded text-[10px] uppercase font-bold transition"
              >
                {selling ? "Cancel" : "Sell"}
              </button>
            )
          )}
        </div>
      </div>

      {err && <div className="text-xs text-magenta font-semibold mt-1">{err}</div>}

      {/* Mobile Sell Form */}
      {selling && (
        <div className="border-t border-white/[0.05] pt-3">
          <MobileSellForm
            p={p}
            teams={teams}
            onSell={onSell}
            onDone={() => setSelling(false)}
          />
        </div>
      )}
    </div>
  );
}

function Row({
  p,
  teams,
  onSetFloor,
  onSell,
  onUnsell,
  selling,
  onToggleSell,
}: {
  p: any;
  teams: any[];
  onSetFloor: (regId: string, floor: number) => Promise<{ error?: string }>;
  onSell: (regId: string, teamId: string, price: number) => Promise<{ error?: string }>;
  onUnsell: (regId: string) => void;
  selling: boolean;
  onToggleSell: () => void;
}) {
  const [floor, setFloor] = useState<number>(p.floor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = STATUS[p.status] ?? STATUS.pool;
  const editable = p.status === "pool" || p.status === "unsold";
  const dirty = floor !== p.floor;

  const save = async () => {
    setBusy(true);
    setErr(null);
    const r = await onSetFloor(p.registrationId, floor);
    if (r?.error) setErr(r.error);
    setBusy(false);
  };

  return (
    <>
      <tr className="border-t border-white/[0.05] hover:bg-white/[0.01] transition-colors">
        <td className="py-3 pr-3">
          <span className="text-sm font-semibold text-white/90">{p.name}</span>
          {p.rank && <span className="ml-2 text-[11px] text-white/35">{p.rank}</span>}
        </td>
        <td className="py-3 pr-3">
          <span 
            className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded border" 
            style={{ color: s.color, backgroundColor: `${s.color}05`, borderColor: `${s.color}15` }}
          >
            {s.label}
          </span>
        </td>
        <td className="py-3 pr-3 text-right">
          {editable ? (
            <input
              type="number"
              min={0}
              value={floor === 0 ? "" : floor}
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value;
                setFloor(val === "" ? 0 : Number(val));
              }}
              onKeyDown={(e) => e.key === "Enter" && dirty && save()}
              className="w-16 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-right text-sm font-mono tabular-nums text-white focus:border-brand focus:outline-none"
            />
          ) : (
            <span className="text-sm font-mono tabular-nums text-white/50">{p.floor}</span>
          )}
        </td>
        <td className="py-3 pr-3 text-right">
          {p.status === "sold" ? (
            <span className="text-sm tabular-nums text-gold font-semibold">{p.soldPrice} <span className="text-white/30 text-xs font-normal">· {p.teamName}</span></span>
          ) : (
            <span className="text-white/20">—</span>
          )}
        </td>
        <td className="py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {editable && (
              <button onClick={save} disabled={!dirty || busy} className={GHOST}>Save</button>
            )}
            {editable && (
              <button onClick={onToggleSell} className={GHOST}>{selling ? "Close" : "Sell"}</button>
            )}
            {p.status === "sold" && (
              <button onClick={() => onUnsell(p.registrationId)} className={GHOST}>Unsell</button>
            )}
          </div>
          {err && <div className="mt-1 text-[11px] text-magenta">{err}</div>}
        </td>
      </tr>
      {selling && <SellForm p={p} teams={teams} onSell={onSell} onDone={onToggleSell} />}
    </>
  );
}

/** Full player dashboard: every player, status, editable floor, sold price, manual sell. */
export function PlayerBoard({
  players,
  teams,
  onSetFloor,
  onSell,
  onUnsell,
}: {
  players: any[];
  teams: any[];
  onSetFloor: (regId: string, floor: number) => Promise<{ error?: string }>;
  onSell: (regId: string, teamId: string, price: number) => Promise<{ error?: string }>;
  onUnsell: (regId: string) => void;
}) {
  const rows = players ?? [];
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pool" | "unsold" | "sold">("all");

  const filteredRows = rows.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (p.rank && p.rank.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === "all") return nameMatch;
    return nameMatch && p.status === statusFilter;
  });

  return (
    <div className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Player Board</p>
        <span className="text-[11px] text-white/35 font-mono">{filteredRows.length} shown</span>
      </div>
      <p className="mb-3.5 text-[11px] text-white/30">Edit floor prices, or sell any pool/unsold player directly to a captain.</p>

      {/* Search and Filters Bar */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/30 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#0b1120]/45 text-xs text-white placeholder-white/30 focus:border-cyan-500/40 focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Status Filters */}
        <div className="flex rounded-lg border border-white/[0.08] bg-[#0b1120]/25 p-1 self-start sm:self-auto gap-0.5">
          {(["all", "pool", "unsold", "sold"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
                statusFilter === filter 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                  : "text-white/45 border border-transparent hover:text-white/70"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/30">No players seeded.</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-white/30 py-4 text-center italic">No players match the criteria.</p>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block h-[35rem] overflow-y-auto pr-1">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-white/35">
                  <th className="pb-2.5 pr-3 font-medium">Player</th>
                  <th className="pb-2.5 pr-3 font-medium">Status</th>
                  <th className="pb-2.5 pr-3 text-right font-medium">Floor</th>
                  <th className="pb-2.5 pr-3 text-right font-medium">Sold</th>
                  <th className="pb-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((p) => (
                  <Row
                    key={p.registrationId}
                    p={p}
                    teams={teams}
                    onSetFloor={onSetFloor}
                    onSell={onSell}
                    onUnsell={onUnsell}
                    selling={sellingId === p.registrationId}
                    onToggleSell={() => setSellingId((cur) => (cur === p.registrationId ? null : p.registrationId))}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden h-[35rem] overflow-y-auto space-y-3">
            {filteredRows.map((p) => (
              <MobilePlayerCard
                key={p.registrationId}
                p={p}
                teams={teams}
                onSetFloor={onSetFloor}
                onSell={onSell}
                onUnsell={onUnsell}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PlayerBoard;
