/**
 * customCategory.ts - a customer-created category with a user-picked icon.
 *
 * Distinct from the global system catalog (constants/categories.ts) and from
 * CustomerCategory (a per-customer bucket override of a *system* category,
 * see types/category.ts) — a CustomCategory has no entry in the system
 * catalog at all; the customer defines its name/bucket/color themselves.
 *
 * The icon file itself never syncs anywhere (see lib/categoryIconStorage.ts) —
 * only this metadata is a normal syncable record.
 */

import type { BucketType } from '@/constants/categories';

export interface CustomCategory {
  /** Always prefixed `custom_` so it's distinguishable from system category ids. */
  id: string;
  customerId: string;
  nameVi: string;
  type: 'expense' | 'income';
  /** null only for income (mirrors the system catalog's income categories). */
  bucketId: BucketType | null;
  /** Hex color, e.g. '#F97316'. */
  color: string;
  /** false = hidden from pickers but not deleted. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------------------
// Custom category service input contracts (services/real/customCategories.ts)
// -------------------------------------------------------------------------

export interface CreateCustomCategoryInput {
  nameVi: string;
  type: 'expense' | 'income';
  bucketId: BucketType | null;
  color: string;
}

export interface BulkBucketMove {
  id: string;
  bucketId: BucketType;
}
