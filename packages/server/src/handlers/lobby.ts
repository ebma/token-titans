import type { CreateRoomRequestEvent, JoinRoomRequestEvent, LobbyInfoRequestEvent, LobbyUpdateEvent } from "@shared/index";
import { WebSocket } from "ws";
import { ServerContext } from "../serverContext";

/**
 * Handle lobby info request: send current lobby state to requester
 */
export function handleLobbyInfoRequest(ws: WebSocket, event: LobbyInfoRequestEvent, ctx: ServerContext) {
  const lobbyState = ctx.lobbyManager.getLobbyState();
  const lobbyUpdateEvent: LobbyUpdateEvent = {
    payload: lobbyState,
    type: "lobbyUpdate"
  };
  ws.send(JSON.stringify(lobbyUpdateEvent));
}

/**
 * Handle create room request: create the room and broadcast updated lobby state
 */
export function handleCreateRoomRequest(ws: WebSocket, event: CreateRoomRequestEvent, ctx: ServerContext) {
  const { name, maxPlayers } = event.payload;
  ctx.lobbyManager.createRoom(name, maxPlayers);
  ctx.broadcastLobbyUpdate();
}

/**
 * Handle join room request: add player to room (if ws is associated with a user) and broadcast update
 */
export function handleJoinRoomRequest(ws: WebSocket, event: JoinRoomRequestEvent, ctx: ServerContext) {
  const userId = ctx.getUserIdForWs(ws);
  if (!userId) return;
  ctx.lobbyManager.joinRoom(userId, event.payload.roomId);
  ctx.broadcastLobbyUpdate();
}
