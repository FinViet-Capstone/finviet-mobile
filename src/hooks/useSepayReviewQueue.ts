import { keepPreviousData, useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTransactions, overrideCategorization, type TransactionFilters } from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import type { Transaction } from '@/types';
import { invalidateAiDerived } from './useReports';

export const REVIEW_POLL_INTERVAL_MS = 3000;

/** Statuses that still need the customer's attention (the "Cần xem lại" inbox). */
export const REVIEW_STATUSES: NonNullable<TransactionFilters['categorizationStatus']> = [
  'pending',
  'suggested',
  'unsure',
  'failed',
];

/** Poll only while the backend is still classifying at least one row. */
export function getReviewRefetchInterval(rows: Transaction[] | undefined): number | false {
  return rows?.some((row) => row.categorizationStatus === 'pending') ? REVIEW_POLL_INTERVAL_MS : false;
}

const REVIEW_OVERRIDE_KEY = ['review-override'] as const;

export function buildReviewFilters(walletId?: string): TransactionFilters {
  return {
    categorizationStatus: REVIEW_STATUSES,
    entryMethod: 'linked',
    // Review rows are expenses only; the category picker offers expense categories.
    type: 'expense',
    ...(walletId ? { walletId } : {}),
  };
}

/** SePay expenses awaiting review, newest first. `walletId` omitted = all linked wallets. */
export const useSepayReviewQueue = (walletId?: string) => {
  const filters = buildReviewFilters(walletId);
  // Rows with an override in flight stay hidden even if a poll or refetch returns them
  // before the server has applied the change.
  const inFlightIds = useMutationState({
    filters: { mutationKey: REVIEW_OVERRIDE_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as ReviewOverrideInput).transactionId,
  });
  return useQuery({
    queryKey: queryKeys.transactions.review(filters),
    queryFn: () => getTransactions(filters),
    staleTime: STALE_TIME.short,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => getReviewRefetchInterval(query.state.data),
    select: (rows) => (inFlightIds.length ? rows.filter((row) => !inFlightIds.includes(row.id)) : rows),
  });
};

export interface ReviewOverrideInput {
  transactionId: string;
  categoryId: string;
  /** Extra context handed back to the callbacks, e.g. to offer a merchant rule. */
  merchant?: string | null;
  offerRule?: boolean;
}

interface ReviewOverrideOptions {
  onSuccess?: (variables: ReviewOverrideInput) => void;
  onError?: (error: Error, variables: ReviewOverrideInput) => void;
}

/**
 * Apply a category to a review row (accepting the AI suggestion or a manual pick).
 * The row leaves every review list immediately and only that row comes back if its
 * request fails. Callbacks are hook-level so they fire for every call, not just the last.
 */
export const useReviewOverride = ({ onSuccess, onError }: ReviewOverrideOptions = {}) => {
  const qc = useQueryClient();
  return useMutation<unknown, Error, ReviewOverrideInput, { removed: [readonly unknown[], Transaction, number][] }>({
    mutationKey: REVIEW_OVERRIDE_KEY,
    mutationFn: ({ transactionId, categoryId }) => overrideCategorization(transactionId, categoryId),
    onMutate: async ({ transactionId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.transactions.reviewAll() });
      const removed: [readonly unknown[], Transaction, number][] = [];
      qc.getQueriesData<Transaction[]>({ queryKey: queryKeys.transactions.reviewAll() }).forEach(([key, rows]) => {
        const index = rows?.findIndex((r) => r.id === transactionId) ?? -1;
        if (rows && index >= 0) removed.push([key, rows[index], index]);
      });
      qc.setQueriesData<Transaction[]>({ queryKey: queryKeys.transactions.reviewAll() }, (rows) =>
        rows?.filter((row) => row.id !== transactionId),
      );
      return { removed };
    },
    onError: (error, variables, context) => {
      context?.removed.forEach(([key, row, index]) =>
        qc.setQueryData<Transaction[]>(key, (rows) =>
          rows && !rows.some((r) => r.id === row.id) ? [...rows.slice(0, index), row, ...rows.slice(index)] : rows,
        ),
      );
      onError?.(error, variables);
    },
    onSuccess: (_data, variables) => onSuccess?.(variables),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
      invalidateAiDerived(qc);
    },
  });
};
