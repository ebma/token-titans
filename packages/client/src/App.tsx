import type { AppEvent, AuthResponseEvent, GameStartEvent } from "@shared/index";
import { useEffect, useState } from "react";
import { LoginForm } from "./components/auth/LoginForm";
import { GameView } from "./components/game/GameView";
import { Lobby } from "./components/lobby/Lobby";
import { useAuthStore } from "./hooks/useAuthStore";
import { useGameStore } from "./hooks/useGameStore";

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { session, setSession } = useAuthStore();
  const { game, setGame } = useGameStore();

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8081");
    setWs(socket);

    socket.onopen = () => {
      console.log("Connected to server");
    };

    socket.onmessage = event => {
      const receivedEvent: AppEvent = JSON.parse(event.data);

      if (receivedEvent.type === "authResponse") {
        setSession((receivedEvent as AuthResponseEvent).payload);
      } else if (receivedEvent.type === "gameStart") {
        setGame((receivedEvent as GameStartEvent).payload.game);
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
  }, [setSession, setGame]);

  if (game) {
    return <GameView ws={ws} />;
  }

  if (!session) {
    return <LoginForm ws={ws} />;
  }

  return <Lobby ws={ws} />;
}

export default App;
