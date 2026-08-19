/**
 * Tournament leaderboard Rating — same math as main NTG site
 * (`weightedAcs` + `crossCupRating` in tournament-stats.ts).
 * Not competitive MMR and not raw ACS.
 */

export const AWARD_PRIOR_CAP = 3;
export const CROSS_CUP_PRIOR = 2;
export const CUP_CONSISTENCY_BONUS = 18;
export const CONSISTENCY_CUP_CAP = 6;

export type StandoutBaseline = {
  meanGamesPlayed: number;
  meanAcs: number;
};

export function computeAcs(score: number, totalRounds: number): number {
  if (totalRounds <= 0) return 0;
  return Math.round(score / totalRounds);
}

export function computeAdr(damage: number, totalRounds: number): number {
  if (totalRounds <= 0) return 0;
  return Math.round(damage / totalRounds);
}

export function computeHsPercent(
  headshots: number,
  bodyshots: number,
  legshots: number,
): number {
  const shots = headshots + bodyshots + legshots;
  if (shots <= 0) return 0;
  return Math.round((headshots / shots) * 10000) / 100;
}

export function computeStandoutBaseline(
  pool: { avgAcs: number; gamesPlayed: number }[],
): StandoutBaseline {
  let appearances = 0;
  let acsWeighted = 0;
  for (const p of pool) {
    appearances += p.gamesPlayed;
    acsWeighted += p.avgAcs * p.gamesPlayed;
  }
  if (pool.length === 0 || appearances <= 0) {
    return { meanGamesPlayed: 0, meanAcs: 0 };
  }
  return {
    meanGamesPlayed: appearances / pool.length,
    meanAcs: acsWeighted / appearances,
  };
}

export function weightedAcs(
  avgAcs: number,
  gamesPlayed: number,
  baseline: StandoutBaseline,
): number {
  if (gamesPlayed <= 0) return 0;
  const prior = Math.min(baseline.meanGamesPlayed, AWARD_PRIOR_CAP);
  if (prior <= 0) return avgAcs;
  return (gamesPlayed * avgAcs + prior * baseline.meanAcs) / (gamesPlayed + prior);
}

export function crossCupRating(cupRatings: number[], leagueMeanCupRating: number): number {
  const n = cupRatings.length;
  if (n <= 0) return 0;
  const avg = cupRatings.reduce((sum, rating) => sum + rating, 0) / n;
  const shrunk =
    CROSS_CUP_PRIOR > 0
      ? (n * avg + CROSS_CUP_PRIOR * leagueMeanCupRating) / (n + CROSS_CUP_PRIOR)
      : avg;
  const cappedN = Math.min(n, CONSISTENCY_CUP_CAP);
  return shrunk + CUP_CONSISTENCY_BONUS * Math.log2(cappedN);
}

export type CupPlayerAgg = {
  key: string;
  gamesPlayed: number;
  avgAcs: number;
  avgAdr: number;
  kills: number;
  deaths: number;
  assists: number;
  firstKills: number;
  firstDeaths: number;
  hsSum: number;
  agentCounts: Record<string, number>;
};

export type GameAppearance = {
  tournamentId: string;
  userId: string;
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  damage: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  firstKills: number;
  firstDeaths: number;
  teamARounds: number;
  teamBRounds: number;
};

function aggregateCup(rows: GameAppearance[]): CupPlayerAgg[] {
  const map = new Map<
    string,
    {
      games: number;
      acsSum: number;
      adrSum: number;
      kills: number;
      deaths: number;
      assists: number;
      firstKills: number;
      firstDeaths: number;
      hsSum: number;
      agentCounts: Record<string, number>;
    }
  >();

  for (const r of rows) {
    if (!r.agent || !r.userId) continue;
    const rounds = Math.max(0, (r.teamARounds ?? 0) + (r.teamBRounds ?? 0));
    const acs = computeAcs(r.score, rounds);
    const adr = computeAdr(r.damage, rounds);
    const hs = computeHsPercent(r.headshots, r.bodyshots, r.legshots);
    const key = `user:${r.userId}`;
    let e = map.get(key);
    if (!e) {
      e = {
        games: 0,
        acsSum: 0,
        adrSum: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        firstKills: 0,
        firstDeaths: 0,
        hsSum: 0,
        agentCounts: {},
      };
      map.set(key, e);
    }
    e.games += 1;
    e.acsSum += acs;
    e.adrSum += adr;
    e.kills += r.kills;
    e.deaths += r.deaths;
    e.assists += r.assists;
    e.firstKills += r.firstKills;
    e.firstDeaths += r.firstDeaths;
    e.hsSum += hs;
    e.agentCounts[r.agent] = (e.agentCounts[r.agent] ?? 0) + 1;
  }

  return [...map.entries()].map(([key, e]) => ({
    key,
    gamesPlayed: e.games,
    avgAcs: e.games > 0 ? Math.round(e.acsSum / e.games) : 0,
    avgAdr: e.games > 0 ? Math.round(e.adrSum / e.games) : 0,
    kills: e.kills,
    deaths: e.deaths,
    assists: e.assists,
    firstKills: e.firstKills,
    firstDeaths: e.firstDeaths,
    hsSum: e.hsSum,
    agentCounts: e.agentCounts,
  }));
}

