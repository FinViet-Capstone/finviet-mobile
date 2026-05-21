import { useQuery } from '@tanstack/react-query';
import {
  getTransactions,
  getTransactionById,
  getRecentTransactions,
  type TransactionFilters,
} from '@/services';

export const useTransactions = (filters?: TransactionFilters) =>
  useQuery({
    queryKey: ['transactions', filters ?? null],
    queryFn: () => getTransactions(filters),
  });

export const useTransactionById = (id: string | undefined) =>
  useQuery({
    queryKey: ['transactions', id],
    queryFn: () => (id ? getTransactionById(id) ?? null : null),
    enabled: !!id,
  });

export const useRecentTransactions = (n: number = 10) =>
  useQuery({
    queryKey: ['transactions', 'recent', n],
    queryFn: () => getRecentTransactions(n),
  });
