import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function buildReviewFilters(walletId?: string): TransactionFilters {
  return {
    categorizationStatus: REVIEW_STATUSES,
    entryMethod: 'linked',
    ...(walletId ? { walletId } : {}),
  };
}

/** SePay expenses awaiting review, newest first. `walletId` omitted = all linked wallets. */
export const useSepayReviewQueue = (walletId?: string) => {
  const filters = buildReviewFilters(walletId);
  return useQuery({
    queryKey: queryKeys.transactions.review(filters),
    queryFn: () => getTransactions(filters),
    staleTime: STALE_TIME.short,
    refetchInterval: (query) => getReviewRefetchInterval(query.state.data),
  });
};

/**
 * Apply a category to a review row (accepting the AI suggestion or a manual pick).
 * The row leaves every review list immediately and comes back if the request fails.
 */
export const useReviewOverride = () => {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { transactionId: string; categoryId: string },
    { snapshots: [readonly unknown[], Transaction[] | undefined][] }
  >({
    mutationFn: ({ transactionId, categoryId }) => overrideCategorization(transactionId, categoryId),
    onMutate: async ({ transactionId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.transactions.reviewAll() });
      const snapshots = qc.getQueriesData<Transaction[]>({ queryKey: queryKeys.transactions.reviewAll() });
      qc.setQueriesData<Transaction[]>({ queryKey: queryKeys.transactions.reviewAll() }, (rows) =>
        rows?.filter((row) => row.id !== transactionId),
      );
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, rows]) => qc.setQueryData(key, rows));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
      invalidateAiDerived(qc);
    },
  });
};
