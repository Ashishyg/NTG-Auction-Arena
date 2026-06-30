/** Which snapshot fields the game-aware PlayerCard shows, per game. */
export const GAME_FIELDS: Record<string, { key: string; label: string }[]> = {
  VALORANT: [
    { key: "snapshotRiotId", label: "Riot ID" },
    { key: "snapshotRankTier", label: "Rank" },
    { key: "snapshotValorantRoles", label: "Roles" },
  ],
  CS2: [
    { key: "snapshotSteamId64", label: "Steam ID" },
    { key: "snapshotCs2PeakPremier", label: "Peak Premier" },
    { key: "snapshotCs2FaceitRank", label: "FACEIT" },
  ],
  EA_FC26: [
    { key: "snapshotOlympusId", label: "Olympus ID" },
    { key: "snapshotDateOfBirth", label: "Date of Birth" },
  ],
  OTHER: [{ key: "snapshotRiotId", label: "ID" }],
};

/**
 * Default rank → floor-price tables, used by /api/init when the admin doesn't
 * supply a custom one. The rank string matches `snapshotRankTier` (Valorant)
 * or peak-rank fields for other games. Anything unmatched falls back to floor 1.
 */
export const DEFAULT_RANK_TABLES: Record<string, { rank: string; floor: number }[]> = {
  VALORANT: [
    { rank: "Radiant", floor: 14 },
    { rank: "Immortal", floor: 12 },
    { rank: "Ascendant", floor: 10 },
    { rank: "Diamond", floor: 8 },
    { rank: "Platinum", floor: 6 },
    { rank: "Gold", floor: 4 },
    { rank: "Silver", floor: 2 },
    { rank: "Bronze", floor: 1 },
    { rank: "Iron", floor: 1 },
  ],
  CS2: [
    { rank: "Level 10", floor: 12 },
    { rank: "Level 8", floor: 8 },
    { rank: "Level 6", floor: 5 },
    { rank: "Level 4", floor: 3 },
    { rank: "Level 2", floor: 1 },
  ],
  EA_FC26: [],
  OTHER: [],
};

/**
 * Floor for a player from a rank-table. Matches the player's rank string against
 * a table entry (case-insensitive prefix, e.g. "Diamond 2" → "Diamond"); falls
 * back to 1 so every player is always winnable.
 */
export function floorForRank(rank: string | null | undefined, table: { rank: string; floor: number }[]): number {
  if (!rank) return 1;
  const r = rank.toLowerCase();
  const hit = table.find((e) => r.startsWith(e.rank.toLowerCase()) || r.includes(e.rank.toLowerCase()));
  return hit?.floor ?? 1;
}
