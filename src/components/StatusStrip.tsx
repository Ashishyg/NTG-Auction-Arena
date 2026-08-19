"use client";


const STATUS: Record<string, { label: string; color: string; ping?: boolean }> = {
  idle: { label: "AWAITING DRAW", color: "rgba(255, 255, 255, 0.45)" },
  showcase: { label: "SHOWCASE", color: "var(--color-bio)" },
  live: { label: "BIDDING LIVE", color: "#10b981", ping: true },
  paused: { label: "PAUSED", color: "var(--color-gold)" },
  complete: { label: "COMPLETE", color: "var(--color-brand)" },
};

export function StatusBadge({ status }: { status?: string }) {
  const s = STATUS[status ?? "idle"] ?? STATUS.idle;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] border"
      style={{ color: s.color, backgroundColor: `${s.color}15`, borderColor: `${s.color}25` } as React.CSSProperties}
    >
      {s.ping && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: s.color }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
        </span>
      )}
      {s.label}
    </span>
  );
}

export function StatusStrip({
  game,
  status,
  pass,
  counts,
  timerEndsAt,
  clockOffset,
  eyebrow = "NTG Live Auction",
  tournamentName,
  topSale,
}: {
  game?: string;
  status?: string;
  pass?: number;
  counts?: { pool?: number; sold?: number; unsold?: number };
  timerEndsAt?: string | null;
  clockOffset?: number;
  eyebrow?: string;
  tournamentName?: string;
  topSale?: { playerName?: string; teamName?: string; price?: number } | null;
}) {
  const helpText = (() => {
    switch (status) {
      case "live":
        return "Bid freely — auctioneer sells when ready";
      case "showcase":
        return "Showcasing player — awaiting bid start";
      case "paused":
        return "Auction paused by administrator";
      case "complete":
        return "Draft complete";
      default:
        return "Awaiting next player draw";
    }
  })();

  const formattedGame = game
    ? game.toLowerCase() === "cs2" ? "CS2" : game.toLowerCase() === "cs" ? "CS" : game.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Valorant";
  
  const displayTitle = tournamentName 
    ? `Auction: ${tournamentName} - ${formattedGame}`
    : `Auction: AUC CUP IV - ${formattedGame}`;

  return (
    <div className="mb-6 mt-8">
      {/* Header section */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.42em] text-white/30">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            {displayTitle}
          </h1>
        </div>
      </div>

      {/* Horizontal status capsule bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0b1120]/40 px-4 py-2 flex-wrap">
        <div className="flex items-center gap-3.5 flex-wrap">
          <StatusBadge status={status} />
          {pass ? (
            <span className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
              PASS {pass}
            </span>
          ) : null}
          <span className="text-[10px] tracking-wide text-white/45">{helpText}</span>
          {status === "live" && (
            <span className="rounded bg-[#10b981]/15 border border-[#10b981]/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#10b981] uppercase">
              REALTIME
            </span>
          )}
        </div>

        {counts && (
          <div className="flex items-center gap-5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
            <span>
              Pool <span className="text-white font-medium ml-1.5">{counts.pool ?? 0}</span>
            </span>
            <span>
              Unsold <span className="text-[#f6c177] font-medium ml-1.5">{counts.unsold ?? 0}</span>
            </span>
            <span>
              Sold <span className="text-[#10b981] font-medium ml-1.5">{counts.sold ?? 0}</span>
            </span>
          </div>
        )}
      </div>

      {topSale?.playerName && typeof topSale.price === "number" ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.10] via-[#1a1408]/40 to-transparent">
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0 flex items-start gap-3 sm:items-center">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/15 font-display text-lg font-black text-gold sm:h-12 sm:w-12 sm:text-xl"
                aria-hidden
              >
                🔥
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold/75">
                  Highest sale of the auction
                </p>
                <p
                  className="mt-0.5 truncate font-display text-xl font-black tracking-tight text-white sm:text-2xl"
                  title={topSale.playerName}
                >
                  {topSale.playerName}
                </p>
                {topSale.teamName ? (
                  <p className="mt-0.5 truncate text-[12px] text-white/45">
                    Sold to <span className="font-semibold text-white/80">{topSale.teamName}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-baseline gap-1.5 self-start rounded-xl border border-gold/25 bg-black/25 px-3.5 py-2 sm:self-center sm:px-4 sm:py-2.5">
              <span className="font-display text-3xl font-black tabular-nums leading-none text-gold sm:text-4xl">
                {topSale.price}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold/55">pts</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StatusStrip;
