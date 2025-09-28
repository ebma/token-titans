import type { AppEvent, AuthResponseEvent, GameStartEvent, LobbyInfoRequestEvent, LobbyUpdateEvent } from "@shared/index";
import { useEffect, useState } from "react";
import { WEB_SERVER_URL } from "@/lib/constants.ts";
import { LoginForm } from "./components/auth/LoginForm";
import { GameView } from "./components/game/GameView";
import { Lobby } from "./components/lobby/Lobby";
import { useAuthStore } from "./hooks/useAuthStore";
import { useGameStore } from "./hooks/useGameStore";
import { useLobbyStore } from "./hooks/useLobbyStore";

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { session, setSession } = useAuthStore();
  const { game, setGame } = useGameStore();
  const { setLobbyState } = useLobbyStore();

  useEffect(() => {
    const socket = new WebSocket(WEB_SERVER_URL);
    setWs(socket);

    socket.onopen = () => {
      console.log("Connected to server");
      const event: LobbyInfoRequestEvent = { type: "lobbyInfoRequest" };
      socket.send(JSON.stringify(event));
    };

    socket.onmessage = event => {
      const receivedEvent: AppEvent = JSON.parse(event.data);

      if (receivedEvent.type === "authResponse") {
        setSession((receivedEvent as AuthResponseEvent).payload);
      } else if (receivedEvent.type === "gameStart") {
        setGame((receivedEvent as GameStartEvent).payload.game);
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
  }, [setSession, setGame, setLobbyState]);

  if (game) {
    return <GameView ws={ws} />;
  }

  if (!session) {
    return <LoginForm ws={ws} />;
  }

  return <Lobby ws={ws} />;
}

export default App;
