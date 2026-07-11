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
  /** Primary badge role — display only. Gating uses isAdmin/team directly, since
   *  an admin who is also a captain has BOTH capabilities, not one or the other. */
  role: AuctionRole;
  isAdmin: boolean;
  team?: string; // auction_teams.id — present whenever this user captains a team here
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
 * Resolve what a user may do in a given tournament's auction. isAdmin and
 * team are independent facts — an admin who is ALSO registered as a team's
 * captain gets both auctioneer controls and their own bidding controls,
 * rather than one replacing the other.
 *
 *  - main-site ADMIN                 → isAdmin: true (auctioneer access)
 *  - APPROVED CAPTAIN registration    → team set (captain bidding access)
 *  - APPROVED player registration     → observer only
 *  - admin with no registration       → auctioneer only, as before
 *  - neither admin nor registered     → null (403)
 */
export async function resolveAccount(userId: string, tournamentId: string): Promise<Account | null> {
  const [user] = await sql`SELECT role, name FROM "User" WHERE id = ${userId}`;
  const name: string = user?.name ?? "Unknown";
  const isAdmin = user?.role === "ADMIN";

  const [reg] = await sql`
    SELECT "participantRole", "snapshotDisplayName"
    FROM "TournamentRegistration"
    WHERE "tournamentId" = ${tournamentId} AND "userId" = ${userId} AND status = 'APPROVED'
  `;

  if (!reg && !isAdmin) return null;
  const displayName: string = reg?.snapshotDisplayName ?? name;

  let team: string | undefined;
  if (reg?.participantRole === "CAPTAIN") {
    const [t] = await sql`
      SELECT t.id FROM auction_teams t
      JOIN auction_sessions s ON s.id = t.session_id
      WHERE s.tournament_id = ${tournamentId} AND t.captain_user_id = ${userId}
    `;
    team = t?.id;
  }

  const role: AuctionRole = isAdmin ? "auctioneer" : team ? "captain" : "observer";
  return { userId, name: displayName, role, isAdmin, team };
}
