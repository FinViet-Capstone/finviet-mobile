import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getSpendingScore,
  getWeeklyReport,
  getChatHistory,
  getChatSessions,
  getChatSessionMessages,
  createChatSession,
  sendChatMessage,
  generateWeeklyReport,
  categorizeTransaction,
  overrideCategorization,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import type { ChatMessage, ChatSession, CategorizationOutcome } from '@/types';

/**
 * Invalidate the AI-derived numbers that move with the customer's own money —
 * the spending score and weekly report — without touching chat history/sessions.
 * Called from transaction/goal/budget mutations so "Điểm chi tiêu" reflects what
 * the customer just did instead of sitting on a stale value for STALE_TIME.long
 * (5 min), or indefinitely on the score detail screen, which has no other refresh
 * trigger. Deliberately scoped narrower than `reports.all()` — chat has no reason
 * to refetch just because a transaction was logged.
 */
export function invalidateAiDerived(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.reports.score() });
  qc.invalidateQueries({ queryKey: queryKeys.reports.weekly() });
}

export const useSpendingScore = (view: 'weekly' | 'monthly' = 'weekly') =>
  useQuery({
    queryKey: [...queryKeys.reports.score(), view] as const,
    queryFn: () => getSpendingScore(view),
    staleTime: STALE_TIME.long,
  });

export const useWeeklyReport = (reportId?: string) =>
  useQuery({
    queryKey: [...queryKeys.reports.weekly(), reportId ?? 'latest'] as const,
    queryFn: () => getWeeklyReport(reportId),
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

/**
 * Run AI categorization on an existing (usually uncategorized) transaction, e.g. one that
 * landed uncategorized from SePay sync. Only invalidates dependents when the outcome was
 * actually `applied` — the default `suggest_only` AI mode returns a suggestion
 * (`suggestedCategoryId`/`suggestedCategoryName`) without writing it, which the caller must
 * offer the customer via `useOverrideCategorization` instead.
 */
export const useCategorizeTransaction = () => {
  const qc = useQueryClient();
  return useMutation<CategorizationOutcome, Error, string>({
    mutationFn: (transactionId) => categorizeTransaction(transactionId),
    onSuccess: (outcome) => {
      if (!outcome.applied) return;
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
      invalidateAiDerived(qc);
    },
  });
};

/** Force-apply a category to a transaction (accepting an AI suggestion, or a manual pick),
 * bypassing the AI mode gate — always writes, unlike `useCategorizeTransaction`. */
export const useOverrideCategorization = () => {
  const qc = useQueryClient();
  return useMutation<CategorizationOutcome, Error, { transactionId: string; categoryId: string }>({
    mutationFn: ({ transactionId, categoryId }) => overrideCategorization(transactionId, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
      invalidateAiDerived(qc);
    },
  });
};
