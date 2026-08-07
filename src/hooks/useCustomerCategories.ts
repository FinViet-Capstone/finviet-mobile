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
  seedDefaultCategories,
  type MoveBucketPayload,
} from '@/services';

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
  const key = queryKeys.customerCategories(customerId);
  return useMutation({
    mutationFn: (payload: MoveBucketPayload) => moveBucket(payload),
    // Optimistic update — the drag-and-drop UI needs the new bucket to show
    // immediately, not after the invalidate→refetch round trip resolves.
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CustomerCategory[]>(key);
      qc.setQueryData<CustomerCategory[]>(key, (old) =>
        old?.map((c) =>
          c.id === payload.customerCategoryId
            ? { ...c, bucketId: payload.targetBucket }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
};

// ─── Mutation: seed default categories (onboarding) ─────────────────────────────

export const useSeedCategories = () => {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useMutation({
    mutationFn: async () => {
      if (!customerId) return [];
      return seedDefaultCategories(customerId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.customerCategories(customerId) }),
  });
};
