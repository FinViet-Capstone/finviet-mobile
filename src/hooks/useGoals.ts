import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalContribution,
  getContributionsByGoalId,
  withdrawFromGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
  type AddContributionInput,
  type WithdrawGoalInput,
} from '@/services';
import { newIdempotencyKey } from '@/lib/idempotency';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import type { SavingsGoalWithProgress } from '@/types';
import { runSingleFlight } from '@/utils/goalWithdrawal';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useGoals = (archived = false) =>
  useQuery({
    queryKey: queryKeys.goals.list(archived),
    queryFn: () => getGoals(archived),
    staleTime: STALE_TIME.medium,
  });

export const useArchivedGoals = () => useGoals(true);

export const useGoalById = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: async () => (id ? (await getGoalById(id)) ?? null : null),
    enabled: !!id,
    staleTime: STALE_TIME.medium,
  });

export const useGoalContributions = (goalId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.goals.contributions(goalId),
    queryFn: () => (goalId ? getContributionsByGoalId(goalId) : []),
    enabled: !!goalId,
    staleTime: STALE_TIME.medium,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateGoalDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.goals.all() });
  // Contributions and withdrawals create cat_savings_goal transactions that feed
  // net Savings progress, while also changing the selected wallet.
  qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
  qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
  qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
}

export const useCreateGoal = () => {
  const qc = useQueryClient();
  const inFlightRef = useRef<Promise<SavingsGoalWithProgress> | null>(null);

  return useMutation({
    mutationFn: (input: CreateGoalInput) => {
      if (inFlightRef.current) return inFlightRef.current;

      const promise = createGoal(input, newIdempotencyKey());
      inFlightRef.current = promise;
      return promise;
    },
    onSuccess: () => invalidateGoalDependents(qc),
    onSettled: () => {
      inFlightRef.current = null;
    },
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
    onSuccess: (_, id) => {
      const archivedGoal = qc.getQueryData<SavingsGoalWithProgress>(
        queryKeys.goals.detail(id),
      );

      qc.setQueryData<SavingsGoalWithProgress[]>(
        queryKeys.goals.list(false),
        (goals = []) => goals.filter((goal) => goal.id !== id),
      );

      if (archivedGoal) {
        const archived = { ...archivedGoal, isDeleted: true };
        qc.setQueryData(queryKeys.goals.detail(id), archived);
        qc.setQueryData<SavingsGoalWithProgress[]>(
          queryKeys.goals.list(true),
          (goals = []) => [archived, ...goals.filter((goal) => goal.id !== id)],
        );
      }

      qc.invalidateQueries({ queryKey: queryKeys.goals.list(true) });
    },
  });
};

export const useAddContribution = () => {
  const qc = useQueryClient();
  const inFlightRef = useRef<Promise<SavingsGoalWithProgress> | null>(null);

  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: AddContributionInput }) => {
      if (inFlightRef.current) return inFlightRef.current;

      const promise = addGoalContribution(goalId, input, newIdempotencyKey());
      inFlightRef.current = promise;
      return promise;
    },
    onSuccess: () => invalidateGoalDependents(qc),
    onSettled: () => {
      inFlightRef.current = null;
    },
  });
};

export const useWithdrawFromGoal = () => {
  const qc = useQueryClient();
  const inFlightRef = useRef<Promise<SavingsGoalWithProgress> | null>(null);

  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: WithdrawGoalInput }) =>
      runSingleFlight(inFlightRef, () =>
        withdrawFromGoal(goalId, input, newIdempotencyKey()),
      ),
    onSuccess: () => invalidateGoalDependents(qc),
    onSettled: () => {
      inFlightRef.current = null;
    },
  });
};
