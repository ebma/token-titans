import type {
  AuthRequestEvent,
  AuthResponseEvent,
  GameStartEvent,
  Player,
  ReconnectFailedEvent,
  ReconnectRequestEvent,
  Titan
} from "@shared/index";
import { v4 as uuidv4 } from "uuid";
import { WebSocket } from "ws";
import { ServerContext } from "../serverContext";

/**
 * Handle authentication request (new login)
 */
export function handleAuthRequest(ws: WebSocket, event: AuthRequestEvent, ctx: ServerContext) {
  const { username } = event.payload;
  const userId = uuidv4();
  const sessionId = uuidv4();

  const newPlayer: Player = { id: userId, status: "lobby", username };
  ctx.users.set(userId, newPlayer);
  ctx.setUserConnection(userId, ws);
  ctx.sessions.set(sessionId, { userId, username });
  ctx.lobbyManager.addPlayer(newPlayer);

  // Generate initial titan for the player
  ctx.titanManager.generateInitialTitan(userId);
  const titans = ctx.titanManager.getTitansForPlayer(userId);

  const response: AuthResponseEvent = {
    payload: { sessionId, titans, userId, username },
    type: "authResponse"
  };
  ws.send(JSON.stringify(response));
  console.log(`User ${username} authenticated with userId ${userId}`);
  ctx.broadcastLobbyUpdate();
}

/**
 * Handle reconnect request using an existing sessionId
 */
export function handleReconnectRequest(ws: WebSocket, event: ReconnectRequestEvent, ctx: ServerContext) {
  const { sessionId } = event.payload;
  const session = ctx.sessions.get(sessionId);

  if (session) {
    const { userId, username } = session;
    console.log(`Reconnecting user ${username} with session ${sessionId}`);
    // Update connections
    ctx.setUserConnection(userId, ws);

    // Ensure user exists in the main users map if they aren't there
    if (!ctx.users.has(userId)) {
      const newPlayer: Player = { id: userId, status: "lobby", username };
      ctx.users.set(userId, newPlayer);
      ctx.lobbyManager.addPlayer(newPlayer);
    }

    // Send auth response
    // Generate initial titan for the player (if not present)
    ctx.titanManager.generateInitialTitan(userId);
    const titans = ctx.titanManager.getTitansForPlayer(userId);
    const authResponse: AuthResponseEvent = {
      payload: { sessionId, titans, userId, username },
      type: "authResponse"
    };
    ws.send(JSON.stringify(authResponse));

    // Send current lobby state
    ctx.broadcastLobbyUpdate();

    // Check if user is in a game and send game state
    const game = ctx.gameManager.getGameByPlayerId(userId);
    if (game) {
      const titans = Object.values(game.titans || {});
      const gameStartEvent: GameStartEvent = {
        payload: { game, titans },
        type: "gameStart"
      };
      ws.send(JSON.stringify(gameStartEvent));
    }
  } else {
    console.log(`Invalid session ID received: ${sessionId}`);
    const failureEvent: ReconnectFailedEvent = {
      payload: { reason: "session_not_found" },
      type: "reconnectFailed"
    };
    ws.send(JSON.stringify(failureEvent));
  }
}
