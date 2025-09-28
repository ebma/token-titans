import type { AppEvent } from "@shared/index";
import { WebSocket, WebSocketServer } from "ws";
import { handleEvent } from "./handlers";
import { ServerContext } from "./serverContext";

/**
 * Wire WebSocket connections to the handler dispatcher.
 * Keeps the connection-level plumbing small and delegates event
 * logic to handler modules via ServerContext.
 */
export function setupConnectionHandler(wss: WebSocketServer, ctx: ServerContext) {
  wss.on("connection", function connection(ws: WebSocket) {
    console.log("Client connected");

    ws.on("message", function message(data) {
      let parsed: AppEvent | undefined;
      try {
        parsed = JSON.parse(data.toString()) as AppEvent;
      } catch (err) {
        console.warn("Failed to parse incoming message:", err);
        return;
      }

      if (!parsed) return;

      // Delegate to dispatcher
      try {
        handleEvent(ws, parsed, ctx);
      } catch (err) {
        console.error("Error handling event:", err);
      }
    });

    ws.on("close", () => {
      const userId = ctx.getUserIdForWs(ws);
      if (userId) {
        // Clean up user connection and lobby state
        ctx.lobbyManager.leaveRoom(userId);
        ctx.users.delete(userId);
        ctx.removeConnectionByWs(ws);
        ctx.lobbyManager.removePlayer(userId);
        console.log(`User ${userId} disconnected`);
        ctx.broadcastLobbyUpdate();
      } else {
        console.log("Client disconnected");
      }
    });
  });
}
