import type { SavingsGoalWithProgress, GoalContribution } from '../../types';
import { USER_ID, WALLET_IDS, adjustWalletBalance, getWalletById } from './wallets';
import { createTransactionSync, deleteTransactionSync } from './transactions';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genId(): string {
  return `goal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function genContribId(): string {
  return `contrib_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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

// Contributions store — keyed by goalId.
// Seed one contribution per goal so that currentAmount = Σ contributions holds for
// the seed data too. Without this, adding a contribution to a seed goal would
// recompute currentAmount = Σ (just the new one) and COLLAPSE the seeded balance.
// Seed contributions have no transactionId (the seed savings were never tracked as
// real transactions / never deducted a wallet) — so deleteGoal won't try to reverse them.
let CONTRIBUTIONS: GoalContribution[] = GOALS.filter((g) => g.currentAmount > 0).map(
  (g) => ({
    id: `contrib_seed_${g.id}`,
    goalId: g.id,
    amount: g.currentAmount,
    contributedAt: g.createdAt,
    note: 'Số dư ban đầu',
  }),
);

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getGoals(): SavingsGoalWithProgress[] {
  return GOALS.filter((g) => !g.isDeleted);
}

export function getGoalById(id: string): SavingsGoalWithProgress | undefined {
  return GOALS.find((g) => g.id === id);
}

export function getContributionsByGoalId(goalId: string): GoalContribution[] {
  return CONTRIBUTIONS.filter((c) => c.goalId === goalId);
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
    // Create the savings goal contribution transaction
    const tx = createTransactionSync({
      walletId: input.fundingWalletId,
      categoryId: 'cat_savings_goal',
      amount: initial,
      type: 'expense',
      description: `Nạp mục tiêu: ${goal.name}`,
      merchant: null,
      transactionDate: todayIso(),
      entryMethod: 'manual',
    });
    const contrib: GoalContribution = {
      id: genContribId(),
      goalId: goal.id,
      amount: initial,
      contributedAt: nowIso(),
      transactionId: tx.id,
    };
    CONTRIBUTIONS = [...CONTRIBUTIONS, contrib];
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

/**
 * Delete goal = reverse all contributions atomically.
 * Refunds wallet balance + deletes linked transactions for each contribution.
 * Contrast with Complete: completed goals keep their transactions.
 */
export async function deleteGoal(id: string): Promise<void> {
  await delay();
  const goal = GOALS.find((g) => g.id === id);
  if (!goal) throw new Error('Goal not found');

  // Reverse every contribution that has a linked transaction
  const goalContribs = CONTRIBUTIONS.filter((c) => c.goalId === id);
  for (const contrib of goalContribs) {
    if (contrib.transactionId && goal.fundingWalletId) {
      // Delete the transaction and restore wallet balance
      deleteTransactionSync(contrib.transactionId);
    }
  }

  // Remove contributions from store
  CONTRIBUTIONS = CONTRIBUTIONS.filter((c) => c.goalId !== id);

  GOALS = GOALS.map((g) =>
    g.id === id ? { ...g, isDeleted: true, updatedAt: nowIso() } : g,
  );
}

export interface AddContributionInput {
  amount: number;
  note?: string;
}

/**
 * Add a goal contribution.
 * - Guards: amount must be > 0, ≤ remaining, and ≤ wallet balance (if funded).
 * - If fundingWalletId set: creates a cat_savings_goal expense tx, links it.
 * - currentAmount = Σ contributions (single source of truth).
 */
export async function addGoalContribution(
  goalId: string,
  input: AddContributionInput,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const goal = GOALS.find((g) => g.id === goalId);
  if (!goal) throw new Error('Goal not found');

  // Guard: amount must be positive
  if (input.amount <= 0) throw new Error('invalid_amount');

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  // Guard: cannot contribute more than remaining
  if (input.amount > remaining) {
    throw new Error('amount_exceeds_remaining');
  }

  // Guard: cannot contribute more than wallet balance
  if (goal.fundingWalletId) {
    const wallet = getWalletById(goal.fundingWalletId);
    if (wallet && input.amount > wallet.balance) {
      throw new Error('insufficient_balance');
    }
  }

  let transactionId: string | undefined;

  if (goal.fundingWalletId) {
    const tx = createTransactionSync({
      walletId: goal.fundingWalletId,
      categoryId: 'cat_savings_goal',
      amount: input.amount,
      type: 'expense',
      description: `Nạp mục tiêu: ${goal.name}`,
      merchant: null,
      transactionDate: todayIso(),
      entryMethod: 'manual',
    });
    transactionId = tx.id;
  }

  // Record contribution
  const contrib: GoalContribution = {
    id: genContribId(),
    goalId,
    amount: input.amount,
    contributedAt: nowIso(),
    note: input.note,
    transactionId,
  };
  CONTRIBUTIONS = [...CONTRIBUTIONS, contrib];

  // currentAmount = Σ all contributions (single source of truth)
  const totalContributed = CONTRIBUTIONS
    .filter((c) => c.goalId === goalId)
    .reduce((sum, c) => sum + c.amount, 0);

  const merged = {
    ...goal,
    currentAmount: totalContributed,
    isCompleted: totalContributed >= goal.targetAmount,
    updatedAt: nowIso(),
  };
  const after = recomputeProgress(merged);
  GOALS = GOALS.map((g) => (g.id === goalId ? after : g));
  return after;
}
