"use client";

import { useState } from "react";

/** Draw / Start / Pause / Resume / Hammer / Undo, gated by auction status. */
export function AuctioneerControls({ state, actions }: { state: any; actions: any }) {
  const [msg, setMsg] = useState<string | null>(null);
  const status = state?.status;

  const run = (fn: () => Promise<{ error?: string }>) => async () => {
    setMsg(null);
    const r = await fn();
    if (r?.error) setMsg(r.error);
  };

  const Btn = ({ on, onClick, children, primary }: any) => (
    <button
      onClick={onClick}
      disabled={!on}
      className={
        primary
          ? "cta px-5 py-2.5 disabled:opacity-40"
          : "rounded-full border border-white/[0.07] px-5 py-2.5 text-sm text-white/80 hover:border-white/15 disabled:opacity-30"
      }
    >
      {children}
    </button>
  );

  return (
    <div className="glass p-5">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Auctioneer Controls</p>
      <div className="flex flex-wrap gap-2">
        <Btn on={status === "idle"} primary onClick={run(() => actions.selectPlayer(state?.pass ?? 1))}>
          Draw player
        </Btn>
        <Btn on={status === "showcase"} primary onClick={run(actions.startAuction)}>
          Start
        </Btn>
        <Btn on={status === "live"} onClick={run(actions.pause)}>
          Pause
        </Btn>
        <Btn on={status === "paused"} onClick={run(actions.resume)}>
          Resume
        </Btn>
        <Btn on={status === "live"} onClick={run(actions.hammer)}>
          Hammer
        </Btn>
        <Btn on={status === "idle"} onClick={run(actions.undoLastSale)}>
          Undo last sale
        </Btn>
      </div>
      <div className="mt-3 flex gap-2">
        <Btn on={status === "idle"} onClick={run(() => actions.selectPlayer(2))}>
          Draw unsold (pass 2)
        </Btn>
        <Btn on={status === "idle"} onClick={run(actions.publishResults)}>
          Publish to main site
        </Btn>
      </div>
      {msg && <p className="mt-3 text-sm text-magenta">{msg}</p>}
    </div>
  );
}

export default AuctioneerControls;
