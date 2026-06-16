import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type MonthRange,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

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

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => createBudget(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all() }),
  });
};

export const useUpdateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBudgetInput }) =>
      updateBudget(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all() }),
  });
};

export const useDeleteBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all() }),
  });
};
