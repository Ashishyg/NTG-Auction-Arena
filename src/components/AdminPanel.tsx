"use client";

import { useState } from "react";

/** Auctioneer-only overrides: timer, manual price/rate fixing, manual sell, settings. */
export function AdminPanel({ state, actions }: { state: any; actions: any }) {
  const [msg, setMsg] = useState<string | null>(null);
  const onBlock = ["showcase", "live", "paused"].includes(state?.status);

  const [ts, setTs] = useState<number>(state?.settings?.timerSeconds ?? 15);
  const [inc, setInc] = useState<number>(state?.settings?.minBidIncrement ?? 1);
  const [rs, setRs] = useState<number>(state?.settings?.rosterSize ?? 3);
  const [price, setPrice] = useState<number>(state?.currentPrice ?? 0);
  const [sellTeam, setSellTeam] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<number>(state?.currentPrice ?? 0);

  const act = (fn: () => Promise<{ error?: string }>) => async () => {
    setMsg(null);
    const r = await fn();
    setMsg(r?.error ?? "✓ done");
  };

  const field =
    "w-20 rounded-lg bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 text-sm text-white tabular-nums focus:outline-none focus:border-brand";
  const ghost =
    "rounded-full border border-white/[0.07] px-3 py-1.5 text-xs text-white/80 hover:border-white/15 disabled:opacity-30";

  return (
    <details className="glass p-5 [&_summary]:cursor-pointer">
      <summary className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
        <span>Admin Overrides</span>
        <span className="text-white/25">tap to expand</span>
      </summary>

      <div className="mt-5 space-y-5">
        {/* Settings */}
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Settings</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-white/60">
              Timer (s)
              <input type="number" value={ts} min={3} max={600} onChange={(e) => setTs(+e.target.value)} className={`${field} block mt-1`} />
            </label>
            <label className="text-xs text-white/60">
              Min inc.
              <input type="number" value={inc} min={1} onChange={(e) => setInc(+e.target.value)} className={`${field} block mt-1`} />
            </label>
            <label className="text-xs text-white/60">
              Roster
              <input type="number" value={rs} min={1} max={20} onChange={(e) => setRs(+e.target.value)} className={`${field} block mt-1`} />
            </label>
            <button
              className="cta px-4 py-2 text-sm"
              onClick={act(() => actions.updateSettings({ timerSeconds: ts, minBidIncrement: inc, rosterSize: rs }))}
            >
              Save
            </button>
          </div>
        </section>

        {/* Live timer */}
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Live timer</p>
          <div className="flex flex-wrap gap-2">
            <button className={ghost} disabled={state?.status !== "live"} onClick={act(() => actions.addTime(5000))}>+5s</button>
            <button className={ghost} disabled={state?.status !== "live"} onClick={act(() => actions.addTime(10000))}>+10s</button>
            <button className={ghost} disabled={state?.status !== "live"} onClick={act(() => actions.addTime(-5000))}>−5s</button>
          </div>
        </section>

        {/* Rate fixing */}
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Fix asking price</p>
          <div className="flex items-center gap-2">
            <input type="number" value={price} min={0} onChange={(e) => setPrice(+e.target.value)} className={field} />
            <button className={ghost} disabled={!onBlock} onClick={act(() => actions.setPrice(price))}>Set price</button>
          </div>
        </section>

        {/* Manual sell */}
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Manual sell current player</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sellTeam}
              onChange={(e) => setSellTeam(e.target.value)}
              className="rounded-lg bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand"
            >
              <option value="">Select team…</option>
              {(state?.teams ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.currentBudget})</option>
              ))}
            </select>
            <input type="number" value={sellPrice} min={0} onChange={(e) => setSellPrice(+e.target.value)} className={field} />
            <button
              className="cta px-4 py-2 text-sm"
              disabled={!onBlock || !sellTeam}
              onClick={act(() => actions.manualSell(sellTeam, sellPrice))}
            >
              Sell
            </button>
          </div>
        </section>

        {msg && <p className={`text-sm ${msg.startsWith("✓") ? "text-brand" : "text-magenta"}`}>{msg}</p>}
      </div>
    </details>
  );
}

export default AdminPanel;
