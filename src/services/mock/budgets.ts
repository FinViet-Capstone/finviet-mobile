import type { BudgetWithSpend } from '../../types';
import { getCategoryById } from '@/constants/categories';
import { USER_ID } from './walletStore';
import { getTransactions } from './transactions';
import { getEffectiveIncomeAllocationSync } from './incomeAllocation';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genId(): string {
  return `budget_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Returns "YYYY-MM-01" / "YYYY-MM-<lastDay>" for the current calendar month. */
function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { startDate: fmt(first), endDate: fmt(last) };
}

export interface MonthRange {
  startDate: string;
  endDate: string;
}

/** Recompute spent/remaining/percentage/status from live transactions. */
function withSpend(
  budget: {
    id: string;
    customerId: string;
    categoryId: string;
    monthlyLimit: number;
    resetDay: number;
    createdAt: string;
    updatedAt: string;
  },
  range?: MonthRange,
): BudgetWithSpend {
  const { startDate, endDate } = range ?? currentMonthRange();
  const cat = getCategoryById(budget.categoryId);
  const txs = getTransactions({
    categoryId: budget.categoryId,
    type: 'expense',
    startDate,
    endDate,
  });
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  const remaining = budget.monthlyLimit - spent;
  const percentage =
    budget.monthlyLimit > 0
      ? Math.round(((spent / budget.monthlyLimit) * 100) * 10) / 10
      : 0;
  const status: BudgetWithSpend['status'] =
    percentage > 80 ? 'danger' : percentage >= 60 ? 'warning' : 'safe';

  return {
    ...budget,
    categoryName: cat?.nameVi ?? 'Khác',
    categoryColor: cat?.color ?? '#94A3B8',
    categoryIcon: cat?.icon ?? 'ellipsis',
    spent,
    remaining,
    percentage,
    status,
  };
}

// ─── Mock Data (mutable) ───────────────────────────────────────────────────────
// Stored without the derived spend fields -- those are computed on read so
// transaction mutations show up in the UI without re-running a setter.

interface BaseBudget {
  id: string;
  customerId: string;
  categoryId: string;
  monthlyLimit: number;
  resetDay: number;
  createdAt: string;
  updatedAt: string;
}

let BUDGETS: BaseBudget[] = [
  {
    id: 'budget_food_01',
    customerId: USER_ID,
    categoryId: 'cat_food',
    monthlyLimit: 2_000_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_shopping_01',
    customerId: USER_ID,
    categoryId: 'cat_shopping',
    monthlyLimit: 1_000_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_transport_01',
    customerId: USER_ID,
    categoryId: 'cat_transport',
    monthlyLimit: 350_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_health_01',
    customerId: USER_ID,
    categoryId: 'cat_health',
    monthlyLimit: 800_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_housing_01',
    customerId: USER_ID,
    categoryId: 'cat_housing',
    monthlyLimit: 4_500_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getBudgets(range?: MonthRange): BudgetWithSpend[] {
  return BUDGETS.map((b) => withSpend(b, range));
}

export function getBudgetById(id: string, range?: MonthRange): BudgetWithSpend | undefined {
  const base = BUDGETS.find((b) => b.id === id);
  return base ? withSpend(base, range) : undefined;
}

// ─── Bucket summary (50/30/20) ──────────────────────────────────────────────────

export interface BucketSummary {
  /** 'needs' | 'wants' | 'savings' */
  bucket: string;
  /** Target share of income for this bucket, 0–1 (e.g. 0.5). */
  allocationPct: number;
  /** Income × allocationPct — the monthly cap for the bucket. */
  allocationCap: number;
  /** Sum of category budget limits assigned to this bucket. */
  categoryLimitTotal: number;
  spent: number;
  remaining: number;
  /** spent / allocationCap × 100. */
  percentage: number;
  /** categoryLimitTotal exceeds the allocationCap. */
  overAllocated: boolean;
  /** Straight-line expected spend by today (cap × elapsed-fraction of month). */
  expectedSpent: number;
  /** spent − expectedSpent (positive = ahead of pace / overspending). */
  paceDeviation: number;
  /** 'ahead' | 'on_track' | 'behind' relative to straight-line pace. */
  paceStatus: string;
}

export interface BucketSummaryList {
  /** 'YYYY-MM' */
  month: string;
  monthlyIncome: number;
  budgetAdherenceScore: number;
  uncategorizedRatio: number;
  uncategorizedWarning: boolean;
  buckets: BucketSummary[];
}

/**
 * Bucket summary. Spend is grouped by each expense category's defaultBucket
 * over the month range; allocation caps come from the income/allocation
 * setting that was in effect when `month` started (see mock/incomeAllocation.ts —
 * never the live/current setting, so past months' numbers can't shift when the
 * customer later schedules a change). Mirrors the backend GET /budgets/buckets
 * shape closely enough for the UI.
 */
export function getBudgetBuckets(range?: MonthRange): BucketSummaryList {
  const { startDate, endDate } = range ?? currentMonthRange();
  const month = startDate.slice(0, 7);

  const effective = getEffectiveIncomeAllocationSync(month);
  const income = effective.monthlyIncome;
  const bucketAllocation: Record<'needs' | 'wants' | 'savings', number> = {
    needs: effective.needsPct / 100,
    wants: effective.wantsPct / 100,
    savings: effective.savingsPct / 100,
  };

  const expenses = getTransactions({ type: 'expense', startDate, endDate });
  const spentByBucket: Record<'needs' | 'wants' | 'savings', number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  let uncategorized = 0;
  let totalExpense = 0;
  for (const t of expenses) {
    totalExpense += t.amount;
    const bucket = t.categoryId ? getCategoryById(t.categoryId)?.defaultBucket : null;
    if (bucket) spentByBucket[bucket] += t.amount;
    else uncategorized += t.amount;
  }

  const limitByBucket: Record<'needs' | 'wants' | 'savings', number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  for (const b of BUDGETS) {
    const bucket = getCategoryById(b.categoryId)?.defaultBucket;
    if (bucket) limitByBucket[bucket] += b.monthlyLimit;
  }

  // Elapsed fraction of the month for straight-line pace.
  const now = new Date();
  const monthStart = new Date(`${startDate}T00:00:00`);
  const monthEnd = new Date(`${endDate}T23:59:59`);
  const clamped = Math.min(Math.max(now.getTime(), monthStart.getTime()), monthEnd.getTime());
  const elapsed =
    (clamped - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime() || 1);

  const buckets: BucketSummary[] = (['needs', 'wants', 'savings'] as const).map((bucket) => {
    const allocationPct = bucketAllocation[bucket];
    const allocationCap = Math.round(income * allocationPct);
    const spent = spentByBucket[bucket];
    const expectedSpent = Math.round(allocationCap * elapsed);
    const paceDeviation = spent - expectedSpent;
    const percentage =
      allocationCap > 0 ? Math.round((spent / allocationCap) * 1000) / 10 : 0;
    const paceStatus =
      paceDeviation > allocationCap * 0.05
        ? 'ahead'
        : paceDeviation < -allocationCap * 0.05
          ? 'behind'
          : 'on_track';
    return {
      bucket,
      allocationPct,
      allocationCap,
      categoryLimitTotal: limitByBucket[bucket],
      spent,
      remaining: allocationCap - spent,
      percentage,
      overAllocated: limitByBucket[bucket] > allocationCap,
      expectedSpent,
      paceDeviation,
      paceStatus,
    };
  });

  const uncategorizedRatio = totalExpense > 0 ? uncategorized / totalExpense : 0;
  // Simple adherence proxy: 100 minus average over-pace percentage.
  const overPace = buckets.reduce(
    (s, b) => s + Math.max(0, b.paceDeviation) / (b.allocationCap || 1),
    0,
  );
  const budgetAdherenceScore = Math.max(0, Math.round(100 - (overPace / buckets.length) * 100));

  return {
    month,
    monthlyIncome: income,
    budgetAdherenceScore,
    uncategorizedRatio,
    uncategorizedWarning: uncategorizedRatio > 0.1,
    buckets,
  };
}

// ─── Writes ────────────────────────────────────────────────────────────────────

export interface CreateBudgetInput {
  categoryId: string;
  monthlyLimit: number;
}

export async function createBudget(
  input: CreateBudgetInput,
): Promise<BudgetWithSpend> {
  await delay();
  // One budget per (user, category) -- upsert on conflict.
  const existing = BUDGETS.find((b) => b.categoryId === input.categoryId);
  if (existing) {
    return updateBudget(existing.id, { monthlyLimit: input.monthlyLimit });
  }
  const base: BaseBudget = {
    id: genId(),
    customerId: USER_ID,
    categoryId: input.categoryId,
    monthlyLimit: input.monthlyLimit,
    resetDay: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  BUDGETS = [...BUDGETS, base];
  return withSpend(base);
}

export interface UpdateBudgetInput {
  monthlyLimit?: number;
}

export async function updateBudget(
  id: string,
  patch: UpdateBudgetInput,
): Promise<BudgetWithSpend> {
  await delay();
  const before = BUDGETS.find((b) => b.id === id);
  if (!before) throw new Error('Budget not found');
  const after: BaseBudget = {
    ...before,
    ...(patch.monthlyLimit !== undefined ? { monthlyLimit: patch.monthlyLimit } : {}),
    updatedAt: nowIso(),
  };
  BUDGETS = BUDGETS.map((b) => (b.id === id ? after : b));
  return withSpend(after);
}

export async function deleteBudget(id: string): Promise<void> {
  await delay();
  BUDGETS = BUDGETS.filter((b) => b.id !== id);
}
