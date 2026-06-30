"use client";

import { useState } from "react";

const PRIMARY = "cta rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:brightness-110 disabled:opacity-40";
const GHOST = "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-30";
const FIELD = "w-24 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm tabular-nums text-white focus:border-brand focus:outline-none";

/** Pre-auction config: editable settings + publish-to-main-site. */
export function SetupPanel({ state, actions }: { state: any; actions: any }) {
  const [ts, setTs] = useState<number>(state?.settings?.timerSeconds ?? 15);
  const [inc, setInc] = useState<number>(state?.settings?.minBidIncrement ?? 1);
  const [rs, setRs] = useState<number>(state?.settings?.rosterSize ?? 3);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmPub, setConfirmPub] = useState(false);

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
          <input type="number" min={3} max={600} value={ts} onChange={(e) => setTs(+e.target.value)} className={`${FIELD} mt-1 block`} />
        </label>
        <label className="text-xs text-white/55">
          Min increment
          <input type="number" min={1} value={inc} onChange={(e) => setInc(+e.target.value)} className={`${FIELD} mt-1 block`} />
        </label>
        <label className="text-xs text-white/55">
          Roster size
          <input type="number" min={1} max={20} value={rs} onChange={(e) => setRs(+e.target.value)} className={`${FIELD} mt-1 block`} />
        </label>
        <button className={PRIMARY} onClick={act(() => actions.updateSettings({ timerSeconds: ts, minBidIncrement: inc, rosterSize: rs }))}>
          Save
        </button>
      </div>

      <p className="mt-3 text-[11px] text-white/30">
        Changing roster size won&apos;t retroactively alter teams that already filled. Player floor prices are edited in the table below.
      </p>

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
