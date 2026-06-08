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
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useGoals = () =>
  useQuery({
    queryKey: queryKeys.goals.all(),
    queryFn: () => getGoals(),
    staleTime: STALE_TIME.medium,
  });

export const useGoalById = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: () => (id ? getGoalById(id) ?? null : null),
    enabled: !!id,
    staleTime: STALE_TIME.medium,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateGoalDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.goals.all() });
  // Initial contributions and contributions deduct from a wallet.
  qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all() }),
  });
};

export const useDeleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all() }),
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
