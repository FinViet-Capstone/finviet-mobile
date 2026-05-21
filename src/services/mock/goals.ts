import type { SavingsGoalWithProgress } from '../../types';
import { USER_ID, WALLET_IDS } from './wallets';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// 3 savings goals at different progress levels (as of 21 May 2026):
//
//   goal_iphone   — 35.7% complete, long runway (Dec 2026), urgency medium
//   goal_danang   — 70.0% complete, short runway (Jul 2026), urgency high
//   goal_emergency — 92.5% complete, almost done (Nov 2026), urgency low
//
// requiredMonthlySaving and monthsRemaining are pre-calculated here.
// Calculation basis: today = 2026-05-21
//   Months remaining is floored to whole months from Jun onwards to keep maths simple.

const MOCK_GOALS: SavingsGoalWithProgress[] = [
  // ── Mua iPhone 16 Pro Max — 35.7% ────────────────────────────────────────────
  {
    id: 'goal_iphone_01',
    userId: USER_ID,
    name: 'Mua iPhone 16 Pro Max',
    targetAmount: 35_000_000,
    currentAmount: 12_500_000,
    deadline: '2026-12-31',
    fundingWalletId: WALLET_IDS.BANK,
    isCompleted: false,
    isDeleted: false,
    // Derived fields
    progressPercentage: 35.7,
    remainingAmount: 22_500_000,
    monthsRemaining: 7,   // Jun → Dec = 7 months
    requiredMonthlySaving: 3_215_000, // ceil(22_500_000 / 7)
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },

  // ── Du lịch Đà Nẵng hè 2026 — 70.0% ─────────────────────────────────────────
  {
    id: 'goal_danang_01',
    userId: USER_ID,
    name: 'Du lịch Đà Nẵng hè 2026',
    targetAmount: 8_000_000,
    currentAmount: 5_600_000,
    deadline: '2026-07-15',
    fundingWalletId: WALLET_IDS.BANK,
    isCompleted: false,
    isDeleted: false,
    // Derived fields
    progressPercentage: 70.0,
    remainingAmount: 2_400_000,
    monthsRemaining: 2,   // Jun + ~½ Jul ≈ 2 months
    requiredMonthlySaving: 1_200_000, // 2_400_000 / 2
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },

  // ── Quỹ khẩn cấp — 92.5% ─────────────────────────────────────────────────────
  {
    id: 'goal_emergency_01',
    userId: USER_ID,
    name: 'Quỹ khẩn cấp',
    targetAmount: 20_000_000,
    currentAmount: 18_500_000,
    deadline: '2026-11-30',
    fundingWalletId: WALLET_IDS.BANK,
    isCompleted: false,
    isDeleted: false,
    // Derived fields
    progressPercentage: 92.5,
    remainingAmount: 1_500_000,
    monthsRemaining: 6,   // Jun → Nov = 6 months
    requiredMonthlySaving: 250_000, // 1_500_000 / 6
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },
];

// ─── Service Functions ─────────────────────────────────────────────────────────

export function getGoals(): SavingsGoalWithProgress[] {
  return MOCK_GOALS;
}

export function getGoalById(id: string): SavingsGoalWithProgress | undefined {
  return MOCK_GOALS.find((g) => g.id === id);
}
