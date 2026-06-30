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
  const [amount, setAmount] = useState<number>(nextBid);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const live = state?.status === "live";
  const isTop = state?.highestBidder === myTeamId;

  const submit = async (value: number) => {
    setPending(true);
    setMsg(null);
    const res = await onBid(value);
    if (res.error) setMsg(res.error);
    else setAmount(value + (state?.settings?.minBidIncrement ?? 1));
    setPending(false);
  };

  if (!team) {
    return <div className="glass p-6 text-white/40 text-sm">You are not bidding in this auction.</div>;
  }

  return (
    <div className="glass p-6">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Your Bid</p>
      <div className="flex justify-between text-sm">
        <span className="text-white/45">Budget</span>
        <span className="text-white/80 tabular-nums">{team.currentBudget}</span>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <span className="text-white/45">Safe max</span>
        <span className="text-brand tabular-nums">{team.safeMax}</span>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <span className="text-white/45">Open slots</span>
        <span className="text-white/80 tabular-nums">{team.openSlots}</span>
      </div>

      <div className="mt-5 flex gap-2">
        <input
          type="number"
          value={amount}
          min={nextBid}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-full bg-white/[0.04] border border-white/[0.07] px-4 py-2 text-white tabular-nums focus:outline-none focus:border-brand"
        />
        <button
          onClick={() => submit(amount)}
          disabled={!live || pending || isTop || team.openSlots <= 0}
          className="cta px-6 py-2 whitespace-nowrap"
        >
          {isTop ? "Top bid" : `Bid`}
        </button>
      </div>
      <button
        onClick={() => submit(nextBid)}
        disabled={!live || pending || isTop || team.openSlots <= 0}
        className="mt-2 w-full rounded-full border border-white/[0.07] py-2 text-sm text-white/70 hover:border-white/15 disabled:opacity-40"
      >
        Quick bid {nextBid}
      </button>
      {msg && <p className="mt-3 text-sm text-magenta">{msg}</p>}
    </div>
  );
}

export default BidPanel;
