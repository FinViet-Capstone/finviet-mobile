/**
 * real/customCategories.ts — real .NET custom-category service.
 *
 * Backend reality: custom categories are just rows in the same global
 * `categories` table as system categories (id prefixed `custom_`, always
 * `type="expense"`), scoped to their creator via an active CustomerCategory
 * ownership row. There's no dedicated "list my custom categories" endpoint —
 * they come back mixed into GET /categories?type=expense alongside system
 * categories, so getCustomCategories() filters that list down to the
 * `custom_`-prefixed ids. Bucket assignment reuses the same
 * PUT /categories/{id}/bucket endpoint the system-category bucket moves use
 * (see real/categories.ts) — it works uniformly for any expense category the
 * caller can see, custom or not. The icon file itself never reaches the
 * backend either way (lib/categoryIconStorage.ts keeps it on-device only).
 */

import { api, unwrap } from '@/lib/api';
import type { CustomCategory, CreateCustomCategoryInput, BulkBucketMove } from '@/types/customCategory';
import type { BucketType } from '@/constants/categories';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface CategoryResponseDto {
  categoryId: string;
  categoryName: string;
  nameVi: string | null;
  nameEn: string | null;
  type: string;
  isMandatory: boolean;
  expenseClass: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number | null;
}

function isBucket(v: string | null | undefined): v is BucketType {
  return v === 'needs' || v === 'wants' || v === 'savings';
}

function toCustomCategory(dto: CategoryResponseDto): CustomCategory {
  return {
    id: dto.categoryId,
    customerId: '',
    nameVi: dto.nameVi ?? dto.categoryName,
    type: 'expense',
    bucketId: isBucket(dto.expenseClass) ? dto.expenseClass : null,
    color: dto.color ?? '#8A8A8A',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getCustomCategories(): Promise<CustomCategory[]> {
  const res = await api.get('/categories', { params: { type: 'expense' } });
  return unwrap<CategoryResponseDto[]>(res)
    .filter((dto) => dto.categoryId.startsWith('custom_'))
    .map(toCustomCategory);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createCustomCategory(
  input: CreateCustomCategoryInput,
): Promise<CustomCategory> {
  const res = await api.post('/categories/custom', {
    name: input.nameVi,
    bucket: input.bucketId,
    color: input.color,
  });
  return toCustomCategory(unwrap<CategoryResponseDto>(res));
}

export async function deleteCustomCategory(id: string): Promise<void> {
  await api.delete(`/categories/custom/${id}`);
}

/** Reassign a customer-created category to a different bucket (drag-and-drop). */
export async function updateCustomCategoryBucket(
  id: string,
  bucketId: BucketType,
): Promise<CustomCategory> {
  const res = await api.put(`/categories/${id}/bucket`, { bucketId });
  return toCustomCategory(unwrap<CategoryResponseDto>(res));
}

/** Persist every staged drag-and-drop move in one round trip ("Lưu thay đổi"). */
export async function bulkUpdateCustomCategoryBucket(
  moves: BulkBucketMove[],
): Promise<CustomCategory[]> {
  const results: CustomCategory[] = [];
  for (const move of moves) {
    // Sequential, not Promise.all: no bulk endpoint exists to batch these into.
    results.push(await updateCustomCategoryBucket(move.id, move.bucketId));
  }
  return results;
}
