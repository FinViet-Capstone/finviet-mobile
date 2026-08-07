import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  updateCustomCategoryBucket,
  type CreateCustomCategoryInput,
} from '@/services';
import type { BucketType } from '@/constants/categories';
import type { CustomCategory } from '@/types/customCategory';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

export const useCustomCategories = () =>
  useQuery({
    queryKey: queryKeys.customCategories(),
    queryFn: () => getCustomCategories(),
    staleTime: STALE_TIME.medium,
  });

export const useCreateCustomCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomCategoryInput) => createCustomCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.customCategories() }),
  });
};

export const useDeleteCustomCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.customCategories() }),
  });
};

/** Reassign a customer-created category to a different bucket (drag-and-drop). */
export const useUpdateCustomCategoryBucket = () => {
  const qc = useQueryClient();
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
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
};
