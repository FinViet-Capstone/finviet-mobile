import { useQuery } from '@tanstack/react-query';
import { getSpendingScore, getWeeklyReport, getChatHistory } from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

export const useSpendingScore = () =>
  useQuery({
    queryKey: queryKeys.reports.score(),
    queryFn: () => getSpendingScore(),
    staleTime: STALE_TIME.long,
  });

export const useWeeklyReport = () =>
  useQuery({
    queryKey: queryKeys.reports.weekly(),
    queryFn: () => getWeeklyReport(),
    staleTime: STALE_TIME.long,
  });

export const useChatHistory = () =>
  useQuery({
    queryKey: queryKeys.reports.chat(),
    queryFn: () => getChatHistory(),
    staleTime: STALE_TIME.long,
  });
