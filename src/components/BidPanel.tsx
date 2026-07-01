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
  const blocked = !live || pending || isTop || (team?.openSlots ?? 0) <= 0;

  const submit = async (value: number) => {
    setPending(true);
    setMsg(null);
    const res = await onBid(value);
    if (res.error) setMsg(res.error);
    else setAmount(value + (state?.settings?.minBidIncrement ?? 1));
    setPending(false);
  };

  if (!team) return <div className="panel p-6 text-sm text-white/40">You are not bidding in this auction.</div>;

  return (
    <div className="panel p-6">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Your Bid</p>

      <div className="grid grid-cols-3 gap-2">
        {[["Budget", team.currentBudget, "text-white/85"], ["Safe max", team.safeMax, "text-brand"], ["Open slots", team.openSlots, "text-white/85"]].map(
          ([label, val, cls]) => (
            <div key={label as string} className="rounded-2xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-center">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">{label}</p>
              <p className={`mt-0.5 font-display text-lg tabular-nums ${cls}`}>{val}</p>
            </div>
          ),
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          type="number"
          value={amount}
          min={nextBid}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-full border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 tabular-nums text-white focus:border-brand focus:outline-none"
        />
        <button onClick={() => submit(amount)} disabled={blocked} className="cta whitespace-nowrap rounded-full px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition hover:brightness-110 disabled:opacity-40">
          {isTop ? "Top bid" : "Bid"}
        </button>
      </div>
      <button
        onClick={() => submit(nextBid)}
        disabled={blocked}
        className="mt-2 w-full rounded-full border border-white/10 py-2.5 text-sm text-white/70 transition hover:border-white/20 disabled:opacity-40"
      >
        Quick bid {nextBid}
      </button>
      {msg && <p className="mt-3 text-sm text-magenta">{msg}</p>}
    </div>
  );
}

export default BidPanel;
