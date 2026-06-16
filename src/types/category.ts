/**
 * category.ts - FinViet type definitions for the Category v2 domain
 *
 * customer_categories: per-customer expense category set, seeded from persona.
 * Income categories are global — never stored in customer_categories.
 * Savings bucket is locked — moveBucket must reject savings targets.
 */

import type { BucketType } from '@/constants/categories';

// -------------------------------------------------------------------------
// CustomerCategory
// Mirrors the customer_categories DB table (v2 schema).
// -------------------------------------------------------------------------

export type CategorySource = 'system_seed' | 'customer_request';

export interface CustomerCategory {
  id: string;
  customerId: string;
  /** References a global Category.id */
  categoryId: string;
  /** Which bucket this customer has placed the category in */
  bucketId: BucketType;
  /** How this entry was created */
  source: CategorySource;
  /** false = hidden from budgets and pickers but not deleted */
  isActive: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// -------------------------------------------------------------------------
// CategoryRequest
// Pending admin-approval requests for new global categories.
// -------------------------------------------------------------------------

export type CategoryRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CategoryRequest {
  id: string;
  customerId: string;
  /** Proposed display name (Vietnamese) */
  nameVi: string;
  /** 'expense' or 'income' */
  type: 'expense' | 'income';
  /** Customer's suggested bucket; null for income */
  suggestedBucket: BucketType | null;
  /** Optional free-text reason */
  notes: string | null;
  status: CategoryRequestStatus;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// -------------------------------------------------------------------------
// Persona + PersonaCategory
// Used to seed customer_categories on onboarding.
// -------------------------------------------------------------------------

export type PersonaId =
  | 'student_male'
  | 'student_female'
  | 'young_professional_male'
  | 'young_professional_female'
  | 'default';

export interface PersonaCategory {
  categoryId: string;
  bucketId: BucketType;
}

export interface Persona {
  id: PersonaId;
  label: string;
  /** Ordered list of categories seeded for this persona */
  categories: PersonaCategory[];
}
