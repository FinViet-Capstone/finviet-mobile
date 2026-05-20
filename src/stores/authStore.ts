import { create } from 'zustand';
import type { User } from '@/types';

// UI-only auth state — drives which screen tree RootNavigator renders.
// Token storage and API calls are deferred to the data layer iteration.

interface AuthState {
  isAuthenticated: boolean;
  onboardingDone:  boolean;
  user:            User | null;

  setSession:         (user: User) => void;
  clearSession:       () => void;
  updateUser:         (patch: Partial<User>) => void;
  markOnboardingDone: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  onboardingDone:  false,
  user:            null,

  setSession(user) {
    set({ isAuthenticated: true, onboardingDone: user.onboardingDone, user });
  },

  clearSession() {
    set({ isAuthenticated: false, onboardingDone: false, user: null });
  },

  updateUser(patch) {
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : null,
    }));
  },

  markOnboardingDone() {
    set((state) => ({
      onboardingDone: true,
      user: state.user ? { ...state.user, onboardingDone: true } : null,
    }));
  },
}));
