import type {
  AppEvent,
  AuthResponseEvent,
  GameStartEvent,
  LobbyInfoRequestEvent,
  LobbyUpdateEvent,
  ReconnectFailedEvent,
  ReconnectRequestEvent
} from "@shared/index";
import { useEffect, useMemo, useState } from "react";
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
  const { session, setSession, clearSession } = useAuthStore();
  const setTitans = useTitanStore(state => state.setTitans);
  const { game, setGame } = useGameStore();
  const { setLobbyState } = useLobbyStore();

  useEffect(() => {
    const socket = new WebSocket(WEB_SERVER_URL);
    setWs(socket);

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
        if (titans) setTitans(titans);
        setGame(game);
      } else if (receivedEvent.type === "GameUpdate") {
        const payload = receivedEvent.payload;
        if (payload.titans) setTitans(payload.titans);
        setGame(payload.game);
      } else if (receivedEvent.type === "lobbyUpdate") {
        setLobbyState((receivedEvent as LobbyUpdateEvent).payload);
      } else {
        console.log("Message from server ", receivedEvent.type);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from server");
    };

    return () => {
      socket.close();
    };
  }, [setSession, setGame, setLobbyState, clearSession, setTitans]);

  const content = useMemo(() => {
    if (game) {
      return <GameView ws={ws} />;
    }

    if (!session) {
      return <LoginForm ws={ws} />;
    }

    return <Lobby ws={ws} />;
  }, [ws, session, game]);

  return <div className=" bg-gray-100 dark:bg-gray-900">{content}</div>;
}

export default App;
