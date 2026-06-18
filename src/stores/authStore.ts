import { create } from 'zustand';
import type { Customer } from '@/types';
import { clearAuthTokens } from '@/lib/mmkv';

// UI-only auth state — drives which screen tree RootNavigator renders.
// Token storage and API calls are deferred to the data layer iteration.

interface AuthState {
  isAuthenticated: boolean;
  onboardingDone:  boolean;
  customer:        Customer | null;
  /** False until session bootstrap (token rehydrate) finishes on app launch. */
  hydrated:        boolean;

  setSession:         (customer: Customer) => void;
  clearSession:       () => void;
  updateCustomer:     (patch: Partial<Customer>) => void;
  markOnboardingDone: () => void;
  setHydrated:        (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  onboardingDone:  false,
  customer:        null,
  hydrated:        false,

  setSession(customer) {
    set({ isAuthenticated: true, onboardingDone: customer.onboardingDone, customer });
  },

  clearSession() {
    clearAuthTokens();
    set({ isAuthenticated: false, onboardingDone: false, customer: null });
  },

  updateCustomer(patch) {
    set((state) => ({
      customer: state.customer ? { ...state.customer, ...patch } : null,
    }));
  },

  markOnboardingDone() {
    set((state) => ({
      onboardingDone: true,
      customer: state.customer ? { ...state.customer, onboardingDone: true } : null,
    }));
  },

  setHydrated(value) {
    set({ hydrated: value });
  },
}));
