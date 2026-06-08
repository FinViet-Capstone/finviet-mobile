/**
 * useUser -- reads & mutates the current session user.
 *
 * The mock source of truth is the Zustand auth store. Wrapping it in useQuery
 * preserves the standard `{ data, isLoading, error }` shape and makes any
 * session change (login / logout / updateUser / OAuth) auto-rotate the cache
 * via the queryKey.
 *
 * On real-API day, queryFn becomes `api.get('/users/me')` and the mutations
 * call `PATCH /users/me` -- screens stay untouched.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';
import type { User } from '@/types';

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useUser = () => {
  const sessionUser = useAuthStore((s) => s.user);
  return useQuery<User | null>({
    queryKey: queryKeys.user.session(sessionUser?.id ?? null, sessionUser?.email ?? null),
    queryFn: async () => sessionUser ?? null,
    staleTime: Infinity, // session is derived from the auth store, never refetched
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  monthlyIncome?: number | null;
}

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: async (patch: UpdateProfileInput) => {
      await delay();
      updateUser({
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        ...(patch.monthlyIncome !== undefined
          ? { monthlyIncome: patch.monthlyIncome }
          : {}),
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.all() }),
  });
};

export interface UpdatePreferencesInput {
  language?: 'vi' | 'en';
  theme?: 'light' | 'dark' | 'system';
  defaultWalletId?: string | null;
  defaultCurrency?: string;
  dailySpendLimit?: number | null;
  notifications?: Partial<{ budget: boolean; report: boolean; goals: boolean }>;
}

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const currentUser = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (patch: UpdatePreferencesInput) => {
      await delay();
      updateUser({
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
        ...(patch.defaultWalletId !== undefined
          ? { defaultWalletId: patch.defaultWalletId }
          : {}),
        ...(patch.defaultCurrency !== undefined
          ? { defaultCurrency: patch.defaultCurrency }
          : {}),
        ...(patch.dailySpendLimit !== undefined
          ? { dailySpendLimit: patch.dailySpendLimit }
          : {}),
        ...(patch.notifications !== undefined && currentUser
          ? {
              notifications: {
                ...currentUser.notifications,
                ...patch.notifications,
              },
            }
          : {}),
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.all() }),
  });
};
