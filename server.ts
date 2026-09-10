import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { initAuctionEngine } from "./src/auction/engine.ts";
import { initVetoEngine } from "./src/veto/engine.ts";

// Custom server runs outside Next's module graph, so load .env.local ourselves
// (Next loads it for routes/pages, but the socket engine lives here).
try {
  process.loadEnvFile?.(".env.local");
} catch {
  /* file optional in prod where env comes from the platform */
}

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3001;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Uptime pings keep Render's free instance from sleeping. Answered here,
    // before Next, so a ping costs no page render and no DB query.
    if (req.url?.split("?")[0] === "/health" && (req.method === "GET" || req.method === "HEAD")) {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      if (req.method === "HEAD") return res.end();
      return res.end(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() }),
      );
    }
    handle(req, res);
  });
  const io = new Server(server, { cors: { origin: "*" } });
  initAuctionEngine(io);
  initVetoEngine(io);
  server.listen(port, () => {
    console.log(`> NTG Services ready on http://localhost:${port} (dev=${dev})`);
  });
});
