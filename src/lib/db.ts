import postgres from "postgres";

// Lazily open the connection on first query, so importing this module (e.g.
// during `next build`) doesn't require DATABASE_URL to be present.
let instance: ReturnType<typeof postgres> | null = null;

/**
 * Supabase's pooler serves both modes on one host: :6543 transaction, :5432
 * session. This is a long-running server, so it uses session mode, which keeps
 * prepared statements — ONE round trip per query instead of two (measured
 * 283 ms vs 571 ms). Derived from DATABASE_URL on purpose: DIRECT_URL here can
 * be the IPv6-only direct host, which Render cannot reach.
 */
function sessionPoolerUrl(url: string): string {
  const u = new URL(url);
  if (!u.hostname.endsWith(".pooler.supabase.com") || u.port !== "6543") return url;
  u.port = "5432";
  u.search = ""; // pgbouncer/connection_limit are Prisma hints, not Postgres params
  return u.toString();
}
function getSql() {
  if (!instance) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    const url = sessionPoolerUrl(process.env.DATABASE_URL);
    // Supabase/pgBouncer transaction pool (port 6543 / ?pgbouncer=true) does not
    // support prepared statements.
    const isTxPooler =
      /(?:[?&]pgbouncer=true|:6543(?:\/|\?|$))/i.test(url);
    if (isTxPooler) {
      console.warn("[db] transaction pooler: prepared statements off, 2 round trips per query.");
    }
    // Do not set max_pipeline: 0 — postgres.js only runs query onexecute
    // (needed for sql.begin to reserve a connection) when sent.length < max_pipeline.
    instance = postgres(url, {
      ssl: "require",
      // Session-mode connections are held for the life of the process and
      // Supabase caps them per project, so keep that pool small.
      ...(isTxPooler ? { prepare: false as const } : { max: 5 }),
    });
  }
  return instance;
}

// Proxy so `sql\`...\``, `sql.json()`, `sql.begin()` all defer to the real
// client without connecting until actually used.
const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply(_t, _this, args: any[]) {
    return (getSql() as any)(...args);
  },
  get(_t, prop) {
    return (getSql() as any)[prop];
  },
});

export default sql;
