import { PlayerList } from "./PlayerList";
import { RoomList } from "./RoomList";
import type { Player, Room } from "shared";

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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Game Lobby</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-2">Players</h2>
          <PlayerList players={samplePlayers} />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-2">Game Rooms</h2>
          <RoomList rooms={sampleRooms} />
        </div>
      </div>
    </div>
  );
}
