import type { CreateGameRequestEvent, Player, Room } from "shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerList } from "./PlayerList";

type CurrentRoomProps = {
  room: Room;
  players: Player[];
  ws: WebSocket | null;
};

export function CurrentRoom({ room, players, ws }: CurrentRoomProps) {
  const playersInRoom = players.filter(p => room.players.includes(p.id));

  const handleStartGame = () => {
    if (!ws) {
      return;
    }

    const event: CreateGameRequestEvent = {
      payload: {
        playerIds: room.players
      },
      type: "createGameRequest"
    };
    ws.send(JSON.stringify(event));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{room.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <PlayerList players={playersInRoom} />
      </CardContent>
      <CardFooter>
        <Button disabled={room.players.length !== room.maxPlayers} onClick={handleStartGame}>
          Start Game
        </Button>
      </CardFooter>
    </Card>
  );
}
