import type { Game } from "@shared/index";
import { create } from "zustand";

type GameState = {
  game: Game | null;
  setGame: (game: Game | null) => void;
};

export const useGameStore = create<GameState>(set => ({
  game: null,
  setGame: game => set({ game })
}));
