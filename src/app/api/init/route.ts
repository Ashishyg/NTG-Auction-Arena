import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { userIdFromToken } from "@/lib/auth";
import { DEFAULT_RANK_TABLES, floorForRank, effectiveRank } from "@/auction/gameDefaults";

/**
 * POST /api/init  — main-site admin creates the auction for a tournament.
 *   Authorization: Bearer <admin handoff token>
 *   { tournamentId, settings?: { startingBudget, rosterSize, timerSeconds, minBidIncrement }, rankTable? }
 *
 * Seeds the session, one auction_team per APPROVED CAPTAIN, and one
 * auction_player per APPROVED PLAYER (floor priced from the rank table).
 * Idempotent-ish: refuses if a session already exists.
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const userId = userIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const [admin] = await sql`SELECT role FROM "User" WHERE id = ${userId}`;
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { tournamentId, settings = {}, rankTable } = body as {
    tournamentId?: string;
    settings?: Partial<{
      startingBudget: number;
      rosterSize: number;
      timerSeconds: number;
      minBidIncrement: number;
      coCaptainSlots: number;
      auctionStartsAt: string;
      auctionEndsAt: string;
    }>;
    rankTable?: { rank: string; floor: number }[];
  };
  if (!tournamentId) return NextResponse.json({ error: "tournamentId required" }, { status: 400 });

  const [tournament] = await sql`SELECT id, game FROM "Tournament" WHERE id = ${tournamentId}`;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const [existing] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (existing) {
    // If the auction already exists, delete it so we reset it completely
    await sql`DELETE FROM auction_sessions WHERE id = ${existing.id}`;
  }

  const game: string = tournament.game;
  const table = rankTable ?? DEFAULT_RANK_TABLES[game] ?? [];
  const startingBudget = settings.startingBudget ?? 150;
  const rosterSize = settings.rosterSize ?? 3;
  const timerSeconds = settings.timerSeconds ?? 15;
  const minBidIncrement = settings.minBidIncrement ?? 1;
  const coCaptainSlots = settings.coCaptainSlots ?? 0;
  const auctionStartsAt = settings.auctionStartsAt ? new Date(settings.auctionStartsAt) : null;
  const auctionEndsAt = settings.auctionEndsAt ? new Date(settings.auctionEndsAt) : null;

  const regs = await sql`
    SELECT id, "userId", "participantRole", "teamId", "teamName", "snapshotDisplayName", 
           "snapshotRankTier", "snapshotPeakRankTier", "snapshotCs2PeakPremier"
    FROM "TournamentRegistration"
    WHERE "tournamentId" = ${tournamentId} AND status = 'APPROVED'
  `;
  const captains = regs.filter((r) => r.participantRole === "CAPTAIN");
  const players = regs.filter((r) => r.participantRole === "PLAYER");
  const coCaptains = regs.filter((r) => r.participantRole === "CO_CAPTAIN");

  // Map main-site TournamentTeam.id -> captain's registration id, so co-captains land on the right team.
  const mainTeams = await sql`
    SELECT id, "sourceRegistrationId" FROM "TournamentTeam" WHERE "tournamentId" = ${tournamentId}
  `;
  const teamIdToCaptainRegId = new Map<string, string>();
  for (const t of mainTeams) {
    if (t.sourceRegistrationId) teamIdToCaptainRegId.set(t.id, t.sourceRegistrationId);
  }

  const session = await sql.begin(async (tx) => {
    const [s] = await tx`
      INSERT INTO auction_sessions (
        tournament_id, game, starting_budget, roster_size, timer_seconds, min_bid_increment,
        co_captain_slots, auction_starts_at, auction_ends_at, rank_table
      )
      VALUES (
        ${tournamentId}, ${game}, ${startingBudget}, ${rosterSize}, ${timerSeconds}, ${minBidIncrement},
        ${coCaptainSlots}, ${auctionStartsAt}, ${auctionEndsAt}, ${sql.json(table)}
      )
      RETURNING id
    `;
    const sessionId = s.id;

    // Captain's own rank cost comes straight out of their team's wallet before bidding starts.
    const captainRegIdToTeamId = new Map<string, string>();
    for (const c of captains) {
      const captainCost = floorForRank(effectiveRank(game, c), table);
      const teamBudget = Math.max(startingBudget - captainCost, 0);
      const [at] = await tx`
        INSERT INTO auction_teams (session_id, name, captain_user_id, registration_id, starting_budget, current_budget)
        VALUES (${sessionId}, ${c.teamName ?? c.snapshotDisplayName ?? "Team"}, ${c.userId}, ${c.id}, ${startingBudget}, ${teamBudget})
        RETURNING id
      `;
      captainRegIdToTeamId.set(c.id, at.id);
    }
    for (const p of players) {
      await tx`
        INSERT INTO auction_players (session_id, registration_id, floor_price)
        VALUES (${sessionId}, ${p.id}, ${floorForRank(effectiveRank(game, p), table)})
      `;
    }
    // Co-captains are pre-assigned onto their captain's team; their rank cost is deducted
    // from the team's wallet the same way the captain's is, so both are "already spent."
    for (const cc of coCaptains) {
      const captainRegId = cc.teamId ? teamIdToCaptainRegId.get(cc.teamId) : undefined;
      const auctionTeamId = captainRegId ? captainRegIdToTeamId.get(captainRegId) : undefined;
      if (!auctionTeamId) continue;
      const ccCost = floorForRank(effectiveRank(game, cc), table);
      await tx`
        INSERT INTO auction_players (session_id, registration_id, floor_price, status, sold_price, team_id, sold_at)
        VALUES (${sessionId}, ${cc.id}, ${ccCost}, 'sold', ${ccCost}, ${auctionTeamId}, NOW())
      `;
      await tx`
        UPDATE auction_teams SET current_budget = GREATEST(current_budget - ${ccCost}, 0) WHERE id = ${auctionTeamId}
      `;
    }
    return sessionId;
  });

  return NextResponse.json({
    sessionId: session,
    teams: captains.length,
    players: players.length,
    coCaptains: coCaptains.length,
    auctioneerUrl: `/${tournamentId}/auctioneer`,
    observerUrl: `/${tournamentId}/observe`,
  });
}
