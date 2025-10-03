// [`useTitanStore.ts`](packages/client/src/hooks/useTitanStore.ts:1)
import type { Titan } from "@shared/index.ts";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

interface TitanStoreState {
  titans: Titan[];
  setTitans: (titans: Titan[]) => void;
  getPlayerTitans: () => Titan[];
}

export const useTitanStore = create<TitanStoreState>((set, get) => ({
  getPlayerTitans: () => {
    const userId = useAuthStore.getState().session?.userId;
    if (!userId) return [];
    return get().titans.filter(t => t.ownerId === userId);
  },
  setTitans: titans => set({ titans }),
  titans: []
}));
