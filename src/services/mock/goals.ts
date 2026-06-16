import type { SavingsGoalWithProgress } from '../../types';
import { USER_ID, WALLET_IDS, adjustWalletBalance } from './wallets';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genId(): string {
  return `goal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return nowIso().split('T')[0];
}

/** Whole months between two YYYY-MM-DD strings (clamped to ≥1). */
function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(1, months);
}

/** Recompute the derived progress fields. */
function recomputeProgress(
  goal: Omit<SavingsGoalWithProgress, 'progressPercentage' | 'remainingAmount' | 'monthsRemaining' | 'requiredMonthlySaving'>,
): SavingsGoalWithProgress {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const progressPercentage =
    goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0;
  const monthsRemaining = monthsBetween(todayIso(), goal.deadline);
  const requiredMonthlySaving = Math.ceil(remainingAmount / monthsRemaining);
  return {
    ...goal,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
    remainingAmount,
    monthsRemaining,
    requiredMonthlySaving,
  };
}

// ─── Mock Data (mutable) ───────────────────────────────────────────────────────

let GOALS: SavingsGoalWithProgress[] = [
  {
    id: 'goal_iphone_01',
    customerId: USER_ID,
    name: 'Mua iPhone 16 Pro Max',
    targetAmount: 35_000_000,
    currentAmount: 12_500_000,
    deadline: '2026-12-31',
    fundingWalletId: WALLET_IDS.BANK,
    isCompleted: false,
    isDeleted: false,
    progressPercentage: 35.7,
    remainingAmount: 22_500_000,
    monthsRemaining: 7,
    requiredMonthlySaving: 3_215_000,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },
  {
    id: 'goal_danang_01',
    customerId: USER_ID,
    name: 'Du lịch Đà Nẵng hè 2026',
    targetAmount: 8_000_000,
    currentAmount: 5_600_000,
    deadline: '2026-07-15',
    fundingWalletId: WALLET_IDS.BANK,
    isCompleted: false,
    isDeleted: false,
    progressPercentage: 70.0,
    remainingAmount: 2_400_000,
    monthsRemaining: 2,
    requiredMonthlySaving: 1_200_000,
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },
  {
    id: 'goal_emergency_01',
    customerId: USER_ID,
    name: 'Quỹ khẩn cấp',
    targetAmount: 20_000_000,
    currentAmount: 18_500_000,
    deadline: '2026-11-30',
    fundingWalletId: WALLET_IDS.BANK,
    isCompleted: false,
    isDeleted: false,
    progressPercentage: 92.5,
    remainingAmount: 1_500_000,
    monthsRemaining: 6,
    requiredMonthlySaving: 250_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },
];

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getGoals(): SavingsGoalWithProgress[] {
  return GOALS.filter((g) => !g.isDeleted);
}

export function getGoalById(id: string): SavingsGoalWithProgress | undefined {
  return GOALS.find((g) => g.id === id);
}

// ─── Writes ────────────────────────────────────────────────────────────────────

export interface CreateGoalInput {
  name: string;
  iconEmoji?: string;
  targetAmount: number;
  deadline: string;
  fundingWalletId?: string;
  initialAmount?: number;
}

export async function createGoal(
  input: CreateGoalInput,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const initial = input.initialAmount ?? 0;
  const base = {
    id: genId(),
    customerId: USER_ID,
    name: input.name.trim(),
    iconEmoji: input.iconEmoji,
    targetAmount: input.targetAmount,
    currentAmount: initial,
    deadline: input.deadline,
    fundingWalletId: input.fundingWalletId,
    isCompleted: false,
    isDeleted: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const goal = recomputeProgress(base);
  GOALS = [...GOALS, goal];
  if (initial > 0 && input.fundingWalletId) {
    adjustWalletBalance(input.fundingWalletId, -initial);
  }
  return goal;
}

export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  deadline?: string;
  fundingWalletId?: string;
}

export async function updateGoal(
  id: string,
  patch: UpdateGoalInput,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const before = GOALS.find((g) => g.id === id);
  if (!before) throw new Error('Goal not found');

  const merged = {
    ...before,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.targetAmount !== undefined ? { targetAmount: patch.targetAmount } : {}),
    ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
    ...(patch.fundingWalletId !== undefined
      ? { fundingWalletId: patch.fundingWalletId }
      : {}),
    updatedAt: nowIso(),
  };
  const after = recomputeProgress(merged);
  GOALS = GOALS.map((g) => (g.id === id ? after : g));
  return after;
}

export async function deleteGoal(id: string): Promise<void> {
  await delay();
  GOALS = GOALS.map((g) =>
    g.id === id ? { ...g, isDeleted: true, updatedAt: nowIso() } : g,
  );
}

export interface AddContributionInput {
  amount: number;
  note?: string;
}

export async function addGoalContribution(
  goalId: string,
  input: AddContributionInput,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const before = GOALS.find((g) => g.id === goalId);
  if (!before) throw new Error('Goal not found');

  const merged = {
    ...before,
    currentAmount: before.currentAmount + input.amount,
    isCompleted:
      before.currentAmount + input.amount >= before.targetAmount ? true : before.isCompleted,
    updatedAt: nowIso(),
  };
  const after = recomputeProgress(merged);
  GOALS = GOALS.map((g) => (g.id === goalId ? after : g));
  // Deduct from the funding wallet (resolved OQ #6).
  if (before.fundingWalletId) {
    adjustWalletBalance(before.fundingWalletId, -input.amount);
  }
  return after;
}
