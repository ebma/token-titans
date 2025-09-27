import { PlayerList } from "./PlayerList";
import { RoomList } from "./RoomList";
import type { Player, Room } from "shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRoomDialog } from "./CreateRoomDialog";

const samplePlayers: Player[] = [
  { id: '1', username: 'PlayerOne', status: 'lobby' },
  { id: '2', username: 'PlayerTwo', status: 'in-game' },
];

const sampleRooms: Room[] = [
  { id: '1', name: 'Room 1', players: ['1'], maxPlayers: 2 },
  { id: '2', name: 'Room 2', players: [], maxPlayers: 4 },
];

export function Lobby() {
  return (
    <div className="flex flex-col min-h-screen ">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold tracking-tight">Game Lobby</h1>
      </header>
      <main className="flex-1 p-4 md:p-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerList players={samplePlayers} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Game Rooms</CardTitle>
                <CreateRoomDialog />
              </div>
            </CardHeader>
            <CardContent>
              <RoomList rooms={sampleRooms} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
