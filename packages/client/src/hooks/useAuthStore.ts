import { create } from "zustand";
import { persist } from "zustand/middleware";

type Session = {
  sessionId: string;
  userId: string;
  username: string;
};

type AuthState = {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

export const useAuthStore = create(
  persist<AuthState>(
    set => ({
      clearSession: () => set({ session: null }),
      session: null,
      setSession: session => set({ session })
    }),
    {
      name: "auth-storage" // name of the item in the storage (must be unique)
    }
  )
);
