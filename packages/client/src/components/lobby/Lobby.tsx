import type { CreateGameRequestEvent } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useLobbyStore } from "@/hooks/useLobbyStore";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { PlayerList } from "./PlayerList";
import { RoomList } from "./RoomList";

type LobbyProps = {
  ws: WebSocket | null;
};

export function Lobby({ ws }: LobbyProps) {
  const { session } = useAuthStore();
  const { players, rooms } = useLobbyStore();

  const handleStartGame = () => {
    if (ws && session) {
      const createGameRequest: CreateGameRequestEvent = {
        payload: {
          playerIds: [session.userId, "dummy-player-id"]
        },
        type: "createGameRequest"
      };
      ws.send(JSON.stringify(createGameRequest));
    }
  };

  return (
    <div className="flex min-h-screen flex-col ">
      <header className="border-b p-4">
        <h1 className="font-bold text-3xl tracking-tight">Game Lobby</h1>
      </header>
      <main className="grid flex-1 gap-6 p-4 md:grid-cols-3 md:p-6">
        <div className="flex flex-col gap-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerList players={players} />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6 md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Game Rooms</CardTitle>
                <CreateRoomDialog ws={ws} />
              </div>
            </CardHeader>
            <CardContent>
              <RoomList rooms={rooms} />
            </CardContent>
          </Card>
          <Button onClick={handleStartGame}>Start Game</Button>
        </div>
      </main>
    </div>
  );
}
