"use client";

export function getRankIconUrl(rank: string | null | undefined): string {
  if (!rank) return "https://ntgesports.com/valorant/ranks/Unranked_Rank.png";
  const r = rank.trim().toLowerCase();
  
  if (r.startsWith("iron 1")) return "https://ntgesports.com/valorant/ranks/Iron_1_Rank.png";
  if (r.startsWith("iron 2")) return "https://ntgesports.com/valorant/ranks/Iron_2_Rank.png";
  if (r.startsWith("iron 3")) return "https://ntgesports.com/valorant/ranks/Iron_3_Rank.png";
  if (r.startsWith("iron")) return "https://ntgesports.com/valorant/ranks/Iron_1_Rank.png";

  if (r.startsWith("bronze 1")) return "https://ntgesports.com/valorant/ranks/Bronze_1_Rank.png";
  if (r.startsWith("bronze 2")) return "https://ntgesports.com/valorant/ranks/Bronze_2_Rank.png";
  if (r.startsWith("bronze 3")) return "https://ntgesports.com/valorant/ranks/Bronze_3_Rank.png";
  if (r.startsWith("bronze")) return "https://ntgesports.com/valorant/ranks/Bronze_1_Rank.png";

  if (r.startsWith("silver 1")) return "https://ntgesports.com/valorant/ranks/Silver_1_Rank.png";
  if (r.startsWith("silver 2")) return "https://ntgesports.com/valorant/ranks/Silver_2_Rank.png";
  if (r.startsWith("silver 3")) return "https://ntgesports.com/valorant/ranks/Silver_3_Rank.png";
  if (r.startsWith("silver")) return "https://ntgesports.com/valorant/ranks/Silver_1_Rank.png";

  if (r.startsWith("gold 1")) return "https://ntgesports.com/valorant/ranks/Gold_1_Rank.png";
  if (r.startsWith("gold 2")) return "https://ntgesports.com/valorant/ranks/Gold_2_Rank.png";
  if (r.startsWith("gold 3")) return "https://ntgesports.com/valorant/ranks/Gold_3_Rank.png";
  if (r.startsWith("gold")) return "https://ntgesports.com/valorant/ranks/Gold_1_Rank.png";

  if (r.startsWith("platinum 1")) return "https://ntgesports.com/valorant/ranks/Platinum_1_Rank.png";
  if (r.startsWith("platinum 2")) return "https://ntgesports.com/valorant/ranks/Platinum_2_Rank.png";
  if (r.startsWith("platinum 3")) return "https://ntgesports.com/valorant/ranks/Platinum_3_Rank.png";
  if (r.startsWith("platinum")) return "https://ntgesports.com/valorant/ranks/Platinum_1_Rank.png";

  if (r.startsWith("diamond 1")) return "https://ntgesports.com/valorant/ranks/Diamond_1_Rank.png";
  if (r.startsWith("diamond 2")) return "https://ntgesports.com/valorant/ranks/Diamond_2_Rank.png";
  if (r.startsWith("diamond 3")) return "https://ntgesports.com/valorant/ranks/Diamond_3_Rank.png";
  if (r.startsWith("diamond")) return "https://ntgesports.com/valorant/ranks/Diamond_1_Rank.png";

  if (r.startsWith("ascendant 1")) return "https://ntgesports.com/valorant/ranks/Ascendant_1_Rank.png";
  if (r.startsWith("ascendant 2")) return "https://ntgesports.com/valorant/ranks/Ascendant_2_Rank.png";
  if (r.startsWith("ascendant 3")) return "https://ntgesports.com/valorant/ranks/Ascendant_3_Rank.png";
  if (r.startsWith("ascendant")) return "https://ntgesports.com/valorant/ranks/Ascendant_1_Rank.png";

  if (r.startsWith("immortal 1")) return "https://ntgesports.com/valorant/ranks/Immortal_1_Rank.png";
  if (r.startsWith("immortal 2")) return "https://ntgesports.com/valorant/ranks/Immortal_2_Rank.png";
  if (r.startsWith("immortal 3")) return "https://ntgesports.com/valorant/ranks/Immortal_3_Rank.png";
  if (r.startsWith("immortal")) return "https://ntgesports.com/valorant/ranks/Immortal_1_Rank.png";

  if (r.startsWith("radiant")) return "https://ntgesports.com/valorant/ranks/Radiant_Rank.png";

  return "https://ntgesports.com/valorant/ranks/Unranked_Rank.png";
}

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
  let rankText = "";
  if (game === "VALORANT") {
    const current = player.snapshotRankTier || "Unranked";
    const peak = player.snapshotPeakRankTier;
    if (peak && peak.toLowerCase().trim() !== "unranked") {
      rankText = `${current} (Peak: ${peak})`;
    } else {
      rankText = current;
    }
  } else {
    rankText = player.snapshotRankTier || player.snapshotCs2PeakPremier || "Unranked";
  }
  
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
          className="relative w-full shrink-0 overflow-hidden rounded-[1.25rem] border border-cyan-500/20 px-4 py-8 md:w-56 flex flex-col justify-between items-center min-h-[320px] shadow-lg"
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

          {/* Spacer to push name to bottom */}
          <div className="my-auto z-10" />

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
            <div className="mt-4 space-y-2 border-l-2 border-cyan-500/20 pl-4 py-1">
              {game === "VALORANT" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 w-16">Current:</span>
                    <img src={getRankIconUrl(player.snapshotRankTier)} alt="" className="h-5 w-5 object-contain shrink-0" />
                    <span className="text-sm font-semibold text-white/95">{player.snapshotRankTier || "Unranked"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 w-16">Peak:</span>
                    <img src={getRankIconUrl(player.snapshotPeakRankTier)} alt="" className="h-5 w-5 object-contain shrink-0" />
                    <span className="text-sm font-semibold text-white/95">{player.snapshotPeakRankTier || "Unranked"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 w-16">Roles:</span>
                    <span className="text-xs font-semibold text-[#5eead4]">{roles}</span>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-white/40 font-medium">
                  {rankText} <span className="text-white/25">·</span> <span className="text-[#5eead4]/80">{roles}</span>
                </p>
              )}
            </div>
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
