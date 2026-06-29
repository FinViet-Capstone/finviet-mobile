/**
 * real/categories.ts — real .NET category service (customer category set).
 *
 * Mirrors the surface of src/services/mock/customerCategories.ts that the app
 * consumes (getCustomerCategories / moveBucket / seedFromPersona) so the barrel
 * can swap mock ⇄ real.
 *
 * Backend reality: the .NET API exposes a GLOBAL category catalog
 * (GET /api/categories) where each expense category carries a `expenseClass`
 * (needs | wants | savings) — the same 3-bucket model the FE calls bucketId.
 * There is no per-customer bucket table server-side, so:
 *   - getCustomerCategories derives the customer set from the catalog (the
 *     category's expenseClass is the bucket).
 *   - moveBucket has no endpoint to persist to; it records a SESSION-LOCAL
 *     override so the UI stays responsive. Overrides are intentionally not
 *     persisted across launches — flag for backend follow-up if real
 *     per-customer buckets are needed.
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

// Session-local bucket overrides keyed by categoryId (no backend persistence).
const bucketOverrides = new Map<string, BucketType>();

function isBucket(v: string | null | undefined): v is BucketType {
  return v === 'needs' || v === 'wants' || v === 'savings';
}

function toCustomerCategory(dto: CategoryDto): CustomerCategory {
  const fallback = getCategoryById(dto.categoryId)?.defaultBucket ?? 'needs';
  const baseBucket = isBucket(dto.expenseClass) ? dto.expenseClass : fallback;
  const bucketId = bucketOverrides.get(dto.categoryId) ?? baseBucket;
  return {
    id: dto.categoryId,
    customerId: '',
    categoryId: dto.categoryId,
    bucketId,
    source: 'system',
    isActive: true,
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
  // Savings is locked both ways — identical guard to the mock.
  if (payload.targetBucket === 'savings') {
    throw new Error('savings_locked');
  }
  const current =
    bucketOverrides.get(payload.customerCategoryId) ??
    getCategoryById(payload.customerCategoryId)?.defaultBucket ??
    'needs';
  if (current === 'savings') {
    throw new Error('savings_locked');
  }

  bucketOverrides.set(payload.customerCategoryId, payload.targetBucket);
  return {
    id: payload.customerCategoryId,
    customerId: '',
    categoryId: payload.customerCategoryId,
    bucketId: payload.targetBucket,
    source: 'system',
    isActive: true,
    createdAt: '',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * No-op against the real API: the backend catalog already carries buckets, so
 * there is nothing to seed. Returns the current customer set so onboarding flows
 * that await this keep working.
 */
export async function seedFromPersona(
  customerId: string,
  _gender: 'male' | 'female' | 'other' | null,
  _dateOfBirth: string | null,
): Promise<CustomerCategory[]> {
  return getCustomerCategories(customerId);
}

export async function deactivateCustomerCategory(_id: string): Promise<void> {
  // No per-customer category row to deactivate server-side; no-op.
}
