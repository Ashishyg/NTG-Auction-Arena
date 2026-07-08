import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  try {
    console.log("Running migration...");
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS co_captain_slots INT NOT NULL DEFAULT 0;`;
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS auction_starts_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ;`;
    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await sql.end();
  }
}

run();
