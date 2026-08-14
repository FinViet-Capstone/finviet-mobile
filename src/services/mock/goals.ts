import type { SavingsGoalWithProgress, GoalContribution } from '../../types';
import { getWalletById } from './wallets';
import { USER_ID, WALLET_IDS } from './walletStore';
import { createTransactionSync } from './transactions';

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

const IDEMPOTENT_RESULTS = new Map<
  string,
  { payload: string; result: SavingsGoalWithProgress }
>();

function getIdempotentResult(
  scope: string,
  idempotencyKey: string | undefined,
  input: unknown,
): SavingsGoalWithProgress | undefined {
  if (!idempotencyKey) return undefined;

  const cached = IDEMPOTENT_RESULTS.get(`${scope}:${idempotencyKey}`);
  if (!cached) return undefined;
  if (cached.payload !== JSON.stringify(input)) throw new Error('idempotency_key_reused');
  return cached.result;
}

function storeIdempotentResult(
  scope: string,
  idempotencyKey: string | undefined,
  input: unknown,
  result: SavingsGoalWithProgress,
): void {
  if (!idempotencyKey) return;
  IDEMPOTENT_RESULTS.set(`${scope}:${idempotencyKey}`, {
    payload: JSON.stringify(input),
    result,
  });
}

function todayIso(): string {
  return nowIso().split('T')[0];
}

/** Whole months between two YYYY-MM-DD strings (clamped to ≥1). */
function monthsBetween(fromIso: string, toIso: string | null): number {
  if (!toIso) return 1;

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
// Seed contributions have no transactionId because their initial savings were never
// tracked as real transactions or deducted from a wallet.
let CONTRIBUTIONS: GoalContribution[] = GOALS.filter((g) => g.currentAmount > 0).map(
  (g) => ({
    id: `contrib_seed_${g.id}`,
    goalId: g.id,
    amount: g.currentAmount,
    type: 'contribution' as const,
    contributedAt: g.createdAt ?? nowIso(),
    note: 'Số dư ban đầu',
  }),
);

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getGoals(archived = false): SavingsGoalWithProgress[] {
  return GOALS.filter((g) => g.isDeleted === archived);
}

export function getGoalById(id: string): SavingsGoalWithProgress | undefined {
  return GOALS.find((g) => g.id === id);
}

export function getContributionsByGoalId(goalId: string): GoalContribution[] {
  return CONTRIBUTIONS.filter((c) => c.goalId === goalId);
}

/** currentAmount = Σ contributions − Σ withdrawals (single source of truth). */
function computeCurrentAmount(goalId: string): number {
  return CONTRIBUTIONS.filter((c) => c.goalId === goalId).reduce(
    (sum, c) => sum + (c.type === 'withdrawal' ? -c.amount : c.amount),
    0,
  );
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
  idempotencyKey?: string,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const cached = getIdempotentResult('create', idempotencyKey, input);
  if (cached) return cached;

  const initial = input.initialAmount ?? 0;
  const base = {
    id: genId(),
    customerId: USER_ID,
    name: input.name.trim(),
    iconEmoji: input.iconEmoji,
    targetAmount: input.targetAmount,
    currentAmount: 0,
    deadline: input.deadline,
    fundingWalletId: input.fundingWalletId,
    isCompleted: false,
    isDeleted: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  let transactionId: string | undefined;

  if (initial > 0 && input.fundingWalletId) {
    const tx = createTransactionSync({
      walletId: input.fundingWalletId,
      categoryId: 'cat_savings_goal',
      amount: initial,
      type: 'expense',
      description: `Nạp mục tiêu: ${base.name}`,
      merchant: null,
      transactionDate: todayIso(),
      entryMethod: 'manual',
    });
    transactionId = tx.id;
  }

  if (initial > 0) {
    const contribution: GoalContribution = {
      id: genContribId(),
      goalId: base.id,
      amount: initial,
      type: 'contribution',
      contributedAt: nowIso(),
      note: 'Số dư ban đầu',
      transactionId,
    };
    CONTRIBUTIONS = [...CONTRIBUTIONS, contribution];
  }

  const goal = recomputeProgress({
    ...base,
    currentAmount: computeCurrentAmount(base.id),
  });
  GOALS = [...GOALS, goal];
  storeIdempotentResult('create', idempotencyKey, input, goal);
  return goal;
}

export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  deadline?: string;
}

export async function updateGoal(
  id: string,
  patch: UpdateGoalInput,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const before = GOALS.find((g) => g.id === id && !g.isDeleted);
  if (!before) throw new Error('Goal not found');

  const merged = {
    ...before,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.targetAmount !== undefined ? { targetAmount: patch.targetAmount } : {}),
    ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
    updatedAt: nowIso(),
  };
  const after = recomputeProgress(merged);
  GOALS = GOALS.map((g) => (g.id === id ? after : g));
  return after;
}

/** Archive a zero-balance goal while preserving its complete financial ledger. */
export async function deleteGoal(id: string): Promise<void> {
  await delay();
  const goal = GOALS.find((g) => g.id === id && !g.isDeleted);
  if (!goal) throw new Error('Goal not found');
  if (goal.currentAmount !== 0) throw new Error('goal_balance_must_be_withdrawn');

  GOALS = GOALS.map((g) =>
    g.id === id ? { ...g, isDeleted: true, updatedAt: nowIso() } : g,
  );
}

