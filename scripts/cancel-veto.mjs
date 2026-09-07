/**
 * Cancel a veto so the match can be re-run: drops the live session and the
 * fixture row, which makes "Start Veto" appear on the bracket card again.
 *   node --env-file=.env.local scripts/cancel-veto.mjs <matchId>
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const matchId = process.argv[2];
if (!matchId) {
  console.error("Usage: node scripts/cancel-veto.mjs <TournamentMatch id>");
  process.exit(1);
}

const [match] = await sql`
  SELECT m.id, a.name AS team_a, b.name AS team_b, m.status
  FROM "TournamentMatch" m
  JOIN "TournamentTeam" a ON a.id = m."teamAId"
  JOIN "TournamentTeam" b ON b.id = m."teamBId"
  WHERE m.id = ${matchId}
`;
if (!match) {
  console.error("No such match:", matchId);
  process.exit(1);
}

const sessions = await sql`DELETE FROM veto_sessions WHERE match_id = ${matchId} RETURNING id`;
const matches = await sql`DELETE FROM "TournamentMatch" WHERE id = ${matchId} RETURNING id`;

console.log(`Cancelled ${match.team_a} vs ${match.team_b} (was ${match.status})`);
console.log(`  veto_sessions removed: ${sessions.count}`);
console.log(`  TournamentMatch removed: ${matches.count}`);

await sql.end();
