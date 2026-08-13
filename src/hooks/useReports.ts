import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSpendingScore,
  getWeeklyReport,
  getChatHistory,
  getChatSessions,
  getChatSessionMessages,
  createChatSession,
  sendChatMessage,
  generateWeeklyReport,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import type { ChatMessage, ChatSession } from '@/types';

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

/** Open a new conversation, titled with the question that starts it. */
export const useCreateChatSession = () => {
  const qc = useQueryClient();
  return useMutation<ChatSession, Error, string | undefined>({
    mutationFn: (title) => createChatSession(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.reports.all(), 'sessions'] });
    },
  });
};

/**
 * Send a chat question to the AI advisor. Omitting `sessionId` targets the default
 * session. On success the chat history and session list are invalidated so the
 * history drawer picks up the new exchange.
 */
export const useSendChatMessage = () => {
  const qc = useQueryClient();
  return useMutation<ChatMessage, Error, { question: string; sessionId?: string }>({
    mutationFn: ({ question, sessionId }) => sendChatMessage(question, sessionId),
    onSuccess: (message) => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.chat() });
      qc.invalidateQueries({ queryKey: [...queryKeys.reports.all(), 'sessions'] });
      qc.invalidateQueries({
        queryKey: [...queryKeys.reports.all(), 'session', message.sessionId],
      });
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
