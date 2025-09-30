// [`useTitanStore.ts`](packages/client/src/hooks/useTitanStore.ts:1)
import type { Titan } from "@shared/index.ts";
import { create } from "zustand";

interface TitanStoreState {
  titans: Titan[];
  setTitans: (titans: Titan[]) => void;
}

export const useTitanStore = create<TitanStoreState>(set => ({
  setTitans: titans => set({ titans }),
  titans: []
}));
