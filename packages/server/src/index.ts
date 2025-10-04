import http from "http";
import { WebSocketServer } from "ws";
import { setupConnectionHandler } from "./connection";
import { ServerContext } from "./serverContext";

const port = Number.parseInt(process.env.PORT || "4000", 10);

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: 200 }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Attach WebSocket server to the same HTTP server
const wss = new WebSocketServer({ server });
const ctx = new ServerContext(wss);

// Wire up connection handling (delegates event handling to handlers/)
setupConnectionHandler(wss, ctx);

// Start server
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
