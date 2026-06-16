import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRules, createRule, type CreateRuleInput } from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useRules = () =>
  useQuery({
    queryKey: queryKeys.rules.all(),
    queryFn: () => getRules(),
    staleTime: STALE_TIME.medium,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleInput) => createRule(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rules.all() });
      // A new rule retroactively re-categorises transactions, which shifts
      // budget pacing — refresh both.
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
    },
  });
};
