import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { initAuctionEngine } from "./src/auction/engine.ts";

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
  const server = createServer((req, res) => handle(req, res));
  const io = new Server(server, { cors: { origin: "*" } });
  initAuctionEngine(io);
  server.listen(port, () => {
    console.log(`> NTG Auction ready on http://localhost:${port} (dev=${dev})`);
  });
});
