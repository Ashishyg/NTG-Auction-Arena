"use client";

/** Live ticker of bid / sale events from the socket hook. */
export function EventFeed({ events }: { events: any[] }) {
  const renderEvent = (e: any) => {
    if (e.type === "bid") {
      return (
        <div className="feed-item-enter flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 shadow-sm transition-all hover:bg-white/[0.04] select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_var(--color-brand)]" />
            <span className="text-xs text-white/80 truncate">
              <span className="font-semibold text-white">{e.teamName}</span> placed a bid
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-white bg-[var(--color-brand)]/10 border border-[var(--color-brand)]/20 px-2 py-0.5 rounded-full shadow-sm">
            {e.amount} pts
          </span>
        </div>
      );
    }
    if (e.type === "sold") {
      return (
        <div className="feed-item-enter flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-2.5 shadow-sm transition-all hover:bg-emerald-500/[0.06] select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-white/85 truncate font-medium">
              <span className="font-extrabold text-white">{e.playerName}</span> sold to <span className="font-semibold text-emerald-300">{e.teamName}</span>
            </span>
          </div>
          <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full shadow-sm">
            {e.price} pts
          </span>
        </div>
      );
    }
    if (e.type === "unsold") {
      return (
        <div className="feed-item-enter flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/[0.03] px-3 py-2.5 shadow-sm transition-all hover:bg-red-500/[0.06] select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
            <span className="text-xs text-white/60 truncate">
              <span className="font-semibold text-white/80">{e.playerName}</span> went unsold
            </span>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
            Passed
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="neon-glow-card p-5 rounded-2xl flex flex-col h-[280px]">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">LIVE ACTION FEED</p>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {(!events || events.length === 0) ? (
          <p className="text-white/20 italic text-xs pl-1 select-none">Waiting for action...</p>
        ) : (
          events.map((e) => (
            <div key={e.id}>
              {renderEvent(e)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EventFeed;
