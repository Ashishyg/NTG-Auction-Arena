import postgres from "postgres";

// Lazily open the connection on first query, so importing this module (e.g.
// during `next build`) doesn't require DATABASE_URL to be present.
let instance: ReturnType<typeof postgres> | null = null;
function getSql() {
  if (!instance) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    instance = postgres(process.env.DATABASE_URL, { ssl: "require" });
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
