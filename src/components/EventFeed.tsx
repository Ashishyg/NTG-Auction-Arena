"use client";

/** Live ticker of bid / sale events from the socket hook. */
export function EventFeed({ events }: { events: any[] }) {
  const line = (e: any) => {
    if (e.type === "bid") return <><span className="text-brand">{e.teamName}</span> bid <span className="text-gold">{e.amount}</span></>;
    if (e.type === "sold") return <><span className="text-gold">{e.playerName}</span> → <span className="text-brand">{e.teamName}</span> for {e.price}</>;
    if (e.type === "unsold") return <><span className="text-white/60">{e.playerName}</span> went unsold</>;
    return null;
  };

  return (
    <div className="panel p-5">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Live Feed</p>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {(events ?? []).length === 0 && <li className="text-sm text-white/30">Waiting for action…</li>}
        {(events ?? []).map((e) => (
          <li key={e.id} className="text-sm text-white/70">{line(e)}</li>
        ))}
      </ul>
    </div>
  );
}

export default EventFeed;
