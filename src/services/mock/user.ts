import type { Customer } from '../../types';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_USER: Customer = {
  id: 'user_khoi_01',
  email: 'khoicongviec@gmail.com',
  /**
   * Email/password account — no Google OAuth, no uploaded avatar yet.
   * All three nullable identity fields must be explicitly null to satisfy
   * the Customer interface (string | null, not optional).
   */
  passwordHash: null,   // hash lives on the server; client never holds it
  googleId: null,       // email-only account
  avatarUrl: null,      // user has not uploaded a photo yet
  displayName: 'Nguyễn Khánh Khôi',
  gender: 'male',
  dateOfBirth: '1999-05-20',
  monthlyIncome: 12_000_000,
  needsPct: 50,
  wantsPct: 30,
  savingsPct: 20,
  defaultCurrency: 'VND',
  language: 'vi',
  theme: 'system',
  isActive: true,
  emailVerified: true,   // existing demo user is fully verified
  /** Nested NotificationSettings object — mirrors the DB columns notif_budget/notif_report/notif_goals */
  notifications: {
    budget: true,
    report: true,
    goals: true,
  },
  fcmToken: 'mock_fcm_token_abc123',
  onboardingDone: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-05-21T00:00:00.000Z',
};

// ─── Service Functions ─────────────────────────────────────────────────────────

export function getCustomer(): Customer {
  return MOCK_USER;
}
