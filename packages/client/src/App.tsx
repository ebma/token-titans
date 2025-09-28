import type {AppEvent, AuthResponseEvent } from "@shared/index";
import { useEffect, useState } from "react";
import { LoginForm } from "./components/auth/LoginForm";
import { Lobby } from "./components/lobby/Lobby";
import { useAuthStore } from "./hooks/useAuthStore";

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { session, setSession } = useAuthStore();

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
  }, [setSession]);

  if (!session) {
    return <LoginForm ws={ws} />;
  }

  return <Lobby />;
}

export default App;
