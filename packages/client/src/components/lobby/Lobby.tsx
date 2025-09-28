import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useLobbyStore } from "@/hooks/useLobbyStore";
import { useTitanStore } from "@/hooks/useTitanStore";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { CurrentRoom } from "./CurrentRoom";
import { PlayerList } from "./PlayerList";
import { RoomList } from "./RoomList";
import TitanList from "./TitanList";

type LobbyProps = {
  ws: WebSocket | null;
};

export function Lobby({ ws }: LobbyProps) {
  const { session } = useAuthStore();
  const { players, rooms } = useLobbyStore();

  const currentRoom = session ? rooms.find(room => room.players.includes(session.userId)) : undefined;

  return (
    <div className="flex min-h-screen flex-col ">
      <header className="border-b p-4">
        <h1 className="w-fit rounded-2xl bg-primary px-4 font-bold text-3xl tracking-tight">Game Lobby</h1>
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
          <Card>
            <CardHeader>
              <CardTitle>Your Titans</CardTitle>
            </CardHeader>
            <CardContent>
              <TitanList titans={useTitanStore(s => s.titans)} />
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
              <RoomList rooms={rooms} ws={ws} />
            </CardContent>
          </Card>
          {currentRoom && <CurrentRoom players={players} room={currentRoom} ws={ws} />}
        </div>
      </main>
    </div>
  );
}
