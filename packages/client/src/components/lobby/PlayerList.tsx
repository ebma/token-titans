import type { Player } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PlayerList({ players }: { players: Player[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Player</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map(player => (
            <TableRow key={player.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/8.x/bottts/svg?seed=${player.username}`} />
                    <AvatarFallback>{player.username.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{player.username}</span>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2 py-1 font-medium text-xs ${
                    player.status === "in-game"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                  }`}
                >
                  {player.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
