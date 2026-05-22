import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalContribution,
  type CreateGoalInput,
  type UpdateGoalInput,
  type AddContributionInput,
} from '@/services';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useGoals = () =>
  useQuery({ queryKey: ['goals'], queryFn: () => getGoals() });

export const useGoalById = (id: string | undefined) =>
  useQuery({
    queryKey: ['goals', id],
    queryFn: () => (id ? getGoalById(id) ?? null : null),
    enabled: !!id,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateGoalDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['goals'] });
  // Initial contributions and contributions deduct from a wallet.
  qc.invalidateQueries({ queryKey: ['wallets'] });
}

export const useCreateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess: () => invalidateGoalDependents(qc),
  });
};

export const useUpdateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateGoalInput }) =>
      updateGoal(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
};

export const useDeleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
};

export const useAddContribution = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: AddContributionInput }) =>
      addGoalContribution(goalId, input),
    onSuccess: () => invalidateGoalDependents(qc),
  });
};
