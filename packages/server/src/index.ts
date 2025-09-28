import type {
  AppEvent,
  AuthRequestEvent,
  AuthResponseEvent,
  CreateGameRequestEvent,
  GameStartEvent,
  PlayerActionEvent
} from "@shared/index";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { GameManager } from "./game";

const wss = new WebSocketServer({ port: 8081 });
const gameManager = new GameManager();

const userConnections = new Map<string, WebSocket>(); // userId -> WebSocket
const wsConnections = new Map<WebSocket, string>(); // WebSocket -> userId
const users = new Map<string, { id: string; username: string }>();

wss.on("connection", function connection(ws: WebSocket) {
  console.log("Client connected");

  ws.on("message", function message(data) {
    const event: AppEvent = JSON.parse(data.toString());

    if (event.type === "authRequest") {
      const { username } = (event as AuthRequestEvent).payload;
      const userId = uuidv4();
      users.set(userId, { id: userId, username });
      userConnections.set(userId, ws);
      wsConnections.set(ws, userId);

      const response: AuthResponseEvent = {
        payload: { sessionId: "", userId, username }, // sessionId is not used anymore
        type: "authResponse"
      };
      ws.send(JSON.stringify(response));
      console.log(`User ${username} authenticated with userId ${userId}`);
    } else if (event.type === "createGameRequest") {
      const { playerIds } = (event as CreateGameRequestEvent).payload;
      const gamePlayers = playerIds.map(id => users.get(id)).filter(Boolean) as {
        id: string;
        username: string;
      }[];

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
      console.log(`User ${userId} disconnected`);
    } else {
      console.log("Client disconnected");
    }
  });
});

console.log("WebSocket server started on port 8081");
