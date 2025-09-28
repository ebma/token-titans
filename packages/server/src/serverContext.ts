import type { AppEvent, LobbyUpdateEvent, Player } from "@shared/index";
import { WebSocket, WebSocketServer } from "ws";
import { GameManager } from "./game";
import { LobbyManager } from "./lobby";
import { TitanManager } from "./titans";

/**
 * ServerContext - central place for shared server state and helpers.
 * Connection/handler modules should depend on this single object.
 */
export class ServerContext {
  public readonly wss: WebSocketServer;
  public readonly gameManager: GameManager;
  public readonly lobbyManager: LobbyManager;
  public readonly titanManager: TitanManager;

  // session and connection maps
  public readonly sessions = new Map<string, { userId: string; username: string }>();
  public readonly userConnections = new Map<string, WebSocket>(); // userId -> WebSocket
  public readonly wsConnections = new Map<WebSocket, string>(); // WebSocket -> userId
  public readonly users = new Map<string, Player>();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.gameManager = new GameManager();
    this.lobbyManager = new LobbyManager();
    this.titanManager = new TitanManager();
  }

  // Broadcast current lobby state to all connected clients
  public broadcastLobbyUpdate() {
    const lobbyState = this.lobbyManager.getLobbyState();
    const lobbyUpdateEvent: LobbyUpdateEvent = {
      payload: lobbyState,
      type: "lobbyUpdate"
    };
    this.wss.clients.forEach(client => {
      // only attempt to send to open clients
      if ((client as WebSocket).readyState === WebSocket.OPEN) {
        (client as WebSocket).send(JSON.stringify(lobbyUpdateEvent));
      }
    });
  }

  // Send an event to a specific user by userId (if connected)
  public sendToUser(userId: string, event: AppEvent) {
    const ws = this.userConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  // Helper: register a user <-> ws mapping
  public setUserConnection(userId: string, ws: WebSocket) {
    this.userConnections.set(userId, ws);
    this.wsConnections.set(ws, userId);
  }

  // Helper: remove connection mapping for a ws
  public removeConnectionByWs(ws: WebSocket) {
    const userId = this.wsConnections.get(ws);
    if (userId) {
      this.userConnections.delete(userId);
      this.wsConnections.delete(ws);
    }
  }

  // Helper: lookup userId for a ws
  public getUserIdForWs(ws: WebSocket): string | undefined {
    return this.wsConnections.get(ws);
  }
}
