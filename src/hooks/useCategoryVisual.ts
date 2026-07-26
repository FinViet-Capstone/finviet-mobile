import { useMemo } from 'react';
import { useCustomCategories } from './useCustomCategories';
import { resolveCategoryVisual, type CategoryVisual } from '@/lib/categoryVisual';

/** Resolves a category id (system or customer-created) to name/color/bucket/icon. */
export function useCategoryVisual(categoryId: string): CategoryVisual {
  const { data: customCategories } = useCustomCategories();
  return useMemo(
    () => resolveCategoryVisual(categoryId, customCategories ?? []),
    [categoryId, customCategories],
  );
}
