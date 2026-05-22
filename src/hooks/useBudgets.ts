import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '@/services';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useBudgets = () =>
  useQuery({ queryKey: ['budgets'], queryFn: () => getBudgets() });

export const useBudgetById = (id: string | undefined) =>
  useQuery({
    queryKey: ['budgets', id],
    queryFn: () => (id ? getBudgetById(id) ?? null : null),
    enabled: !!id,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => createBudget(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
};

export const useUpdateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBudgetInput }) =>
      updateBudget(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
};

export const useDeleteBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
};
