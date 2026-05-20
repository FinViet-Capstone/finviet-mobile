export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  monthlyIncome?: number;
  defaultWalletId?: string;
  defaultCurrency: string;
  language: 'vi' | 'en';
  theme: 'light' | 'dark' | 'system';
  isActive: boolean;
  notifBudget: boolean;
  notifReport: boolean;
  notifGoals: boolean;
  fcmToken?: string;
  onboardingDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface OnboardingPayload {
  monthlyIncome: number;
  defaultCurrency: string;
  walletName: string;
  walletType: 'cash' | 'momo' | 'bank_account';
  initialBalance: number;
}

export interface UpdateProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  monthlyIncome?: number;
}

export interface UpdatePreferencesPayload {
  language?: 'vi' | 'en';
  theme?: 'light' | 'dark' | 'system';
  defaultWalletId?: string;
  defaultCurrency?: string;
  notifBudget?: boolean;
  notifReport?: boolean;
  notifGoals?: boolean;
}
