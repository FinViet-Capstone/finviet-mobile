import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  getBudgetById,
  getBudgetBuckets,
  createBudget,
  updateBudget,
  deleteBudget,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type MonthRange,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import { invalidateAiDerived } from './useReports';

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * @param range Optional month window. Omit for the current calendar month
 * (Home). The Budgets screen passes the month the user is viewing so `spent`
 * reflects that month instead of always "now".
 */
export const useBudgets = (range?: MonthRange) =>
  useQuery({
    queryKey: queryKeys.budgets.list(range ?? null),
    queryFn: () => getBudgets(range),
    staleTime: STALE_TIME.medium,
  });

export const useBudgetById = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.budgets.detail(id),
    queryFn: () => (id ? getBudgetById(id) ?? null : null),
    enabled: !!id,
    staleTime: STALE_TIME.medium,
  });

/** 50/30/20 bucket summary + pace for the given month (defaults to current). */
export const useBudgetBuckets = (range?: MonthRange) =>
  useQuery({
    queryKey: queryKeys.budgets.buckets(range ?? null),
    queryFn: () => getBudgetBuckets(range),
    staleTime: STALE_TIME.medium,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateBudgetDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
  // A limit change moves budgetScore's pacing inputs behind "Điểm chi tiêu".
  invalidateAiDerived(qc);
}

export const useCreateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => createBudget(input),
    onSuccess: () => invalidateBudgetDependents(qc),
  });
};

export const useUpdateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBudgetInput }) =>
      updateBudget(id, patch),
    onSuccess: () => invalidateBudgetDependents(qc),
  });
};

export const useDeleteBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => invalidateBudgetDependents(qc),
  });
};
