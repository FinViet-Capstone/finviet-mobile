import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSpendingScore,
  getWeeklyReport,
  getChatHistory,
  getChatSessions,
  getChatSessionMessages,
  sendChatMessage,
  generateWeeklyReport,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import type { ChatMessage } from '@/types';

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

/**
 * Send a chat question to the AI advisor. On success the flat chat history is
 * invalidated so the history drawer/session list pick up the new exchange.
 */
export const useSendChatMessage = () => {
  const qc = useQueryClient();
  return useMutation<ChatMessage, Error, string>({
    mutationFn: (question: string) => sendChatMessage(question),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.chat() });
      qc.invalidateQueries({ queryKey: [...queryKeys.reports.all(), 'sessions'] });
    },
  });
};

/** Force-generate the latest weekly report, then refresh the cached report. */
export const useGenerateWeeklyReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => generateWeeklyReport(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reports.weekly() }),
  });
};