export interface AddContributionInput {
  amount: number;
  note?: string;
  fundingWalletId?: string;
}

/**
 * Add a goal contribution.
 * - Guards: amount must be > 0, ≤ remaining, and ≤ wallet balance (if funded).
 * - Funding wallet = input.fundingWalletId (picked in the contribution sheet),
 *   falling back to the goal's preset fundingWalletId. If either is set: creates
 *   a cat_savings_goal expense tx, links it.
 * - currentAmount = Σ contributions (single source of truth).
 */
export async function addGoalContribution(
  goalId: string,
  input: AddContributionInput,
  idempotencyKey?: string,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const cached = getIdempotentResult(
    `contribute:${goalId}`,
    idempotencyKey,
    input,
  );
  if (cached) return cached;

  const goal = GOALS.find((g) => g.id === goalId && !g.isDeleted);
  if (!goal) throw new Error('Goal not found');

  // Guard: amount must be positive
  if (input.amount <= 0) throw new Error('invalid_amount');

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  // Guard: cannot contribute more than remaining
  if (input.amount > remaining) {
    throw new Error('amount_exceeds_remaining');
  }

  // The wallet actually picked in the contribution sheet takes priority over the
  // goal's preset funding wallet (goals created without one — the common case,
  // since the create-goal form never collects fundingWalletId — would otherwise
  // skip both the balance guard and the debit transaction below, letting
  // currentAmount rise with no real money ever leaving a wallet).
  const fundingWalletId = input.fundingWalletId ?? goal.fundingWalletId;

  // Guard: cannot contribute more than wallet balance
  if (fundingWalletId) {
    const wallet = getWalletById(fundingWalletId);
    if (wallet && input.amount > wallet.balance) {
      throw new Error('insufficient_balance');
    }
  }

  let transactionId: string | undefined;

  if (fundingWalletId) {
    const tx = createTransactionSync({
      walletId: fundingWalletId,
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
    type: 'contribution',
    contributedAt: nowIso(),
    note: input.note,
    transactionId,
  };
  CONTRIBUTIONS = [...CONTRIBUTIONS, contrib];

  const totalContributed = computeCurrentAmount(goalId);
  const merged = {
    ...goal,
    currentAmount: totalContributed,
    isCompleted: totalContributed >= goal.targetAmount,
    updatedAt: nowIso(),
  };
  const after = recomputeProgress(merged);
  GOALS = GOALS.map((g) => (g.id === goalId ? after : g));
  storeIdempotentResult(`contribute:${goalId}`, idempotencyKey, input, after);
  return after;
}

export interface WithdrawGoalInput {
  amount: number;
  walletId: string;
  note?: string;
}

/**
 * Withdraw part of a goal's saved amount back into a wallet.
 * - Guards: amount must be > 0 and ≤ the goal's currentAmount.
 * - Always credits `input.walletId` (an income transaction on cat_savings_goal,
 *   the mirror image of a contribution's expense) — withdrawal has no notion of
 *   a "preset" wallet the way contributions fall back to goal.fundingWalletId.
 * - currentAmount = Σ contributions − Σ withdrawals (see computeCurrentAmount).
 *   A withdrawal can drop a completed goal back to incomplete.
 */
export async function withdrawFromGoal(
  goalId: string,
  input: WithdrawGoalInput,
  idempotencyKey?: string,
): Promise<SavingsGoalWithProgress> {
  await delay();
  const cached = getIdempotentResult(
    `withdraw:${goalId}`,
    idempotencyKey,
    input,
  );
  if (cached) return cached;

  const goal = GOALS.find((g) => g.id === goalId && !g.isDeleted);
  if (!goal) throw new Error('Goal not found');

  if (input.amount <= 0) throw new Error('invalid_amount');
  if (input.amount > goal.currentAmount) throw new Error('amount_exceeds_saved');

  const tx = createTransactionSync({
    walletId: input.walletId,
    categoryId: 'cat_savings_goal',
    amount: input.amount,
    type: 'income',
    description: `Rút mục tiêu: ${goal.name}`,
    merchant: null,
    transactionDate: todayIso(),
    entryMethod: 'manual',
  });

  const contrib: GoalContribution = {
    id: genContribId(),
    goalId,
    amount: input.amount,
    type: 'withdrawal',
    contributedAt: nowIso(),
    note: input.note,
    transactionId: tx.id,
  };
  CONTRIBUTIONS = [...CONTRIBUTIONS, contrib];

  const totalContributed = computeCurrentAmount(goalId);
  const merged = {
    ...goal,
    currentAmount: totalContributed,
    isCompleted: totalContributed >= goal.targetAmount,
    updatedAt: nowIso(),
  };
  const after = recomputeProgress(merged);
  GOALS = GOALS.map((g) => (g.id === goalId ? after : g));
  storeIdempotentResult(`withdraw:${goalId}`, idempotencyKey, input, after);
  return after;
}
