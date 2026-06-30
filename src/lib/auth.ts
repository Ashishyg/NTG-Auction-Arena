import jwt from "jsonwebtoken";
import sql from "./db.ts";

/**
 * Auth model: the main NTG site mints a short-lived *identity* JWT (HS256,
 * signed with the shared JWT_SECRET) and hands the user to the auction app via
 * `?token=`. We verify identity here, then resolve the per-tournament role
 * straight from the shared DB — the client never supplies its own role.
 */

export type AuctionRole = "auctioneer" | "captain" | "observer";
export interface Account {
  userId: string;
  name: string;
  role: AuctionRole;
  team?: string; // auction_teams.id, captains only
}

/** Verify a handoff token → userId, or null if invalid/expired. */
export function userIdFromToken(token?: string): string | null {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET) as Record<string, unknown>;
    return ((p.userId ?? p.sub) as string) || null;
  } catch {
    return null;
  }
}

/**
 * Resolve what a user may do in a given tournament's auction:
 *  - main-site ADMIN            → auctioneer (no registration required)
 *  - APPROVED CAPTAIN reg       → captain (+ their auction_teams.id)
 *  - APPROVED player reg        → observer
 *  - not registered             → null (403)
 */
export async function resolveAccount(userId: string, tournamentId: string): Promise<Account | null> {
  const [user] = await sql`SELECT role, name FROM "User" WHERE id = ${userId}`;
  const name: string = user?.name ?? "Unknown";
  if (user?.role === "ADMIN") return { userId, name, role: "auctioneer" };

  const [reg] = await sql`
    SELECT "participantRole", "snapshotDisplayName"
    FROM "TournamentRegistration"
    WHERE "tournamentId" = ${tournamentId} AND "userId" = ${userId} AND status = 'APPROVED'
  `;
  if (!reg) return null;
  const displayName: string = reg.snapshotDisplayName ?? name;

  if (reg.participantRole === "CAPTAIN") {
    const [team] = await sql`
      SELECT t.id FROM auction_teams t
      JOIN auction_sessions s ON s.id = t.session_id
      WHERE s.tournament_id = ${tournamentId} AND t.captain_user_id = ${userId}
    `;
    return { userId, name: displayName, role: "captain", team: team?.id };
  }
  return { userId, name: displayName, role: "observer" };
}
