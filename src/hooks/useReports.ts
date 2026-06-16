import { useQuery } from '@tanstack/react-query';
import { getSpendingScore, getWeeklyReport, getChatHistory, getChatSessions, getChatSessionMessages } from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

export const useSpendingScore = (view: 'weekly' | 'monthly' = 'weekly') =>
  useQuery({
    queryKey: [...queryKeys.reports.score(), view] as const,
    queryFn: () => getSpendingScore(view),
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

export const useChatSessions = () =>
  useQuery({
    queryKey: [...queryKeys.reports.all(), 'sessions'] as const,
    queryFn: () => getChatSessions(),
    staleTime: STALE_TIME.long,
  });

export const useChatSessionMessages = (sessionId: string | null) =>
  useQuery({
    queryKey: [...queryKeys.reports.all(), 'session', sessionId] as const,
    queryFn: () => getChatSessionMessages(sessionId!),
    enabled: !!sessionId,
    staleTime: STALE_TIME.long,
  });
