import type { Player, Room } from "@shared/index";
import { randomUUID } from "crypto";

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

  leaveRoom(playerId: string) {
    for (const room of this.rooms.values()) {
      const playerIndex = room.players.indexOf(playerId);
      if (playerIndex > -1) {
        room.players.splice(playerIndex, 1);
      }
    }
  }

  joinRoom(playerId: string, roomId: string) {
    this.leaveRoom(playerId);
    const room = this.rooms.get(roomId);
    if (room && room.players.length < room.maxPlayers) {
      room.players.push(playerId);
    }
  }
}
