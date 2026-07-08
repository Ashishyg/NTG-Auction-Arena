"use client";

/** Game-aware player spotlight matching the premium esports dashboard screenshot */
export function PlayerCard({
  player,
  game,
  price,
  highestBidderName,
  status,
}: {
  player: any;
  game: string;
  price?: number;
  highestBidderName?: string | null;
  status?: string;
}) {
  if (!player) {
    return (
      <div className="panel grid min-h-[19rem] place-items-center p-10 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.06] text-2xl">🎯</div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">No player on the block</p>
          <p className="mt-2 text-sm text-white/30">Draw a player to begin.</p>
        </div>
      </div>
    );
  }

  const live = status === "live";
  const rank = player.snapshotRankTier || player.snapshotCs2PeakPremier || "Unranked";
  
  // Format roles properly
  const rawRoles = player.snapshotValorantRoles || player.roles;
  const roles = Array.isArray(rawRoles) 
    ? rawRoles.join(", ") 
    : (rawRoles || "FLEX");

  const cardUrl = player.card_url || (game === "VALORANT" ? "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png" : null);

  return (
    <div className={`overflow-hidden rounded-[1.35rem] border bg-white/[0.035] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)] p-6 transition-all duration-300 ${live ? "border-cyan-500/30 ring-1 ring-cyan-500/10" : "border-white/[0.08]"}`}>
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
        
        {/* Left Vertical Player Card (Valorant/Esports Style) */}
        <div 
          className="relative w-full shrink-0 overflow-hidden rounded-[1.25rem] border border-cyan-500/20 px-4 py-8 md:w-44 flex flex-col justify-between items-center min-h-[260px] shadow-lg"
          style={cardUrl ? { 
            backgroundImage: `url(${cardUrl})`, 
            backgroundSize: "cover", 
            backgroundPosition: "center" 
          } : { 
            background: "linear-gradient(to top, #05111a, rgba(9, 21, 34, 0.9), #122838)",
            boxShadow: "inset 0 0 24px rgba(34, 211, 238, 0.15)"
          }}
        >
          {cardUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#05111a] via-[#091522]/30 to-[#05111a]/20 z-0" />
          )}

          {/* Subtle Role Eyebrow on card */}
          <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#5eead4]/80 z-10">
            {roles.split(",")[0]}
          </div>

          {/* Centered Question Mark Circle Icon */}
          <div className="my-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)] z-10">
            <span className="font-display text-xs font-bold text-white/70">?</span>
          </div>

          {/* Bottom Card Text (Sleek dark banner overlay from screenshot) */}
          <div className="w-full text-center z-10 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl py-2.5 px-2">
            <h3 className="truncate font-display text-[13px] font-bold tracking-tight text-white leading-tight">
              {player.name}
            </h3>
            <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-[0.2em] text-[#5eead4] leading-none">
              {roles.split(",")[0] || "FLEX"}
            </p>
          </div>
        </div>

        {/* Right Details Column */}
        <div className="flex flex-1 flex-col justify-between py-1.5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#5eead4]">
              ON THE BLOCK
            </p>
            <h2 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-white">
              {player.name}
            </h2>
            <p className="mt-1 text-[13px] text-white/40 font-medium">
              {rank} <span className="text-white/25">·</span> <span className="text-[#5eead4]/80">{roles}</span>
            </p>
          </div>

          {/* Side-by-side rectangular bid panels */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* CURRENT BID Box */}
            <div className={`rounded-xl border px-5 py-4 shadow-sm flex flex-col justify-center transition-all duration-300 ${
              live 
                ? "border-cyan-500/30 bg-[#091724]/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]" 
                : "border-white/[0.06] bg-[#0b1120]/30"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                CURRENT BID
              </span>
              <span className="mt-1.5 font-display text-4xl font-black text-white leading-none tabular-nums">
                {price ?? 0}
              </span>
            </div>

            {/* HIGHEST BIDDER Box */}
            <div className={`rounded-xl border px-5 py-4 shadow-sm flex flex-col justify-center min-w-0 transition-all duration-300 ${
              highestBidderName 
                ? "border-emerald-500/20 bg-[#09241b]/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
                : "border-white/[0.06] bg-[#0b1120]/30"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                HIGHEST BIDDER
              </span>
              <span className="mt-1.5 truncate font-display text-base font-bold text-white leading-tight">
                {highestBidderName || "—"}
              </span>
              <span className={`mt-1 text-[10px] font-semibold tracking-wide ${highestBidderName ? "text-[#10b981]" : "text-white/30"}`}>
                {highestBidderName ? `Leading at ${price} pts` : "Awaiting first bid"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default PlayerCard;
