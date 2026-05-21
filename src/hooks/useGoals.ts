import { useQuery } from '@tanstack/react-query';
import { getGoals, getGoalById } from '@/services';

export const useGoals = () =>
  useQuery({ queryKey: ['goals'], queryFn: () => getGoals() });

export const useGoalById = (id: string | undefined) =>
  useQuery({
    queryKey: ['goals', id],
    queryFn: () => (id ? getGoalById(id) ?? null : null),
    enabled: !!id,
  });
