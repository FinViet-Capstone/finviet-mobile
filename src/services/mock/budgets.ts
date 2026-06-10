import type { BudgetWithSpend } from '../../types';
import { getCategoryById } from '@/constants/categories';
import { USER_ID } from './wallets';
import { getTransactions } from './transactions';

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

/** Recompute spent/remaining/percentage/status from live transactions. */
function withSpend(budget: {
  id: string;
  userId: string;
  categoryId: string;
  monthlyLimit: number;
  resetDay: number;
  createdAt: string;
  updatedAt: string;
}): BudgetWithSpend {
  const { startDate, endDate } = currentMonthRange();
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
  userId: string;
  categoryId: string;
  monthlyLimit: number;
  resetDay: number;
  createdAt: string;
  updatedAt: string;
}

let BUDGETS: BaseBudget[] = [
  {
    id: 'budget_food_01',
    userId: USER_ID,
    categoryId: 'cat_food',
    monthlyLimit: 2_000_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_shopping_01',
    userId: USER_ID,
    categoryId: 'cat_shopping',
    monthlyLimit: 1_000_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_transport_01',
    userId: USER_ID,
    categoryId: 'cat_transport',
    monthlyLimit: 350_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_health_01',
    userId: USER_ID,
    categoryId: 'cat_health',
    monthlyLimit: 800_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'budget_housing_01',
    userId: USER_ID,
    categoryId: 'cat_housing',
    monthlyLimit: 4_500_000,
    resetDay: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getBudgets(): BudgetWithSpend[] {
  return BUDGETS.map(withSpend);
}

export function getBudgetById(id: string): BudgetWithSpend | undefined {
  const base = BUDGETS.find((b) => b.id === id);
  return base ? withSpend(base) : undefined;
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
    userId: USER_ID,
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
