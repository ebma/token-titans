import { create } from 'zustand';

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

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
