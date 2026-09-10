import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  updateCustomCategoryBucket,
  bulkUpdateCustomCategoryBucket,
  type CreateCustomCategoryInput,
  type BulkBucketMove,
} from '@/services';
import type { BucketType } from '@/constants/categories';
import type { CustomCategory } from '@/types/customCategory';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';

/**
 * Both category lists come from the same endpoint (GET /categories?type=expense):
 * this key holds the `custom_`-filtered view, and queryKeys.customerCategories
 * holds the whole catalog that useCategoryCatalog (pickers, transaction rows,
 * the Budgets tab) reads. A write to one has to refresh both, or a newly created
 * category shows in the bucket editor and nowhere else until the other goes stale.
 */
function useInvalidateCategoryQueries() {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.customCategories() });
    qc.invalidateQueries({ queryKey: queryKeys.customerCategories(customerId) });
  };
}

export const useCustomCategories = () =>
  useQuery({
    queryKey: queryKeys.customCategories(),
    queryFn: () => getCustomCategories(),
    staleTime: STALE_TIME.medium,
  });

export const useCreateCustomCategory = () => {
  const invalidateCategories = useInvalidateCategoryQueries();
  return useMutation({
    mutationFn: (input: CreateCustomCategoryInput) => createCustomCategory(input),
    onSuccess: invalidateCategories,
  });
};

export const useDeleteCustomCategory = () => {
  const invalidateCategories = useInvalidateCategoryQueries();
  return useMutation({
    mutationFn: (id: string) => deleteCustomCategory(id),
    onSuccess: invalidateCategories,
  });
};

/** Reassign a customer-created category to a different bucket (drag-and-drop). */
export const useUpdateCustomCategoryBucket = () => {
  const qc = useQueryClient();
  const invalidateCategories = useInvalidateCategoryQueries();
  const key = queryKeys.customCategories();
  return useMutation({
    mutationFn: ({ id, bucketId }: { id: string; bucketId: BucketType }) =>
      updateCustomCategoryBucket(id, bucketId),
    // Optimistic update — same reasoning as useMoveBucket: the drag-and-drop
    // UI needs the new bucket to show immediately, not after refetch resolves.
    onMutate: async ({ id, bucketId }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CustomCategory[]>(key);
      qc.setQueryData<CustomCategory[]>(key, (old) =>
        old?.map((c) => (c.id === id ? { ...c, bucketId } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: invalidateCategories,
  });
};

/** Persist every staged drag-and-drop move for custom categories in one round trip. */
export const useBulkUpdateCustomCategoryBucket = () => {
  const invalidateCategories = useInvalidateCategoryQueries();
  return useMutation({
    mutationFn: (moves: BulkBucketMove[]) => bulkUpdateCustomCategoryBucket(moves),
    onSuccess: invalidateCategories,
  });
};
