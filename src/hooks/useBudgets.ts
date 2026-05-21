import { useQuery } from '@tanstack/react-query';
import { getBudgets, getBudgetById } from '@/services';

export const useBudgets = () =>
  useQuery({ queryKey: ['budgets'], queryFn: () => getBudgets() });

export const useBudgetById = (id: string | undefined) =>
  useQuery({
    queryKey: ['budgets', id],
    queryFn: () => (id ? getBudgetById(id) : undefined),
    enabled: !!id,
  });
