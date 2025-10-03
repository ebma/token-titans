import type { Game, RoundResult } from "@shared/index";
import { create } from "zustand";

type GameState = {
  game: Game | null;
  setGame: (game: Game | null) => void;
  lastRoundResult: RoundResult | null;
  setLastRoundResult: (roundResult: RoundResult | null) => void;
};

export const useGameStore = create<GameState>(set => ({
  game: null,
  lastRoundResult: null,
  setGame: game => set({ game }),
  setLastRoundResult: lastRoundResult => set({ lastRoundResult })
}));
