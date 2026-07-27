import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEffectiveIncomeAllocation,
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
