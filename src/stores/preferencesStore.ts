import { create } from 'zustand';

// UI-only preferences state — drives theme, language, and default selections.
// Persistence to storage is deferred to the data layer iteration.

interface PreferencesState {
  language:        'vi' | 'en';
  theme:           'light' | 'dark' | 'system';
  defaultWalletId: string | null;
  defaultCurrency: string;

  setLanguage:        (lang: 'vi' | 'en') => void;
  setTheme:           (theme: 'light' | 'dark' | 'system') => void;
  setDefaultWallet:   (walletId: string) => void;
  setDefaultCurrency: (currency: string) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language:        'vi',
  theme:           'system',
  defaultWalletId: null,
  defaultCurrency: 'VND',

  setLanguage:        (language)        => set({ language }),
  setTheme:           (theme)           => set({ theme }),
  setDefaultWallet:   (defaultWalletId) => set({ defaultWalletId }),
  setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
}));
