"use client";

import { useState } from "react";

const STATUS: Record<string, { label: string; color: string }> = {
  pool: { label: "Pool", color: "rgb(255 255 255 / 0.5)" },
  on_auction: { label: "On block", color: "var(--color-bio)" },
  sold: { label: "Sold", color: "var(--color-brand)" },
  unsold: { label: "Unsold", color: "var(--color-gold)" },
};

function Row({ p, onSetFloor }: { p: any; onSetFloor: (regId: string, floor: number) => Promise<{ error?: string }> }) {
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
    <tr className="border-t border-white/[0.05]">
      <td className="py-2 pr-3">
        <span className="text-sm text-white/90">{p.name}</span>
        {p.rank && <span className="ml-2 text-[11px] text-white/35">{p.rank}</span>}
      </td>
      <td className="py-2 pr-3">
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: s.color }}>{s.label}</span>
      </td>
      <td className="py-2 pr-3 text-right">
        {editable ? (
          <input
            type="number"
            min={0}
            value={floor}
            onChange={(e) => setFloor(+e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && dirty && save()}
            className="w-16 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-right text-sm tabular-nums text-white focus:border-brand focus:outline-none"
          />
        ) : (
          <span className="text-sm tabular-nums text-white/50">{p.floor}</span>
        )}
      </td>
      <td className="py-2 pr-3 text-right">
        {p.status === "sold" ? (
          <span className="text-sm tabular-nums text-gold">
            {p.soldPrice} <span className="text-white/40">· {p.teamName}</span>
          </span>
        ) : (
          <span className="text-white/20">—</span>
        )}
      </td>
      <td className="py-2 text-right">
        {editable && (
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="rounded-full border border-white/[0.07] px-3 py-1 text-xs text-white/80 hover:border-white/15 disabled:opacity-25"
          >
            Save
          </button>
        )}
        {err && <span className="ml-2 text-[11px] text-magenta">{err}</span>}
      </td>
    </tr>
  );
}

/** Full player dashboard: every player, status, editable floor, sold price. */
export function PlayerBoard({ players, onSetFloor }: { players: any[]; onSetFloor: (regId: string, floor: number) => Promise<{ error?: string }> }) {
  const rows = players ?? [];
  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Player Board</p>
        <span className="text-[11px] text-white/35">{rows.length} players</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-white/30">No players seeded.</p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-white/35">
                <th className="pb-2 pr-3 font-medium">Player</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 text-right font-medium">Floor</th>
                <th className="pb-2 pr-3 text-right font-medium">Sold</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <Row key={p.registrationId} p={p} onSetFloor={onSetFloor} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlayerBoard;
