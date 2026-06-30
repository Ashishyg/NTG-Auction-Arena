import sql from "../lib/db.ts";
import { safeMaxBid, validateBid } from "./rules.ts";

/**
 * DB-coupled wrapper around the pure rules. Only the cheapest still-winnable
 * floor needs the database; the safe-max and validation maths stay pure and
 * unit-tested in rules.ts.
 */
export { safeMaxBid, validateBid };

/**
 * Cheapest floor among players still available to be won (pool or on the
 * block) for this tournament's auction. Drives the dynamic reserve.
 */
export async function cheapestAvailableFloor(tournamentId: string): Promise<number> {
  const [row] = await sql<{ floor: number | null }[]>`
    SELECT MIN(ap.floor_price)::int AS floor
    FROM auction_players ap
    JOIN auction_sessions s ON s.id = ap.session_id
    WHERE s.tournament_id = ${tournamentId}
      AND ap.status IN ('pool', 'on_auction')
  `;
  return row?.floor ?? 0;
}
