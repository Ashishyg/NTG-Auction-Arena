/**
 * Dev helper: create (or --cleanup) a throwaway veto fixture so the board can be
 * exercised locally. Resolves the cup and its first two teams by query, so it
 * works against whichever database DATABASE_URL points at.
 *
 *   node --env-file=.env.local scripts/veto-test-fixture.mjs [cup-slug]
 *   node --env-file=.env.local scripts/veto-test-fixture.mjs --cleanup
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const MATCH_ID = "veto-ui-preview";
const slugArg = process.argv.find((a) => !a.startsWith("-") && a.endsWith("-cup") === false && a.includes("-") && !a.includes("/") && !a.includes("\\"));

await sql`DELETE FROM veto_sessions WHERE match_id = ${MATCH_ID}`;
await sql`DELETE FROM "TournamentMatch" WHERE id = ${MATCH_ID}`;

if (process.argv.includes("--cleanup")) {
  console.log("Cleaned up.");
  await sql.end();
  process.exit(0);
}

const [cup] = slugArg
  ? await sql`SELECT id, slug, name FROM "Tournament" WHERE slug = ${slugArg}`
  : await sql`
      SELECT t.id, t.slug, t.name
      FROM "Tournament" t
      JOIN "TournamentTeam" tt ON tt."tournamentId" = t.id
      GROUP BY t.id, t.slug, t.name
      HAVING count(tt.id) >= 2
      ORDER BY count(tt.id) DESC
      LIMIT 1
    `;

if (!cup) {
  console.error("No cup with at least two teams found.");
  process.exit(1);
}

const teams = await sql`
  SELECT id, name FROM "TournamentTeam"
  WHERE "tournamentId" = ${cup.id} ORDER BY "sortOrder" LIMIT 2
`;
if (teams.length < 2) {
  console.error(`${cup.slug} has fewer than two teams.`);
  process.exit(1);
}

await sql`
  INSERT INTO "TournamentMatch"
    (id, "tournamentId", "challongeMatchId", "teamAId", "teamBId", format, status, "updatedAt")
  VALUES (${MATCH_ID}, ${cup.id}, 'ui-preview', ${teams[0].id}, ${teams[1].id}, 'BO3', 'VETO_LIVE', NOW())
`;

// Anyone rostered on either side can drive the veto — print one per team.
const members = await sql`
  SELECT p."teamId", p."userId", p."displayName"
  FROM "TournamentTeamPlayer" p
  WHERE p."teamId" IN (${teams[0].id}, ${teams[1].id}) AND p."userId" IS NOT NULL
`;

console.log(`Fixture ready on ${cup.slug}: ${teams[0].name} vs ${teams[1].name}`);
console.log(`  /veto/${MATCH_ID}`);
for (const t of teams) {
  const m = members.find((x) => x.teamId === t.id);
  console.log(`  ${t.name}: ${m ? `${m.displayName} (${m.userId})` : "no rostered user"}`);
}

await sql.end();
