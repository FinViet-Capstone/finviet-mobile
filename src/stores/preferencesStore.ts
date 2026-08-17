import { create } from 'zustand';

// UI-only preferences state — drives language and default selections.
// Persistence to storage is deferred to the data layer iteration.
//
// Theme used to live here too (`theme`/`setTheme`), but had zero consumers
// and contradicted the real source of truth: a logged-in customer's theme
// comes from `useCustomer().theme` (backend-persisted via
// `useUpdatePreferences`), and the pre-login/logged-out fallback comes from
// `src/lib/themeCache.ts`, both resolved through `ThemeProvider`. Removed
// rather than left to silently do nothing if something started calling it.

interface PreferencesState {
  language:        'vi' | 'en';
  defaultWalletId: string | null;
  defaultCurrency: string;

  setLanguage:        (lang: 'vi' | 'en') => void;
  setDefaultWallet:   (walletId: string) => void;
  setDefaultCurrency: (currency: string) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language:        'vi',
  defaultWalletId: null,
  defaultCurrency: 'VND',

  setLanguage:        (language)        => set({ language }),
  setDefaultWallet:   (defaultWalletId) => set({ defaultWalletId }),
  setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
}));
