import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Room } from "shared";

export function RoomList({ rooms }: { rooms: Room[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => (
        <Card key={room.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{room.name}</CardTitle>
            <CardDescription>
              {room.players.length}/{room.maxPlayers} players
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm">
              A game of something.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Join Room</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
