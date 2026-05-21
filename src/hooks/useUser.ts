import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/services';

export const useUser = () =>
  useQuery({ queryKey: ['user'], queryFn: () => getUser() });
