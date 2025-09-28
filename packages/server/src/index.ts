import type {
  AppEvent,
  AuthRequestEvent,
  AuthResponseEvent,
  CreateGameRequestEvent,
  CreateRoomRequestEvent,
  GameStartEvent,
  LobbyUpdateEvent,
  Player,
  PlayerActionEvent,
  ReconnectFailedEvent,
  ReconnectRequestEvent,
  Titan
} from "@shared/index";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { GameManager } from "./game";
import { LobbyManager } from "./lobby";
import { TitanManager } from "./titans";

const titanManager = new TitanManager();

const port = Number.parseInt(process.env.PORT || "4000", 10);

const wss = new WebSocketServer({ port });
const gameManager = new GameManager();
const lobbyManager = new LobbyManager();

const sessions = new Map<string, { userId: string; username: string }>();
const userConnections = new Map<string, WebSocket>(); // userId -> WebSocket
const wsConnections = new Map<WebSocket, string>(); // WebSocket -> userId
const users = new Map<string, Player>();

const broadcastLobbyUpdate = () => {
  const lobbyState = lobbyManager.getLobbyState();
  const lobbyUpdateEvent: LobbyUpdateEvent = {
    payload: lobbyState,
    type: "lobbyUpdate"
  };
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(lobbyUpdateEvent));
    }
  });
};

wss.on("connection", function connection(ws: WebSocket) {
  console.log("Client connected");

  ws.on("message", function message(data) {
    const event: AppEvent = JSON.parse(data.toString());

    console.log("received message: ", event);

    if (event.type === "authRequest") {
      const { username } = (event as AuthRequestEvent).payload;
      const userId = uuidv4();
      const sessionId = uuidv4();
      const newPlayer: Player = { id: userId, status: "lobby", username };
      users.set(userId, newPlayer);
      userConnections.set(userId, ws);
      wsConnections.set(ws, userId);
      sessions.set(sessionId, { userId, username });
      lobbyManager.addPlayer(newPlayer);

      // Generate initial titan for the player
      titanManager.generateInitialTitan(userId);
      const titans = titanManager.getTitansForPlayer(userId);
      const response: AuthResponseEvent = {
        payload: { sessionId, titans, userId, username },
        type: "authResponse"
      };
      ws.send(JSON.stringify(response));
      console.log(`User ${username} authenticated with userId ${userId}`);
      broadcastLobbyUpdate();
    } else if (event.type === "createGameRequest") {
      const { playerIds } = (event as CreateGameRequestEvent).payload;
      const gamePlayers = playerIds.map(id => users.get(id)).filter(Boolean) as Player[];

      if (gamePlayers.length === playerIds.length) {
        // Build mapping playerId -> titanId:
        // 1) Prefer GameManager's tracked active titan if present
        // 2) Otherwise fall back to TitanManager's first titan for the player (if any)
        const activeTitansForRequest: Record<string, string> = {};
        for (const pid of playerIds) {
          const active = gameManager.getActiveTitan(pid); // use GameManager's API
          if (active) {
            activeTitansForRequest[pid] = active;
          } else {
            const playerTitans = titanManager.getTitansForPlayer(pid);
            if (playerTitans.length > 0) {
              activeTitansForRequest[pid] = playerTitans[0].id; // fallback to first titan
            }
          }
        }

        const game = gameManager.createGame(gamePlayers, activeTitansForRequest);
        const titanIds = Object.values(game.titans || {});
        const titans: Titan[] = titanIds.map(id => titanManager.titans.get(id)).filter(Boolean) as Titan[];
        const gameStartEvent: GameStartEvent = {
          payload: { game, titans },
          type: "gameStart"
        };

        game.players.forEach(playerId => {
          const playerWs = userConnections.get(playerId);
          if (playerWs) {
            playerWs.send(JSON.stringify(gameStartEvent));
          }
        });
        console.log(`Game ${game.id} created for players: ${playerIds.join(", ")}`);
      }
    } else if (event.type === "playerAction") {
      const { gameId, playerId, action } = (event as PlayerActionEvent).payload;
      const game = gameManager.handlePlayerAction(gameId, playerId, action);
      if (game) {
        const titanIds = Object.values(game.titans || {});
        const titans: Titan[] = titanIds.map(id => titanManager.titans.get(id)).filter(Boolean) as Titan[];
        const gameUpdateEvent = {
          payload: { game, titans },
          type: "GameUpdate"
        };
        game.players.forEach(pId => {
          const playerWs = userConnections.get(pId);
          if (playerWs) {
            playerWs.send(JSON.stringify(gameUpdateEvent));
          }
        });
      }
    } else if (event.type === "lobbyInfoRequest") {
      const lobbyState = lobbyManager.getLobbyState();
      const lobbyUpdateEvent: LobbyUpdateEvent = {
        payload: lobbyState,
        type: "lobbyUpdate"
      };
      ws.send(JSON.stringify(lobbyUpdateEvent));
    } else if (event.type === "createRoomRequest") {
      const { name, maxPlayers } = (event as CreateRoomRequestEvent).payload;
      lobbyManager.createRoom(name, maxPlayers);
      broadcastLobbyUpdate();
    } else if (event.type === "joinRoomRequest") {
      const userId = wsConnections.get(ws);
      if (userId) {
        lobbyManager.joinRoom(userId, event.payload.roomId);
        broadcastLobbyUpdate();
      }
    } else if (event.type === "reconnectRequest") {
      const { sessionId } = (event as ReconnectRequestEvent).payload;
      const session = sessions.get(sessionId);

      if (session) {
        const { userId, username } = session;
        console.log(`Reconnecting user ${username} with session ${sessionId}`);
        // Update connections
        userConnections.set(userId, ws);
        wsConnections.set(ws, userId);

        // Ensure user exists in the main users map if they aren't there
        if (!users.has(userId)) {
          const newPlayer: Player = { id: userId, status: "lobby", username };
          users.set(userId, newPlayer);
          lobbyManager.addPlayer(newPlayer);
        }

        // Send auth response
        // Generate initial titan for the player (if not present)
        titanManager.generateInitialTitan(userId);
        const titans = titanManager.getTitansForPlayer(userId);
        const authResponse: AuthResponseEvent = {
          payload: { sessionId, titans, userId, username },
          type: "authResponse"
        };
        ws.send(JSON.stringify(authResponse));

        // Send current lobby state
        broadcastLobbyUpdate();

        // Check if user is in a game and send game state
        const game = gameManager.getGameByPlayerId(userId);
        if (game) {
          const titanIds = Object.values(game.titans || {});
          const titans: Titan[] = titanIds.map(id => titanManager.titans.get(id)).filter(Boolean) as Titan[];
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
    } else {
      console.log("received: %s", event.type);
    }
  });

  ws.on("close", () => {
    const userId = wsConnections.get(ws);
    if (userId) {
      lobbyManager.leaveRoom(userId);
      users.delete(userId);
      userConnections.delete(userId);
      wsConnections.delete(ws);
      lobbyManager.removePlayer(userId);
      console.log(`User ${userId} disconnected`);
      broadcastLobbyUpdate();
    } else {
      console.log("Client disconnected");
    }
  });
});

console.log(`WebSocket server started on port ${port}`);
