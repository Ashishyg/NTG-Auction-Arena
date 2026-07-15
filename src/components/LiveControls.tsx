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
    <div className="neon-glow-card p-4 sm:p-5 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 shrink-0 select-none">
          Round Controls
        </span>

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
      </div>

      {msg && <p className="mt-3 text-sm text-magenta">{msg}</p>}
    </div>
  );
}

export default LiveControls;
