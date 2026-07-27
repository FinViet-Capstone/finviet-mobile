import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  updateCustomCategoryBucket,
  type CreateCustomCategoryInput,
} from '@/services';
import type { BucketType } from '@/constants/categories';
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
  return useMutation({
    mutationFn: ({ id, bucketId }: { id: string; bucketId: BucketType }) =>
      updateCustomCategoryBucket(id, bucketId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.customCategories() }),
  });
};
