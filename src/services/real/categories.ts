/**
 * real/categories.ts — real .NET category service (customer category set).
 *
 * Mirrors the surface of src/services/mock/customerCategories.ts that the app
 * consumes (getCustomerCategories / moveBucket / seedDefaultCategories) so the
 * barrel can swap mock ⇄ real.
 *
 * Backend reality: the .NET API exposes a GLOBAL category catalog
 * (GET /api/categories) where each expense category carries a `expenseClass`
 * (needs | wants | savings) — the same 3-bucket model the FE calls bucketId.
 * There is no per-customer bucket TABLE server-side, but the backend does now
 * persist a per-customer bucket OVERRIDE via PUT /categories/{id}/bucket
 * (upserts a CustomerCategory row keyed on categoryId), and GET /categories
 * already reflects any active override in `expenseClass` — so moveBucket
 * writes through to the real backend instead of a session-local cache.
 */

import { api, unwrap } from '@/lib/api';
import type { CustomerCategory } from '@/types/category';
import type { BucketType } from '@/constants/categories';
import { getCategoryById } from '@/constants/categories';
import type { MoveBucketPayload } from '@/services/mock/customerCategories';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface CategoryDto {
  categoryId: string;
  categoryName: string;
  nameVi: string | null;
  nameEn: string | null;
  type: string;
  isMandatory: boolean;
  expenseClass: string | null; // needs | wants | savings
  icon: string | null;
  color: string | null;
  sortOrder: number | null;
}

function isBucket(v: string | null | undefined): v is BucketType {
  return v === 'needs' || v === 'wants' || v === 'savings';
}

function toCustomerCategory(dto: CategoryDto): CustomerCategory {
  const fallback = getCategoryById(dto.categoryId)?.defaultBucket ?? 'needs';
  const bucketId = isBucket(dto.expenseClass) ? dto.expenseClass : fallback;
  return {
    id: dto.categoryId,
    customerId: '',
    categoryId: dto.categoryId,
    bucketId,
    source: 'system',
    createdAt: '',
    updatedAt: '',
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getCustomerCategories(
  _customerId: string,
): Promise<CustomerCategory[]> {
  // Income categories are global and never part of the customer (bucketed) set.
  const res = await api.get('/categories', { params: { type: 'expense' } });
  return unwrap<CategoryDto[]>(res).map(toCustomerCategory);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function moveBucket(
  payload: MoveBucketPayload,
): Promise<CustomerCategory> {
  // All 3 buckets are freely movable — the bucket-override endpoint has no
  // savings restriction server-side either (confirmed with BE).
  const res = await api.put(`/categories/${payload.customerCategoryId}/bucket`, {
    bucketId: payload.targetBucket,
  });
  return toCustomerCategory(unwrap<CategoryDto>(res));
}

/** Persist every staged drag-and-drop move in one round trip ("Lưu thay đổi"). */
export async function bulkMoveBucket(
  payloads: MoveBucketPayload[],
): Promise<CustomerCategory[]> {
  const results: CustomerCategory[] = [];
  for (const payload of payloads) {
    // Sequential, not Promise.all: each call upserts a per-category row on the
    // backend, and there is no bulk endpoint to batch them into.
    results.push(await moveBucket(payload));
  }
  return results;
}

/**
 * No-op against the real API: the backend catalog already carries buckets, so
 * there is nothing to seed. Returns the current customer set so onboarding flows
 * that await this keep working.
 */
export async function seedDefaultCategories(customerId: string): Promise<CustomerCategory[]> {
  return getCustomerCategories(customerId);
}
