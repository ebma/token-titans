import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import type {
  AppEvent,
  AuthRequestEvent,
  AuthResponseEvent,
  CreateGameRequestEvent,
  CreateRoomRequestEvent,
  GameStartEvent,
  LobbyUpdateEvent,
  Player,
  PlayerActionEvent
} from "../../shared/src";
import { GameManager } from "./game";
import { LobbyManager } from "./lobby";

const port = process.env.PORT || 4000;

const wss = new WebSocketServer({ port });
const gameManager = new GameManager();
const lobbyManager = new LobbyManager();

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
      const newPlayer: Player = { id: userId, status: "lobby", username };
      users.set(userId, newPlayer);
      userConnections.set(userId, ws);
      wsConnections.set(ws, userId);
      lobbyManager.addPlayer(newPlayer);

      const response: AuthResponseEvent = {
        payload: { sessionId: "", userId, username }, // sessionId is not used anymore
        type: "authResponse"
      };
      ws.send(JSON.stringify(response));
      console.log(`User ${username} authenticated with userId ${userId}`);
      broadcastLobbyUpdate();
    } else if (event.type === "createGameRequest") {
      const { playerIds } = (event as CreateGameRequestEvent).payload;
      const gamePlayers = playerIds.map(id => users.get(id)).filter(Boolean) as Player[];

      if (gamePlayers.length === playerIds.length) {
        const game = gameManager.createGame(gamePlayers);
        const gameStartEvent: GameStartEvent = {
          payload: { game },
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
        const gameUpdateEvent = {
          payload: { game },
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
    } else {
      console.log("received: %s", event.type);
    }
  });

  ws.on("close", () => {
    const userId = wsConnections.get(ws);
    if (userId) {
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
