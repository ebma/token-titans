import { useMemo } from "react";
import { LoginForm } from "./components/auth/LoginForm";
import { GameView } from "./components/game/GameView";
import { Lobby } from "./components/lobby/Lobby";
import { useAuthStore } from "./hooks/useAuthStore";
import { useGameStore } from "./hooks/useGameStore";
import { useWebSocketConnection } from "./hooks/useWebSocketConnection";

function App() {
  const { ws, serverOnline } = useWebSocketConnection();
  const { session } = useAuthStore();
  const { game } = useGameStore();

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
