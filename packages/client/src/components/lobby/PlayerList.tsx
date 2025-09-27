import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Player } from "shared";

export function PlayerList({ players }: { players: Player[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => (
          <TableRow key={player.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/8.x/bottts/svg?seed=${player.username}`} />
                  <AvatarFallback>{player.username.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span>{player.username}</span>
              </div>
            </TableCell>
            <TableCell>{player.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
