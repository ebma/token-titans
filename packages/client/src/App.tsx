import type {
  AppEvent,
  AuthResponseEvent,
  GameStartEvent,
  LobbyInfoRequestEvent,
  LobbyUpdateEvent,
  ReconnectFailedEvent,
  ReconnectRequestEvent,
  TitansUpdateEvent
} from "@shared/index";
import { useEffect, useMemo, useRef, useState } from "react";
import { WEB_SERVER_URL } from "@/lib/constants.ts";
import { LoginForm } from "./components/auth/LoginForm";
import { GameView } from "./components/game/GameView";
import { Lobby } from "./components/lobby/Lobby";
import { useAuthStore } from "./hooks/useAuthStore";
import { useGameStore } from "./hooks/useGameStore";
import { useLobbyStore } from "./hooks/useLobbyStore";

import { useTitanStore } from "./hooks/useTitanStore";

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [serverOnline, setServerOnline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { session, setSession, clearSession } = useAuthStore();
  const setTitans = useTitanStore(state => state.setTitans);
  const { game, setGame, setLastRoundResult } = useGameStore();
  const { setLobbyState } = useLobbyStore();

  useEffect(() => {
    let cancelled = false;
    const httpUrl = WEB_SERVER_URL.replace(/^ws/, "http");

    const pollServer = async () => {
      while (!cancelled) {
        try {
          const response = await fetch(httpUrl);
          const data = await response.json();
          if (data.status === 200) {
            setServerOnline(true);
            break;
          }
        } catch {
          // retry after 10s
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    };

    pollServer().then(() => {
      if (!cancelled) {
        const socket = new WebSocket(WEB_SERVER_URL);
        setWs(socket);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log("Connected to server");
          const rehydratedSession = useAuthStore.getState().session;

          if (rehydratedSession?.sessionId) {
            console.log("Reconnecting with session:", rehydratedSession.sessionId);
            const event: ReconnectRequestEvent = {
              payload: { sessionId: rehydratedSession.sessionId },
              type: "reconnectRequest"
            };
            socket.send(JSON.stringify(event));
          } else {
            console.log("New connection, requesting lobby info");
            const event: LobbyInfoRequestEvent = { type: "lobbyInfoRequest" };
            socket.send(JSON.stringify(event));
          }
        };

        socket.onmessage = event => {
          const receivedEvent: AppEvent = JSON.parse(event.data);

          console.log("Received event:", receivedEvent);

          if (receivedEvent.type === "reconnectFailed") {
            console.warn("Reconnect failed:", (receivedEvent as ReconnectFailedEvent).payload.reason);
            // clear persisted session so UI shows LoginForm
            clearSession();
            // optionally clear titans as well
            setTitans([]);
            return;
          }

          if (receivedEvent.type === "authResponse") {
            const { titans, ...sessionPayload } = (receivedEvent as AuthResponseEvent).payload;
            setSession(sessionPayload);
            setTitans(titans);
          } else if (receivedEvent.type === "gameStart") {
            const { game, titans } = (receivedEvent as GameStartEvent).payload;
            if (titans) {
              // Always store the full titan list from the server so UI can display both player and opponent stats.
              setTitans(titans);
            }
            setGame(game);
          } else if (receivedEvent.type === "GameUpdate") {
            const payload = receivedEvent.payload;
            setGame(payload.game);
          } else if (receivedEvent.type === "RoundComplete") {
            const payload = receivedEvent.payload;
            setLastRoundResult(payload.roundResult);
          } else if (receivedEvent.type === "lobbyUpdate") {
            setLobbyState((receivedEvent as LobbyUpdateEvent).payload);
          } else if (receivedEvent.type === "titansUpdate") {
            setTitans((receivedEvent as TitansUpdateEvent).payload.titans);
          } else {
            console.log("Message from server ", receivedEvent.type);
          }
        };

        socket.onclose = () => {
          console.log("Disconnected from server");
        };
      }
    });

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [setSession, setGame, setLobbyState, clearSession, setTitans, setLastRoundResult]);

  const content = useMemo(() => {
    if (game) {
      return <GameView ws={ws} />;
    }

    if (!session) {
      if (serverOnline) {
        return <LoginForm ws={ws} />;
      } else {
        return <div>Server is starting; retrying connection...</div>;
      }
    }

    return <Lobby ws={ws} />;
  }, [ws, session, game, serverOnline]);

  return <div className="min-h-screen bg-gray-100 dark:bg-gray-900">{content}</div>;
}

export default App;
