/**
 * mock/customerCategories.ts
 *
 * Per-customer expense category set (v2).
 * Income categories are global — never stored here.
 * Savings bucket is locked — moveBucket rejects savings targets.
 */

import type { CustomerCategory, PersonaId, Persona, PersonaCategory } from '@/types/category';
import type { BucketType } from '@/constants/categories';
import { EXPENSE_CATEGORIES } from '@/constants/categories';

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Persona definitions ──────────────────────────────────────────────────────

const PERSONA_MAP: Record<PersonaId, Persona> = {
  student_male: {
    id: 'student_male',
    label: 'Sinh viên (nam)',
    categories: [
      { categoryId: 'cat_food',      bucketId: 'needs' },
      { categoryId: 'cat_transport', bucketId: 'needs' },
      { categoryId: 'cat_education', bucketId: 'needs' },
      { categoryId: 'cat_housing',   bucketId: 'needs' },
      { categoryId: 'cat_entertain', bucketId: 'wants' },
      { categoryId: 'cat_dining',    bucketId: 'wants' },
      { categoryId: 'cat_savings',   bucketId: 'savings' },
    ],
  },
  student_female: {
    id: 'student_female',
    label: 'Sinh viên (nữ)',
    categories: [
      { categoryId: 'cat_food',      bucketId: 'needs' },
      { categoryId: 'cat_transport', bucketId: 'needs' },
      { categoryId: 'cat_education', bucketId: 'needs' },
      { categoryId: 'cat_housing',   bucketId: 'needs' },
      { categoryId: 'cat_beauty',    bucketId: 'wants' },
      { categoryId: 'cat_dining',    bucketId: 'wants' },
      { categoryId: 'cat_savings',   bucketId: 'savings' },
    ],
  },
  young_professional_male: {
    id: 'young_professional_male',
    label: 'Đi làm trẻ (nam)',
    categories: [
      { categoryId: 'cat_food',      bucketId: 'needs' },
      { categoryId: 'cat_housing',   bucketId: 'needs' },
      { categoryId: 'cat_transport', bucketId: 'needs' },
      { categoryId: 'cat_health',    bucketId: 'needs' },
      { categoryId: 'cat_entertain', bucketId: 'wants' },
      { categoryId: 'cat_shopping',  bucketId: 'wants' },
      { categoryId: 'cat_dining',    bucketId: 'wants' },
      { categoryId: 'cat_savings',   bucketId: 'savings' },
      { categoryId: 'cat_invest',    bucketId: 'savings' },
    ],
  },
  young_professional_female: {
    id: 'young_professional_female',
    label: 'Đi làm trẻ (nữ)',
    categories: [
      { categoryId: 'cat_food',      bucketId: 'needs' },
      { categoryId: 'cat_housing',   bucketId: 'needs' },
      { categoryId: 'cat_transport', bucketId: 'needs' },
      { categoryId: 'cat_health',    bucketId: 'needs' },
      { categoryId: 'cat_beauty',    bucketId: 'wants' },
      { categoryId: 'cat_shopping',  bucketId: 'wants' },
      { categoryId: 'cat_dining',    bucketId: 'wants' },
      { categoryId: 'cat_savings',   bucketId: 'savings' },
      { categoryId: 'cat_invest',    bucketId: 'savings' },
    ],
  },
  default: {
    id: 'default',
    label: 'Mặc định',
    categories: EXPENSE_CATEGORIES.map((c) => ({
      categoryId: c.id,
      bucketId: c.defaultBucket,
    })) as PersonaCategory[],
  },
};

/** Derive persona from gender + date of birth */
export function derivePersonaId(
  gender: 'male' | 'female' | 'other' | null,
  dateOfBirth: string | null,
): PersonaId {
  if (!gender || !dateOfBirth) return 'default';
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  const isStudent = age < 25;
  if (gender === 'male')   return isStudent ? 'student_male'   : 'young_professional_male';
  if (gender === 'female') return isStudent ? 'student_female' : 'young_professional_female';
  return 'default';
}

// ─── In-memory store ─────────────────────────────────────────────────────────

let _store: CustomerCategory[] = [];
let _nextId = 1;

function makeId() { return `cc_${_nextId++}`; }

/** Seed customer_categories from persona (called during onboarding) */
export function seedFromPersona(
  customerId: string,
  gender: 'male' | 'female' | 'other' | null,
  dateOfBirth: string | null,
): CustomerCategory[] {
  const personaId = derivePersonaId(gender, dateOfBirth);
  const persona = PERSONA_MAP[personaId];
  const now = new Date().toISOString();

  // Remove existing entries for this customer before re-seeding
  _store = _store.filter((c) => c.customerId !== customerId);

  const seeded: CustomerCategory[] = persona.categories.map((pc) => ({
    id: makeId(),
    customerId,
    categoryId: pc.categoryId,
    bucketId: pc.bucketId,
    source: 'system_seed' as const,
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
  return _store.filter((c) => c.customerId === customerId && c.isActive);
}

export interface MoveBucketPayload {
  customerCategoryId: string;
  targetBucket: BucketType;
}

export async function moveBucket(payload: MoveBucketPayload): Promise<CustomerCategory> {
  await delay();
  if (payload.targetBucket === 'savings') {
    throw new Error('savings_locked');
  }
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
