"use client";

export function getRankIconUrl(rank: string | null | undefined): string {
  const uuid = "03621f52-342b-cf4e-4f86-9350a49c6d04";
  if (!rank) return `https://media.valorant-api.com/competitivetiers/${uuid}/0/largeicon.png`;
  const r = rank.trim().toLowerCase();
  
  if (r.startsWith("iron 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/3/largeicon.png`;
  if (r.startsWith("iron 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/4/largeicon.png`;
  if (r.startsWith("iron 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/5/largeicon.png`;
  if (r.startsWith("iron")) return `https://media.valorant-api.com/competitivetiers/${uuid}/3/largeicon.png`;

  if (r.startsWith("bronze 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/6/largeicon.png`;
  if (r.startsWith("bronze 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/7/largeicon.png`;
  if (r.startsWith("bronze 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/8/largeicon.png`;
  if (r.startsWith("bronze")) return `https://media.valorant-api.com/competitivetiers/${uuid}/6/largeicon.png`;

  if (r.startsWith("silver 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/9/largeicon.png`;
  if (r.startsWith("silver 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/10/largeicon.png`;
  if (r.startsWith("silver 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/11/largeicon.png`;
  if (r.startsWith("silver")) return `https://media.valorant-api.com/competitivetiers/${uuid}/9/largeicon.png`;

  if (r.startsWith("gold 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/12/largeicon.png`;
  if (r.startsWith("gold 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/13/largeicon.png`;
  if (r.startsWith("gold 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/14/largeicon.png`;
  if (r.startsWith("gold")) return `https://media.valorant-api.com/competitivetiers/${uuid}/12/largeicon.png`;

  if (r.startsWith("platinum 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/15/largeicon.png`;
  if (r.startsWith("platinum 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/16/largeicon.png`;
  if (r.startsWith("platinum 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/17/largeicon.png`;
  if (r.startsWith("platinum")) return `https://media.valorant-api.com/competitivetiers/${uuid}/15/largeicon.png`;

  if (r.startsWith("diamond 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/18/largeicon.png`;
  if (r.startsWith("diamond 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/19/largeicon.png`;
  if (r.startsWith("diamond 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/20/largeicon.png`;
  if (r.startsWith("diamond")) return `https://media.valorant-api.com/competitivetiers/${uuid}/18/largeicon.png`;

  if (r.startsWith("ascendant 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/21/largeicon.png`;
  if (r.startsWith("ascendant 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/22/largeicon.png`;
  if (r.startsWith("ascendant 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/23/largeicon.png`;
  if (r.startsWith("ascendant")) return `https://media.valorant-api.com/competitivetiers/${uuid}/21/largeicon.png`;

  if (r.startsWith("immortal 1")) return `https://media.valorant-api.com/competitivetiers/${uuid}/24/largeicon.png`;
  if (r.startsWith("immortal 2")) return `https://media.valorant-api.com/competitivetiers/${uuid}/25/largeicon.png`;
  if (r.startsWith("immortal 3")) return `https://media.valorant-api.com/competitivetiers/${uuid}/26/largeicon.png`;
  if (r.startsWith("immortal")) return `https://media.valorant-api.com/competitivetiers/${uuid}/24/largeicon.png`;

  if (r.startsWith("radiant")) return `https://media.valorant-api.com/competitivetiers/${uuid}/27/largeicon.png`;

  return `https://media.valorant-api.com/competitivetiers/${uuid}/0/largeicon.png`;
}

const ROLE_COLORS: Record<string, string> = {
  DUELIST: "#f43f5e",
  INITIATOR: "#8b5cf6",
  SENTINEL: "#10b981",
  CONTROLLER: "#06b6d4",
  FLEX: "#22d3ee",
};

function roleColor(role: string): string {
  const r = role.toUpperCase();
  for (const key of Object.keys(ROLE_COLORS)) {
    if (r.includes(key)) return ROLE_COLORS[key];
  }
  return "#94a3b8";
}

function RankTile({ label, rank }: { label: string; rank?: string | null }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 sm:p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-2 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getRankIconUrl(rank)} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9" />
        <span className="truncate text-base font-bold text-white sm:text-lg">{rank || "Unranked"}</span>
      </div>
    </div>
  );
}

type LastResult =
  | { type: "sold"; playerName: string; teamName: string; price: number }
  | { type: "unsold"; playerName: string }
  | null;

/** Game-aware player spotlight — full uncropped card art, large rank/role display. */
export function PlayerCard({
  player,
  game,
  price,
  highestBidderName,
  status,
  lastResult,
}: {
  player: any;
  game: string;
  price?: number;
  highestBidderName?: string | null;
  status?: string;
  lastResult?: LastResult;
}) {
  if (!player) {
    if (lastResult?.type === "sold") {
      return (
        <div className="neon-glow-card grid min-h-[16rem] place-items-center p-6 text-center sm:min-h-[19rem] sm:p-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400">Sold</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {lastResult.playerName}
            </h2>
            <p className="mt-2 text-base text-white/50">
              to <span className="font-semibold text-[#5eead4]">{lastResult.teamName}</span>
            </p>
            <p className="mt-3 font-display text-2xl font-black tabular-nums text-gold sm:text-3xl">{lastResult.price} pts</p>
          </div>
        </div>
      );
    }
    if (lastResult?.type === "unsold") {
      return (
        <div className="neon-glow-card grid min-h-[16rem] place-items-center p-6 text-center sm:min-h-[19rem] sm:p-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold">Unsold</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {lastResult.playerName}
            </h2>
            <p className="mt-2 text-sm text-white/40">No bids — returns to the pool for the next pass.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="neon-glow-card grid min-h-[16rem] place-items-center p-6 text-center sm:min-h-[19rem] sm:p-10">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.06] text-2xl">🎯</div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">No player on the block</p>
          <p className="mt-2 text-sm text-white/30">Draw a player to begin.</p>
        </div>
      </div>
    );
  }

  const live = status === "live";

  const rawRoles = player.snapshotValorantRoles || player.roles;
  const rolesList: string[] = Array.isArray(rawRoles)
    ? rawRoles
    : String(rawRoles || "FLEX")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
  const rankText =
    game === "VALORANT"
      ? player.snapshotRankTier || "Unranked"
      : player.snapshotRankTier || player.snapshotCs2PeakPremier || "Unranked";

  const cardUrl = player.card_url || (game === "VALORANT" ? "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png" : null);

  const uniqueColors = Array.from(new Set(rolesList.map((r) => roleColor(r))));
  const borderColor = uniqueColors.length > 1
    ? `linear-gradient(135deg, ${uniqueColors.join(", ")})`
    : uniqueColors[0] || "#94a3b8";

  const borderColorHover = uniqueColors.length > 1
    ? `linear-gradient(135deg, ${uniqueColors.map((c) => `${c}cc`).join(", ")})`
    : `${uniqueColors[0] || "#94a3b8"}cc`;

  const baseColor = uniqueColors[0] || "#94a3b8";

  const dynamicStyle = {
    "--role-border-color": borderColor,
    "--role-border-color-hover": borderColorHover,
    "--role-glow": `${baseColor}22`,
    "--role-glow-hover": `${baseColor}44`,
  } as React.CSSProperties;

  return (
    <div 
      style={dynamicStyle}
      className={`p-4 sm:p-6 lg:p-5 rounded-2xl sm:rounded-[1.35rem] ${live ? "neon-glow-card-live" : "neon-glow-card"}`}
    >
      <div className="flex flex-col gap-5 sm:gap-6 md:flex-row md:items-start">

        {/* Full, uncropped Riot player card art */}
        <div className="mx-auto w-full max-w-[220px] shrink-0 sm:max-w-[240px] md:mx-0 md:w-56 lg:w-52">
          <div
            className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-cyan-500/20 shadow-lg"
            style={{
              background: "linear-gradient(to top, #05111a, rgba(9, 21, 34, 0.9), #122838)",
              boxShadow: "inset 0 0 24px rgba(34, 211, 238, 0.15)",
            }}
          >
            {cardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cardUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-5xl">🎮</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-3 pt-12 flex flex-col items-center text-center pointer-events-none select-none">
              <p className="w-full truncate font-display text-sm font-bold text-white tracking-wide">{player.name}</p>
              <div className="my-1.5 flex h-10 w-10 items-center justify-center">
                <img 
                  src={getRankIconUrl(rankText)} 
                  alt="" 
                  className="h-10 w-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]" 
                />
              </div>
              <p className="w-full truncate font-display text-[10px] font-black uppercase tracking-wide text-white/90 drop-shadow-md">
                {rankText}
              </p>
              <p className="mt-1 w-full truncate text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#5eead4]">
                {rolesList[0] || "FLEX"}
              </p>
            </div>
          </div>
        </div>

        {/* Details — larger rank/role display, uses the full width */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5eead4]">On the block</p>
            <h2 className="mt-1 truncate font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {player.name}
            </h2>
          </div>

          {game === "VALORANT" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <RankTile label="Current" rank={player.snapshotRankTier} />
              <RankTile label="Peak" rank={player.snapshotPeakRankTier} />
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Roles</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rolesList.map((r) => (
                    <span
                      key={r}
                      className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
                      style={{ background: `${roleColor(r)}22`, color: roleColor(r) }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-base text-white/60">
              {rankText} <span className="text-white/25">·</span>{" "}
              <span className="text-[#5eead4]">{rolesList.join(", ")}</span>
            </p>
          )}

          {/* Side-by-side bid panels */}
          <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`flex flex-col justify-center rounded-xl border px-4 py-3.5 shadow-sm transition-all duration-300 sm:px-5 sm:py-4 ${
              live
                ? "border-cyan-500/30 bg-[#091724]/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                : "border-white/[0.06] bg-[#0b1120]/30"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                Current bid
              </span>
              <span key={price} className="inline-block bid-update-flash mt-1.5 font-display text-3xl font-black leading-none tabular-nums text-white sm:text-4xl">
                {price ?? 0}
              </span>
            </div>

            <div className={`flex min-w-0 flex-col justify-center rounded-xl border px-4 py-3.5 shadow-sm transition-all duration-300 sm:px-5 sm:py-4 ${
              highestBidderName
                ? "border-emerald-500/20 bg-[#09241b]/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                : "border-white/[0.06] bg-[#0b1120]/30"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                Highest bidder
              </span>
              <span key={highestBidderName || "none"} className="inline-block bid-update-flash mt-1.5 truncate font-display text-base font-bold leading-tight text-white">
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
