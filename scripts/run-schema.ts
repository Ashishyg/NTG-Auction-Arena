/** Applies schema.sql to DATABASE_URL. Run: npm run db:schema */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const content = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

await sql.unsafe(content).simple();
const tables = await sql`
  SELECT tablename FROM pg_tables WHERE tablename LIKE 'auction_%' ORDER BY tablename
`;
console.log("Applied. auction tables:", tables.map((t) => t.tablename).join(", "));
await sql.end();
