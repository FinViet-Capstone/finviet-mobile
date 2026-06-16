/**
 * useCustomerCategories — reads the per-customer expense category set
 * and exposes moveBucket (blocks savings).
 *
 * On real-API day, queryFn → GET /customers/me/categories,
 * moveBucket mutation → PATCH /customers/me/categories/:id
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';
import type { CustomerCategory } from '@/types/category';
import {
  getCustomerCategories,
  moveBucket,
  seedFromPersona,
  type MoveBucketPayload,
} from '@/services/mock/customerCategories';

// ─── Query ────────────────────────────────────────────────────────────────────

export const useCustomerCategories = () => {
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useQuery<CustomerCategory[]>({
    queryKey: queryKeys.customerCategories(customerId),
    queryFn: async () => {
      if (!customerId) return [];
      return getCustomerCategories(customerId);
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
};

// ─── Mutation: move bucket ────────────────────────────────────────────────────

export const useMoveBucket = () => {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useMutation({
    mutationFn: (payload: MoveBucketPayload) => moveBucket(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.customerCategories(customerId) }),
  });
};

// ─── Mutation: seed from persona (onboarding) ──────────────────────────────────

export const useSeedCategories = () => {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useMutation({
    mutationFn: async (input: { gender: 'male' | 'female' | 'other' | null; dateOfBirth: string | null }) => {
      if (!customerId) return [];
      return seedFromPersona(customerId, input.gender, input.dateOfBirth);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.customerCategories(customerId) }),
  });
};
