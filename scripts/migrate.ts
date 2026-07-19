import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  try {
    console.log("Running migration...");
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS co_captain_slots INT NOT NULL DEFAULT 0;`;
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS auction_starts_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE auction_teams ADD COLUMN IF NOT EXISTS color TEXT;`;
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS safe_max_core_only BOOLEAN NOT NULL DEFAULT false;`;
    await sql`ALTER TABLE auction_sessions ALTER COLUMN safe_max_core_only SET DEFAULT false;`;
    await sql`UPDATE auction_sessions SET safe_max_core_only = false;`;
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS finalized BOOLEAN NOT NULL DEFAULT false;`;

    // Replaces the on/off safe_max_core_only toggle with a configurable "protect
    // through slot N" number: N = roster_size reproduces the old "off" behavior,
    // N = 5 reproduces the old "on" (core-only) behavior.
    await sql`ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS safe_max_slots INT NOT NULL DEFAULT 20;`;
    await sql`
      UPDATE auction_sessions
      SET safe_max_slots = CASE WHEN safe_max_core_only THEN LEAST(5, roster_size) ELSE roster_size END
    `;
    await sql`ALTER TABLE auction_sessions DROP COLUMN IF EXISTS safe_max_core_only;`;
    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await sql.end();
  }
}

run();
