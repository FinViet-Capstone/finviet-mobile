/**
 * useCustomer -- reads & mutates the current session customer.
 *
 * The mock source of truth is the Zustand auth store. Wrapping it in useQuery
 * preserves the standard `{ data, isLoading, error }` shape and makes any
 * session change (login / logout / updateCustomer / OAuth) auto-rotate the cache
 * via the queryKey.
 *
 * On real-API day, queryFn becomes `api.get('/customers/me')` and the mutations
 * call `PATCH /customers/me` -- screens stay untouched.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';
import type { Customer } from '@/types';

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useCustomer = () => {
  const sessionCustomer = useAuthStore((s) => s.customer);
  return useQuery<Customer | null>({
    queryKey: queryKeys.user.session(sessionCustomer?.id ?? null, sessionCustomer?.email ?? null),
    queryFn: async () => sessionCustomer ?? null,
    staleTime: Infinity,
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
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  return useMutation({
    mutationFn: async (patch: UpdateProfileInput) => {
      await delay();
      updateCustomer({
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
  defaultCurrency?: string;
  notifications?: Partial<{ budget: boolean; report: boolean; goals: boolean }>;
}

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const currentCustomer = useAuthStore((s) => s.customer);
  return useMutation({
    mutationFn: async (patch: UpdatePreferencesInput) => {
      await delay();
      updateCustomer({
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
        ...(patch.defaultCurrency !== undefined
          ? { defaultCurrency: patch.defaultCurrency }
          : {}),
        ...(patch.notifications !== undefined && currentCustomer
          ? {
              notifications: {
                ...currentCustomer.notifications,
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
