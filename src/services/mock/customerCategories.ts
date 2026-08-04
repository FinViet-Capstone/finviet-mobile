/**
 * mock/customerCategories.ts
 *
 * Per-customer expense category set (v2).
 * Income categories are global — never stored here.
 * All 3 buckets (needs/wants/savings) are freely movable — see
 * context/fe-plan-2026-07-revamp.md item 5. Confirmed with BE that savings
 * was never actually locked server-side either.
 */

import type { CustomerCategory } from '@/types/category';
import type { BucketType } from '@/constants/categories';
import { EXPENSE_CATEGORIES } from '@/constants/categories';

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ─── In-memory store ─────────────────────────────────────────────────────────

let _store: CustomerCategory[] = [];
let _nextId = 1;

function makeId() { return `cc_${_nextId++}`; }

/** Seed customer_categories with every system expense category (called during onboarding) */
export function seedDefaultCategories(customerId: string): CustomerCategory[] {
  const now = new Date().toISOString();

  // Remove existing entries for this customer before re-seeding
  _store = _store.filter((c) => c.customerId !== customerId);

  const seeded: CustomerCategory[] = EXPENSE_CATEGORIES.map((c) => ({
    id: makeId(),
    customerId,
    categoryId: c.id,
    bucketId: c.defaultBucket,
    source: 'system' as const,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  _store.push(...seeded);
  return seeded;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getCustomerCategories(customerId: string): Promise<CustomerCategory[]> {
  await delay();
  let rows = _store.filter((c) => c.customerId === customerId && c.isActive);
  // Lazy default-seed so an already-onboarded (or demo) customer never has an empty set.
  // Real onboarding calls seedDefaultCategories() up front; this only fires as a fallback.
  if (rows.length === 0) {
    seedDefaultCategories(customerId);
    rows = _store.filter((c) => c.customerId === customerId && c.isActive);
  }
  return rows;
}

export interface MoveBucketPayload {
  customerCategoryId: string;
  targetBucket: BucketType;
}

export async function moveBucket(payload: MoveBucketPayload): Promise<CustomerCategory> {
  await delay();
  const entry = _store.find((c) => c.id === payload.customerCategoryId);
  if (!entry) throw new Error('not_found');
  entry.bucketId = payload.targetBucket;
  entry.updatedAt = new Date().toISOString();
  return { ...entry };
}

export async function deactivateCustomerCategory(id: string): Promise<void> {
  await delay();
  const entry = _store.find((c) => c.id === id);
  if (entry) {
    entry.isActive = false;
    entry.updatedAt = new Date().toISOString();
  }
}
