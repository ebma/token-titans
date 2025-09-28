import type { JoinRoomRequestEvent, Room } from "shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type RoomListProps = {
  rooms: Room[];
  ws: WebSocket | null;
};

export function RoomList({ rooms, ws }: RoomListProps) {
  const handleJoinRoom = (roomId: string) => {
    if (!ws) {
      return;
    }

    const event: JoinRoomRequestEvent = {
      payload: { roomId },
      type: "joinRoomRequest"
    };

    ws.send(JSON.stringify(event));
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map(room => (
        <Card className="flex flex-col" key={room.id}>
          <CardHeader>
            <CardTitle>{room.name}</CardTitle>
            <CardDescription>
              {room.players.length}/{room.maxPlayers} players
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm">A game of something.</p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={room.players.length >= room.maxPlayers}
              onClick={() => handleJoinRoom(room.id)}
            >
              Join Room
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
