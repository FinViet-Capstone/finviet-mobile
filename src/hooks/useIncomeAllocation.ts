import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applySavingsPlanRecommendation,
  getEffectiveIncomeAllocation,
  getSavingsPlanRecommendation,
  getScheduledIncomeAllocation,
  scheduleIncomeAllocationChange,
  type ScheduleIncomeAllocationInput,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** The income/allocation setting in effect for a given month (defaults to the current month). */
export const useEffectiveIncomeAllocation = (month: string = currentMonth()) =>
  useQuery({
    queryKey: queryKeys.incomeAllocation.effective(month),
    queryFn: () => getEffectiveIncomeAllocation(month),
    staleTime: STALE_TIME.medium,
  });

/** The draft already scheduled to take effect next month, if any. */
export const useScheduledIncomeAllocation = () =>
  useQuery({
    queryKey: queryKeys.incomeAllocation.scheduled(),
    queryFn: () => getScheduledIncomeAllocation(),
    staleTime: STALE_TIME.short,
  });

/** Always schedules for next calendar month — see mock/incomeAllocation.ts. */
export const useScheduleIncomeAllocationChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleIncomeAllocationInput) => scheduleIncomeAllocationChange(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.incomeAllocation.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
    },
  });
};

/**
 * Whether the customer's goals fit their Savings bucket, and the rebalanced
 * split that would fund them. Resolves to `null` against a backend that predates
 * the endpoint, so callers must handle that rather than assume data.
 *
 * `STALE_TIME.short`: it's derived from goals and the allocation, both of which
 * the customer edits right next to this — a 2-minute cache would leave the
 * banner contradicting a goal they just created.
 */
export const useSavingsPlanRecommendation = () =>
  useQuery({
    queryKey: queryKeys.incomeAllocation.recommendation(),
    queryFn: () => getSavingsPlanRecommendation(),
    staleTime: STALE_TIME.short,
  });

/**
 * Applies the proposed split for next month. Invalidates budgets too: the bucket
 * caps the Budgets tab draws come from the same allocation.
 */
export const useApplySavingsPlanRecommendation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => applySavingsPlanRecommendation(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.incomeAllocation.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
    },
  });
};
