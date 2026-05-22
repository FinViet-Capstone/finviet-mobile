import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTransactions,
  getTransactionById,
  getRecentTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type TransactionFilters,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/services';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useTransactions = (filters?: TransactionFilters) =>
  useQuery({
    queryKey: ['transactions', filters ?? null],
    queryFn: () => getTransactions(filters),
  });

export const useTransactionById = (id: string | undefined) =>
  useQuery({
    queryKey: ['transactions', 'byId', id],
    queryFn: () => (id ? getTransactionById(id) ?? null : null),
    enabled: !!id,
  });

export const useRecentTransactions = (n: number = 10) =>
  useQuery({
    queryKey: ['transactions', 'recent', n],
    queryFn: () => getRecentTransactions(n),
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Cross-cuts queries that depend on the transaction list. Wallet balances
 * change with every transaction, budgets recompute spend on read, and the
 * report dashboard reads recent transactions.
 */
function invalidateTransactionDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['wallets'] });
  qc.invalidateQueries({ queryKey: ['budgets'] });
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
