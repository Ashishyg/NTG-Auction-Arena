import sql from "./db.ts";

/**
 * Veto access model: same handoff JWT as the auction (see auth.ts). The main
 * site proves *who* the user is; we resolve *what they may do in this match*
 * from the shared DB, so the client never supplies its own side.
 *
 * Unlike the auction, any member of a team may act — not just the captain.
 */

export type VetoSide = "A" | "B";

export interface VetoAccount {
  userId: string;
  name: string;
  matchId: string;
  /** Which team this user plays for here, or null for admins/spectators. */
  side: VetoSide | null;
  isAdmin: boolean;
  teamAName: string;
  teamBName: string;
  format: "BO1" | "BO3";
}

/**
 * Resolve a user's role for a veto.
 *  - main-site ADMIN                       → isAdmin, no side (may spectate/force)
 *  - member of team A or B (any role)      → that side
 *  - anyone else                           → side null, read-only
 *  - no match / no account                 → null (403)
 */
export async function resolveVetoAccount(
  userId: string,
  matchId: string,
): Promise<VetoAccount | null> {
  const [user] = await sql`SELECT role, name FROM "User" WHERE id = ${userId}`;
  if (!user) return null;

  const [match] = await sql`
    SELECT m.id, m.format, m."teamAId", m."teamBId",
           a.name AS team_a_name, b.name AS team_b_name
    FROM "TournamentMatch" m
    JOIN "TournamentTeam" a ON a.id = m."teamAId"
    JOIN "TournamentTeam" b ON b.id = m."teamBId"
    WHERE m.id = ${matchId}
  `;
  if (!match) return null;

  // Captain, co-captain, or rostered player all count as team members.
  const [membership] = await sql`
    SELECT t.id AS team_id
    FROM "TournamentTeam" t
    WHERE t.id IN (${match.teamAId}, ${match.teamBId})
      AND (
        t."captainUserId" = ${userId}
        OR t."coCaptainUserId" = ${userId}
        OR EXISTS (
          SELECT 1 FROM "TournamentTeamPlayer" p
          WHERE p."teamId" = t.id AND p."userId" = ${userId}
        )
      )
    LIMIT 1
  `;

  const side: VetoSide | null = membership
    ? membership.team_id === match.teamAId
      ? "A"
      : "B"
    : null;

  return {
    userId,
    name: user.name ?? "Unknown",
    matchId: match.id,
    side,
    isAdmin: user.role === "ADMIN",
    teamAName: match.team_a_name,
    teamBName: match.team_b_name,
    format: match.format,
  };
}
