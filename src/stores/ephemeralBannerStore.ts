import { create } from 'zustand';

// UI-only, purely local banner surface for events that never touch the backend
// AppNotification model (e.g. "your CSV import finished while you were on another
// tab") — deliberately separate from NotificationProvider's AppNotification queue,
// which is typed to backend-driven notification rows.
export interface EphemeralBanner {
  title: string;
  body: string;
  onPress: () => void;
}

interface EphemeralBannerState {
  banner: EphemeralBanner | null;
  show: (banner: EphemeralBanner) => void;
  dismiss: () => void;
}

export const useEphemeralBannerStore = create<EphemeralBannerState>((set) => ({
  banner: null,
  show: (banner) => set({ banner }),
  dismiss: () => set({ banner: null }),
}));
