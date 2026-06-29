/**
 * real/budgets.ts — real .NET budget service.
 *
 * Mirrors src/services/mock/budgets.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/budgets/* (BudgetsController), ApiResponse<T> envelope.
 *   - GET /budgets?month=YYYY-MM     → BudgetResponse[]
 *   - POST /budgets  (upsert)        → BudgetResponse
 *   - PATCH /budgets/{id}            → BudgetResponse
 *   - DELETE /budgets/{id}           → 204
 * There is no GET /budgets/{id}; getBudgetById fetches the month list and finds.
 *
 * Category color/icon are not on the backend payload — they come from the local
 * category catalog (same as the mock did via getCategoryById).
 */

import { api, unwrap } from '@/lib/api';
import { getCategoryById } from '@/constants/categories';
import type { BudgetWithSpend, BudgetStatus } from '@/types';
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
  MonthRange,
} from '@/services/mock/budgets';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface BudgetDto {
  id: string;
  categoryId: string;
  categoryName: string;
  walletId: string | null;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: string;
  bucket: string;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

/**
 * Derive the FE status enum from percentage.
 *
 * Savings is a TARGET, not a spending cap (BUSINESS_LOGIC §11.3): meeting or
 * exceeding it is GOOD (green/safe), staying under is "not there yet" (amber/
 * warning) — never red. Needs/Wants keep the cap thresholds (safe <60, warning
 * 60-80, danger >80). The backend still returns generic RED/YELLOW/GREEN for all
 * buckets, so we recompute here until /budgets treats savings correctly.
 */
function toStatus(percentage: number, bucket: string): BudgetStatus {
  if (bucket === 'savings') {
    return percentage >= 100 ? 'safe' : 'warning';
  }
  if (percentage > 80) return 'danger';
  if (percentage >= 60) return 'warning';
  return 'safe';
}

function toBudget(dto: BudgetDto): BudgetWithSpend {
  const cat = getCategoryById(dto.categoryId);
  return {
    id: dto.id,
    customerId: '',
    categoryId: dto.categoryId,
    monthlyLimit: dto.monthlyLimit,
    resetDay: 1,
    createdAt: '',
    updatedAt: '',
    categoryName: cat?.nameVi ?? dto.categoryName ?? 'Khác',
    categoryColor: cat?.color ?? '#94A3B8',
    categoryIcon: cat?.icon ?? 'ellipsis',
    spent: dto.spent,
    remaining: dto.remaining,
    percentage: dto.percentage,
    status: toStatus(dto.percentage, dto.bucket),
  };
}

/** "YYYY-MM-DD…" range → "YYYY-MM" month the backend expects. */
function toMonthParam(range?: MonthRange): string | undefined {
  return range?.startDate ? range.startDate.slice(0, 7) : undefined;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getBudgets(range?: MonthRange): Promise<BudgetWithSpend[]> {
  const month = toMonthParam(range);
  const res = await api.get('/budgets', {
    params: month ? { month } : undefined,
  });
  return unwrap<BudgetDto[]>(res).map(toBudget);
}

export async function getBudgetById(
  id: string,
  range?: MonthRange,
): Promise<BudgetWithSpend | undefined> {
  const all = await getBudgets(range);
  return all.find((b) => b.id === id);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createBudget(
  input: CreateBudgetInput,
): Promise<BudgetWithSpend> {
  // POST is an upsert server-side (one budget per category), matching the mock.
  const res = await api.post('/budgets', {
    categoryId: input.categoryId,
    monthlyLimit: input.monthlyLimit,
  });
  return toBudget(unwrap<BudgetDto>(res));
}

export async function updateBudget(
  id: string,
  patch: UpdateBudgetInput,
): Promise<BudgetWithSpend> {
  const res = await api.patch(`/budgets/${id}`, {
    monthlyLimit: patch.monthlyLimit,
  });
  return toBudget(unwrap<BudgetDto>(res));
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(`/budgets/${id}`);
}