export type TournamentStanding = {
  key: string;
  rating: number;
  rank: number;
  total: number;
  gamesPlayed: number;
  kills: number;
  deaths: number;
  assists: number;
  firstKills: number;
  firstDeaths: number;
  avgAcs: number;
  avgAdr: number;
  avgHsPercent: number;
  agentCounts: Record<string, number>;
};

/** Rank everyone across cups with the same formula as the NTG tournament board. */
export function rankTournamentAppearances(rows: GameAppearance[]): TournamentStanding[] {
  const byCup = new Map<string, GameAppearance[]>();
  for (const r of rows) {
    const list = byCup.get(r.tournamentId) ?? [];
    list.push(r);
    byCup.set(r.tournamentId, list);
  }

  const cupPools = [...byCup.values()].map(aggregateCup);

  type Acc = {
    gamesPlayed: number;
    kills: number;
    deaths: number;
    assists: number;
    firstKills: number;
    firstDeaths: number;
    acsWeighted: number;
    adrWeighted: number;
    hsWeighted: number;
    agentCounts: Record<string, number>;
    cupRatings: number[];
  };

  const byKey = new Map<string, Acc>();
  const allCupRatings: number[] = [];

  for (const pool of cupPools) {
    if (pool.length === 0) continue;
    const baseline = computeStandoutBaseline(pool);
    for (const p of pool) {
      if (p.gamesPlayed <= 0) continue;
      const cupRating = weightedAcs(p.avgAcs, p.gamesPlayed, baseline);
      allCupRatings.push(cupRating);
      const existing = byKey.get(p.key);
      if (!existing) {
        byKey.set(p.key, {
          gamesPlayed: p.gamesPlayed,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          firstKills: p.firstKills,
          firstDeaths: p.firstDeaths,
          acsWeighted: p.avgAcs * p.gamesPlayed,
          adrWeighted: p.avgAdr * p.gamesPlayed,
          hsWeighted: p.hsSum,
          agentCounts: { ...p.agentCounts },
          cupRatings: [cupRating],
        });
        continue;
      }
      existing.gamesPlayed += p.gamesPlayed;
      existing.kills += p.kills;
      existing.deaths += p.deaths;
      existing.assists += p.assists;
      existing.firstKills += p.firstKills;
      existing.firstDeaths += p.firstDeaths;
      existing.acsWeighted += p.avgAcs * p.gamesPlayed;
      existing.adrWeighted += p.avgAdr * p.gamesPlayed;
      existing.hsWeighted += p.hsSum;
      existing.cupRatings.push(cupRating);
      for (const [agent, count] of Object.entries(p.agentCounts)) {
        existing.agentCounts[agent] = (existing.agentCounts[agent] ?? 0) + count;
      }
    }
  }

  const leagueMean =
    allCupRatings.length === 0
      ? 0
      : allCupRatings.reduce((sum, rating) => sum + rating, 0) / allCupRatings.length;

  const rowsOut: Omit<TournamentStanding, "rank" | "total">[] = [];
  for (const [key, acc] of byKey) {
    const g = acc.gamesPlayed;
    rowsOut.push({
      key,
      rating: Math.round(crossCupRating(acc.cupRatings, leagueMean) * 10) / 10,
      gamesPlayed: g,
      kills: acc.kills,
      deaths: acc.deaths,
      assists: acc.assists,
      firstKills: acc.firstKills,
      firstDeaths: acc.firstDeaths,
      avgAcs: g > 0 ? Math.round(acc.acsWeighted / g) : 0,
      avgAdr: g > 0 ? Math.round(acc.adrWeighted / g) : 0,
      avgHsPercent: g > 0 ? Math.round((acc.hsWeighted / g) * 10) / 10 : 0,
      agentCounts: acc.agentCounts,
    });
  }

  rowsOut.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.key.localeCompare(b.key);
  });

  const total = rowsOut.length;
  return rowsOut.map((r, i) => ({ ...r, rank: i + 1, total }));
}
