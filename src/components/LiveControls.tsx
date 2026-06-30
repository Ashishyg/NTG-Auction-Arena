"use client";

import { useState } from "react";

const PRIMARY = "cta rounded-full px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:brightness-110 disabled:opacity-40";
const GHOST = "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-30";

/** Live-round controls: draw/start/hammer/pause + time + override sell/price. */
export function LiveControls({ state, actions }: { state: any; actions: any }) {
  const [msg, setMsg] = useState<string | null>(null);
  const status = state?.status;
  const onBlock = ["showcase", "live", "paused"].includes(status);

  const [price, setPrice] = useState<number>(state?.currentPrice ?? 0);
  const [sellTeam, setSellTeam] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<number>(state?.currentPrice ?? 0);

  const act = (fn: () => Promise<{ error?: string }>) => async () => {
    setMsg(null);
    const r = await fn();
    if (r?.error) setMsg(r.error);
  };

  return (
    <div className="panel p-5">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Live Controls</p>

      {/* Primary flow */}
      <div className="flex flex-wrap items-center gap-2">
        {status === "idle" && <button className={PRIMARY} onClick={act(() => actions.selectPlayer(state?.pass ?? 1))}>Draw Player</button>}
        {status === "showcase" && <button className={PRIMARY} onClick={act(actions.startAuction)}>Start Bidding</button>}
        {status === "live" && <button className={PRIMARY} onClick={act(actions.hammer)}>Hammer · Sell now</button>}
        {status === "paused" && <button className={PRIMARY} onClick={act(actions.resume)}>Resume</button>}

        {status === "live" && <button className={GHOST} onClick={act(actions.pause)}>Pause</button>}
        {status === "live" && <button className={GHOST} onClick={act(() => actions.addTime(5000))}>+5s</button>}
        {status === "live" && <button className={GHOST} onClick={act(() => actions.addTime(10000))}>+10s</button>}
        {status === "live" && <button className={GHOST} onClick={act(() => actions.addTime(-5000))}>−5s</button>}
        {status === "idle" && <button className={GHOST} onClick={act(() => actions.selectPlayer(2))}>Draw unsold</button>}
        {status === "idle" && <button className={GHOST} onClick={act(actions.undoLastSale)}>Undo last sale</button>}
      </div>

      {/* Overrides — only while a player is on the block */}
      {onBlock && (
        <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Override</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(+e.target.value)}
              className="w-24 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm tabular-nums text-white focus:border-brand focus:outline-none"
            />
            <button className={GHOST} onClick={act(() => actions.setPrice(price))}>Set price</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sellTeam}
              onChange={(e) => setSellTeam(e.target.value)}
              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:border-brand focus:outline-none"
            >
              <option value="">Sell to…</option>
              {(state?.teams ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.currentBudget})</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={sellPrice}
              onChange={(e) => setSellPrice(+e.target.value)}
              className="w-24 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm tabular-nums text-white focus:border-brand focus:outline-none"
            />
            <button className={GHOST} disabled={!sellTeam} onClick={act(() => actions.manualSell(sellTeam, sellPrice))}>Sell</button>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-magenta">{msg}</p>}
    </div>
  );
}

export default LiveControls;
