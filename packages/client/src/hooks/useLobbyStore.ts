import type { Player, Room } from "@shared/index.ts";
import { create } from "zustand";

interface LobbyState {
  players: Player[];
  rooms: Room[];
  setLobbyState: (data: { players: Player[]; rooms: Room[] }) => void;
}

export const useLobbyStore = create<LobbyState>(set => ({
  players: [],
  rooms: [],
  setLobbyState: data => set({ players: data.players, rooms: data.rooms })
}));
