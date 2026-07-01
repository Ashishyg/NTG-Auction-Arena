"use client";

import { useState } from "react";

const PRIMARY = "cta rounded-full px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:brightness-110 disabled:opacity-40";
const GHOST = "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-30";

/** Round-flow controls: draw → start → hammer/pause, plus live time adjustments. */
export function LiveControls({ state, actions }: { state: any; actions: any }) {
  const [msg, setMsg] = useState<string | null>(null);
  const status = state?.status;

  const act = (fn: () => Promise<{ error?: string }>) => async () => {
    setMsg(null);
    const r = await fn();
    if (r?.error) setMsg(r.error);
  };

  return (
    <div className="panel p-5">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Round Controls</p>

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

      {msg && <p className="mt-3 text-sm text-magenta">{msg}</p>}
    </div>
  );
}

export default LiveControls;
