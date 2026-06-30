/** Inspect the AUC CUP IV auction session + players. */
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const tid = "cmqz4bu1t0001v8g8zjtvlzry";

const [s] = await sql`SELECT * FROM auction_sessions WHERE tournament_id = ${tid}`;
console.log("session:", s ? { status: s.status, pass: s.pass, current: s.current_registration_id, price: s.current_price } : "NONE");

if (s) {
  const players = await sql`SELECT registration_id, status, floor_price FROM auction_players WHERE session_id = ${s.id}`;
  console.log("players:", players);
  const teams = await sql`SELECT id, name, captain_user_id, current_budget FROM auction_teams WHERE session_id = ${s.id}`;
  console.log("teams:", teams);
}
await sql.end();
