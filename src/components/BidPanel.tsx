"use client";

import { useState } from "react";

/** Captain bid input. Shows safe-max and the next legal bid; forwards to onBid. */
export function BidPanel({
  state,
  myTeamId,
  onBid,
}: {
  state: any;
  myTeamId?: string;
  onBid: (amount: number) => Promise<{ ok?: boolean; error?: string }>;
}) {
  const team = state?.teams?.find((t: any) => t.id === myTeamId);
  const nextBid = (state?.currentPrice ?? 0) + (state?.settings?.minBidIncrement ?? 1);
  const [customBid, setCustomBid] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const live = state?.status === "live";
  const isTop = state?.highestBidder === myTeamId;
  const blocked = !live || pending || isTop || (team?.openSlots ?? 0) <= 0;

  const submit = async (value: number) => {
    setPending(true);
    setMsg(null);
    const res = await onBid(value);
    if (res.error) setMsg(res.error);
    setPending(false);
  };

  const handleCustomSubmit = () => {
    const val = Number(customBid);
    if (!isNaN(val) && val >= nextBid) {
      submit(val);
      setCustomBid("");
    }
  };

  if (!team) return <div className="panel p-6 text-sm text-white/40">You are not bidding in this auction.</div>;

  return (
    <div className="panel p-5 bg-white/[0.025] border-white/[0.08] shadow-md">
      {/* Roster / budget status line */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-3 px-1">
        <span>
          Points left <span className="text-white font-medium ml-1">{team.currentBudget}</span>
        </span>
        <span className="text-white/20">·</span>
        <span>
          Safe max <span className="text-white font-medium ml-1">{team.safeMax}</span>
        </span>
        <span className="text-white/20">·</span>
        <span>
          Roster <span className="text-white font-medium ml-1">{team.rosterCount}/{team.rosterSize}</span>
        </span>
      </div>

      {/* Bidding controls responsive grid/flex */}
      <div className="grid grid-cols-2 gap-3 w-full md:flex md:items-center">
        {/* Large purple/blue gradient button */}
        <button
          onClick={() => submit(nextBid)}
          disabled={blocked}
          className="col-span-2 md:flex-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:brightness-110 disabled:opacity-40 text-white font-semibold font-display uppercase tracking-[0.16em] text-[10px] h-10 rounded-full flex items-center justify-center transition shadow-[0_0_24px_rgba(99,102,241,0.2)]"
        >
          {isTop ? "TOP BID" : `BID ${nextBid}`}
        </button>

        {/* Quick add button: +4 (nextBid + 4) */}
        <button
          onClick={() => submit(nextBid + 4)}
          disabled={blocked}
          className="col-span-1 md:w-auto bg-[#0b1120]/30 hover:border-white/15 disabled:opacity-40 border border-white/[0.08] text-white/80 hover:text-white font-bold text-[10px] tracking-wide h-10 px-4 rounded-full flex items-center justify-center transition"
        >
          +4 ({nextBid + 4})
        </button>

        {/* Custom bid input box */}
        <div className="col-span-1 md:flex-1 flex items-center bg-[#0b1120]/30 border border-white/[0.08] rounded-full h-10 px-1.5 justify-between focus-within:border-cyan-500/40 transition">
          <input
            type="number"
            placeholder="Custom"
            value={customBid}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length > 1 && val.startsWith("0")) {
                setCustomBid(val.replace(/^0+/, ""));
              } else {
                setCustomBid(val);
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-white text-xs font-semibold px-3 w-full placeholder:text-white/25 placeholder:uppercase placeholder:tracking-wider placeholder:text-[9px]"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={blocked || !customBid}
            className="bg-[#0d1c25] border border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/35 text-[#5eead4] disabled:opacity-45 px-4 h-7 rounded-full text-[9px] uppercase tracking-widest font-bold flex items-center justify-center transition shrink-0"
          >
            BID
          </button>
        </div>
      </div>

      {msg && <p className="mt-3 text-xs text-magenta font-semibold tracking-wide">{msg}</p>}
    </div>
  );
}

export default BidPanel;
