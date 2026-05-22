/**
 * useUser -- reads the current session user.
 *
 * Source of truth in mock-land is the Zustand auth store. Wrapping it in a
 * useQuery means screens get the standard `{ data, isLoading, error }` shape
 * they're already coded against, and TanStack auto-refetches whenever the
 * session changes (login / logout / OAuth all rotate the queryKey).
 *
 * On real-API day, swap queryFn to `api.get('/users/me')` and the screens
 * stay untouched.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

export const useUser = () => {
  const sessionUser = useAuthStore((s) => s.user);
  return useQuery<User | null>({
    queryKey: ['user', sessionUser?.id ?? null, sessionUser?.email ?? null],
    queryFn: async () => sessionUser ?? null,
    staleTime: Infinity,
  });
};
