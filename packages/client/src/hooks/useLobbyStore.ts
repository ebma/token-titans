import { create } from "zustand";
import type { Player, Room } from "../../../shared/src/index";

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
