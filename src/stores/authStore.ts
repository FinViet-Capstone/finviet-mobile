import { create } from 'zustand';
import type { Customer } from '@/types';
import { clearAuthTokens } from '@/lib/mmkv';
import { queryClient } from '@/lib/queryClient';

// Most query keys (wallets, transactions, budgets...) carry no account id, so
// cached server data must never outlive the session it was fetched for, or the
// next account on this device is shown the previous one's data. Mutations are
// left alone: a login's own onSuccess is running when setSession fires.
function dropCachedServerData() {
  queryClient.removeQueries();
}

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

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  onboardingDone:  false,
  customer:        null,
  hydrated:        false,

  setSession(customer) {
    if (get().customer?.id !== customer.id) dropCachedServerData();
    set({ isAuthenticated: true, onboardingDone: customer.onboardingDone, customer });
  },

  clearSession() {
    clearAuthTokens();
    dropCachedServerData();
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
