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
import { updateProfile, updateProfileSettings, USE_MOCK } from '@/services';
import { updateMockCustomer } from '@/services/mock/user';

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
  /** 50-30-20 budget bucket allocation — pass all three together; each must be 0-100 and sum to 100. */
  needsPct?: number;
  wantsPct?: number;
  savingsPct?: number;
}

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  return useMutation({
    mutationFn: async (patch: UpdateProfileInput) => {
      const currentCustomer = useAuthStore.getState().customer;
      if (currentCustomer) {
        // Fallback to existing values if not specified in patch
        await updateProfile({
          fullName: patch.displayName ?? currentCustomer.displayName,
          monthlyIncomeExpected: patch.monthlyIncome !== undefined ? patch.monthlyIncome : currentCustomer.monthlyIncome,
          gender: currentCustomer.gender,
          dateOfBirth: currentCustomer.dateOfBirth,
          ...(patch.needsPct !== undefined && patch.wantsPct !== undefined && patch.savingsPct !== undefined
            ? { needsPct: patch.needsPct, wantsPct: patch.wantsPct, savingsPct: patch.savingsPct }
            : {}),
        });
      } else {
        await delay();
      }

      updateCustomer({
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        ...(patch.monthlyIncome !== undefined
          ? { monthlyIncome: patch.monthlyIncome }
          : {}),
        ...(patch.needsPct !== undefined ? { needsPct: patch.needsPct } : {}),
        ...(patch.wantsPct !== undefined ? { wantsPct: patch.wantsPct } : {}),
        ...(patch.savingsPct !== undefined ? { savingsPct: patch.savingsPct } : {}),
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
  /** [warningPct, exceededPct] for budget_alert notifications. */
  notifBudgetThresholds?: [number, number];
}

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const currentCustomer = useAuthStore((s) => s.customer);
  return useMutation({
    mutationFn: async (patch: UpdatePreferencesInput) => {
      const merged = {
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
        ...(patch.notifBudgetThresholds !== undefined
          ? { notifBudgetThresholds: patch.notifBudgetThresholds }
          : {}),
        updatedAt: new Date().toISOString(),
      };

      // theme + notifBudgetThresholds are real, backend-persisted settings
      // (PATCH /profile/settings — swapped mock/real by the services barrel
      // like everything else). language/defaultCurrency/notifications have no
      // backend counterpart yet and stay local-only (mock store below, every
      // mode) so a preference survives a logout/login instead of resetting.
      if (patch.theme !== undefined || patch.notifBudgetThresholds !== undefined) {
        await updateProfileSettings({
          theme: patch.theme,
          notifBudgetThresholds: patch.notifBudgetThresholds,
        });
      } else {
        await delay();
      }

      updateCustomer(merged);
      if (USE_MOCK) updateMockCustomer(merged);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.all() }),
  });
};
