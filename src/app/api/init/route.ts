import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { userIdFromToken } from "@/lib/auth";
import { DEFAULT_RANK_TABLES, floorForRank } from "@/auction/gameDefaults";

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
    settings?: Partial<{ startingBudget: number; rosterSize: number; timerSeconds: number; minBidIncrement: number }>;
    rankTable?: { rank: string; floor: number }[];
  };
  if (!tournamentId) return NextResponse.json({ error: "tournamentId required" }, { status: 400 });

  const [tournament] = await sql`SELECT id, game FROM "Tournament" WHERE id = ${tournamentId}`;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const [existing] = await sql`SELECT id FROM auction_sessions WHERE tournament_id = ${tournamentId}`;
  if (existing) return NextResponse.json({ error: "Auction already exists for this tournament" }, { status: 409 });

  const game: string = tournament.game;
  const table = rankTable ?? DEFAULT_RANK_TABLES[game] ?? [];
  const startingBudget = settings.startingBudget ?? 150;
  const rosterSize = settings.rosterSize ?? 3;
  const timerSeconds = settings.timerSeconds ?? 15;
  const minBidIncrement = settings.minBidIncrement ?? 1;

  const regs = await sql`
    SELECT id, "userId", "participantRole", "teamName", "snapshotDisplayName", "snapshotRankTier",
           "snapshotCs2PeakPremier"
    FROM "TournamentRegistration"
    WHERE "tournamentId" = ${tournamentId} AND status = 'APPROVED'
  `;
  const captains = regs.filter((r) => r.participantRole === "CAPTAIN");
  const players = regs.filter((r) => r.participantRole === "PLAYER");

  const session = await sql.begin(async (tx) => {
    const [s] = await tx`
      INSERT INTO auction_sessions (tournament_id, game, starting_budget, roster_size, timer_seconds, min_bid_increment, rank_table)
      VALUES (${tournamentId}, ${game}, ${startingBudget}, ${rosterSize}, ${timerSeconds}, ${minBidIncrement}, ${sql.json(table)})
      RETURNING id
    `;
    const sessionId = s.id;

    for (const c of captains) {
      await tx`
        INSERT INTO auction_teams (session_id, name, captain_user_id, registration_id, starting_budget, current_budget)
        VALUES (${sessionId}, ${c.teamName ?? c.snapshotDisplayName ?? "Team"}, ${c.userId}, ${c.id}, ${startingBudget}, ${startingBudget})
      `;
    }
    for (const p of players) {
      const rank = game === "CS2" ? p.snapshotCs2PeakPremier : p.snapshotRankTier;
      await tx`
        INSERT INTO auction_players (session_id, registration_id, floor_price)
        VALUES (${sessionId}, ${p.id}, ${floorForRank(rank, table)})
      `;
    }
    return sessionId;
  });

  return NextResponse.json({
    sessionId: session,
    teams: captains.length,
    players: players.length,
    auctioneerUrl: `/${tournamentId}/auctioneer`,
    observerUrl: `/${tournamentId}/observe`,
  });
}
