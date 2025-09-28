import { WebSocketServer } from "ws";
import { setupConnectionHandler } from "./connection";
import { ServerContext } from "./serverContext";

const port = Number.parseInt(process.env.PORT || "4000", 10);
const wss = new WebSocketServer({ port });
const ctx = new ServerContext(wss);

// Wire up connection handling (delegates event handling to handlers/)
setupConnectionHandler(wss, ctx);

console.log(`WebSocket server started on port ${port}`);
