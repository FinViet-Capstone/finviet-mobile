/**
 * category.ts - FinViet type definitions for the Category v2 domain
 *
 * customer_categories: per-customer expense category set, seeded in full at onboarding
 * (every system expense category, at its default bucket).
 * Income categories are global — never stored in customer_categories.
 * All 3 buckets are freely movable via moveBucket (see item 5 of
 * context/fe-plan-2026-07-revamp.md).
 */

import type { BucketType } from '@/constants/categories';

// -------------------------------------------------------------------------
// CustomerCategory
// Mirrors the customer_categories DB table (v2 schema).
// -------------------------------------------------------------------------

export type CategorySource = 'manual' | 'system';

export interface CustomerCategory {
  id: string;
  customerId: string;
  /** References a global Category.id */
  categoryId: string;
  /** Which bucket this customer has placed the category in */
  bucketId: BucketType;
  /** How this entry was created */
  source: CategorySource;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// -------------------------------------------------------------------------
// moveBucket input (services/real/categories.ts)
// -------------------------------------------------------------------------

export interface MoveBucketPayload {
  customerCategoryId: string;
  targetBucket: BucketType;
}

