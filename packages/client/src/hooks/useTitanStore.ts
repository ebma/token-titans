// [`useTitanStore.ts`](packages/client/src/hooks/useTitanStore.ts:1)
import { create } from "zustand";
import type { Titan } from "../../../shared/src/index";

interface TitanStoreState {
  titans: Titan[];
  setTitans: (titans: Titan[]) => void;
}

export const useTitanStore = create<TitanStoreState>(set => ({
  setTitans: titans => set({ titans }),
  titans: []
}));
