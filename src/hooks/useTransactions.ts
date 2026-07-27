import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTransactions,
  getTransactionById,
  getRecentTransactions,
  getTransactionSummary,
  createTransaction,
  updateTransaction,
  classifyTransaction,
  deleteTransaction,
  type TransactionFilters,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useTransactions = (filters?: TransactionFilters, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.transactions.list(filters ?? null),
    queryFn: () => getTransactions(filters),
    staleTime: STALE_TIME.short,
    enabled: options?.enabled,
  });

export const useTransactionById = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => (id ? getTransactionById(id) ?? null : null),
    enabled: !!id,
    staleTime: STALE_TIME.short,
  });

export const useRecentTransactions = (n: number = 10) =>
  useQuery({
    queryKey: queryKeys.transactions.recent(n),
    queryFn: () => getRecentTransactions(n),
    staleTime: STALE_TIME.short,
  });

/** Monthly income/expense/net + breakdowns. `month` is 1-based (Jan = 1). */
export const useTransactionSummary = (year: number, month: number) =>
  useQuery({
    queryKey: queryKeys.transactions.summary(year, month),
    queryFn: () => getTransactionSummary(year, month),
    staleTime: STALE_TIME.short,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Cross-cuts queries that depend on the transaction list. Wallet balances
 * change with every transaction, budgets recompute spend on read, and the
 * report dashboard reads recent transactions.
 */
function invalidateTransactionDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
  qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
  qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
}

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: () => invalidateTransactionDependents(qc),
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTransactionInput }) =>
      updateTransaction(id, patch),
    onSuccess: () => invalidateTransactionDependents(qc),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateTransactionDependents(qc),
  });
};

/** Recategorize a transaction (category-only), then refresh dependents. */
export const useClassifyTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string | null }) =>
      classifyTransaction(id, categoryId),
    onSuccess: () => invalidateTransactionDependents(qc),
  });
};
