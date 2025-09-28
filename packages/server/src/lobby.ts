import { randomUUID } from "crypto";
import type { Player, Room } from "../../shared/src";

export class LobbyManager {
  players = new Map<string, Player>();
  rooms = new Map<string, Room>();

  addPlayer(player: Player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
  }

  createRoom(name: string, maxPlayers: number): Room {
    const newRoom: Room = {
      id: randomUUID(),
      maxPlayers,
      name,
      players: []
    };
    this.rooms.set(newRoom.id, newRoom);
    return newRoom;
  }

  getLobbyState() {
    return {
      players: Array.from(this.players.values()),
      rooms: Array.from(this.rooms.values())
    };
  }
}
