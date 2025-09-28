import type { AppEvent } from "@shared/index";
import { WebSocket } from "ws";
import { ServerContext } from "../serverContext";
import { handleAuthRequest, handleReconnectRequest } from "./auth";
import { handleCreateGameRequest, handlePlayerAction } from "./game";
import { handleCreateRoomRequest, handleJoinRoomRequest, handleLobbyInfoRequest } from "./lobby";

/**
 * Central dispatcher for incoming AppEvent objects.
 * Delegates to specialized handler modules.
 */
export function handleEvent(ws: WebSocket, event: AppEvent, ctx: ServerContext) {
  switch (event.type) {
    case "authRequest":
      return handleAuthRequest(ws, event, ctx);
    case "reconnectRequest":
      return handleReconnectRequest(ws, event, ctx);
    case "createGameRequest":
      return handleCreateGameRequest(ws, event, ctx);
    case "playerAction":
      return handlePlayerAction(ws, event, ctx);
    case "lobbyInfoRequest":
      return handleLobbyInfoRequest(ws, event, ctx);
    case "createRoomRequest":
      return handleCreateRoomRequest(ws, event, ctx);
    case "joinRoomRequest":
      return handleJoinRoomRequest(ws, event, ctx);
    default:
      // Unhandled events are just logged for now
      console.log("Unhandled event type in dispatcher:", event.type);
      return;
  }
}
