/**
 * useCategoryRequests — lists pending category requests for the current customer,
 * and exposes useCreateCategoryRequest to submit new ones.
 *
 * On real-API day: GET /category-requests, POST /category-requests
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';
import type { CategoryRequest } from '@/types/category';
import {
  getCategoryRequests,
  createCategoryRequest,
  type CreateCategoryRequestPayload,
} from '@/services';

// ─── Query ────────────────────────────────────────────────────────────────────

export const useCategoryRequests = () => {
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useQuery<CategoryRequest[]>({
    queryKey: queryKeys.categoryRequests(customerId),
    queryFn: async () => {
      if (!customerId) return [];
      return getCategoryRequests(customerId);
    },
    enabled: !!customerId,
    staleTime: 60 * 1000,
  });
};

// ─── Mutation: create request ─────────────────────────────────────────────────

export const useCreateCategoryRequest = () => {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useMutation({
    mutationFn: (payload: Omit<CreateCategoryRequestPayload, 'customerId'>) => {
      if (!customerId) throw new Error('not_authenticated');
      return createCategoryRequest({ ...payload, customerId });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.categoryRequests(customerId) }),
  });
};
