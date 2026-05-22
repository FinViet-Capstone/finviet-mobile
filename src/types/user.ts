/**
 * user.ts - FinViet type definitions for the User domain
 *
 * Monetary amounts: number = whole Vietnamese Dong (VND).
 *
 * Date fields:
 *   DATE columns   : ISO 8601 string "YYYY-MM-DD"
 *   TIMESTAMPTZ    : ISO 8601 string "YYYY-MM-DDTHH:mm:ssZ"
 */

// -------------------------------------------------------------------------
// Notification preferences (maps to notif_budget / notif_report / notif_goals)
// -------------------------------------------------------------------------

export interface NotificationSettings {
  /** Push notification when a budget category reaches 80% */
  budget: boolean;
  /** Push notification when the weekly AI report is ready */
  report: boolean;
  /** Push notification when a savings goal milestone is reached */
  goals: boolean;
}

// -------------------------------------------------------------------------
// User preferences (surfaced on the More -> Preferences screen)
// -------------------------------------------------------------------------

export type AppLanguage = 'vi' | 'en';
export type AppTheme = 'light' | 'dark' | 'system';

export interface UserPreferences {
  language: AppLanguage;
  /** UUID of the wallet pre-selected when logging a transaction */
  defaultWalletId: string | null;
  /** ISO 4217 currency code -- default "VND" */
  defaultCurrency: string;
  theme: AppTheme;
}

// -------------------------------------------------------------------------
// User
// -------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  /** Null when the account was created via Google OAuth only */
  passwordHash: string | null;
  /** Google OAuth subject identifier; null for email-only accounts */
  googleId: string | null;
  displayName: string;
  avatarUrl: string | null;
  /** Estimated monthly income in whole VND; null until set during onboarding */
  monthlyIncome: number | null;
  defaultWalletId: string | null;
  defaultCurrency: string;
  language: AppLanguage;
  theme: AppTheme;
  isActive: boolean;
  /** False until the user clicks the verification link in their inbox. Soft gate -- onboarding still runs. */
  emailVerified: boolean;
  notifications: NotificationSettings;
  /** Firebase Cloud Messaging device token for push notifications */
  fcmToken: string | null;
  onboardingDone: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// -------------------------------------------------------------------------
// Auth payloads
// -------------------------------------------------------------------------

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

// -------------------------------------------------------------------------
// Onboarding & profile update payloads
// -------------------------------------------------------------------------

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
  language?: AppLanguage;
  theme?: AppTheme;
  defaultWalletId?: string | null;
  defaultCurrency?: string;
  notifications?: Partial<NotificationSettings>;
}
