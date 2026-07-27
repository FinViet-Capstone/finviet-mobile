/**
 * mock/customCategories.ts — customer-created categories with a user-picked
 * icon (see lib/categoryIconStorage.ts for where the icon file itself lives —
 * never here, never synced).
 */

import type { CustomCategory } from '@/types/customCategory';
import type { BucketType } from '@/constants/categories';
import { USER_ID } from './walletStore';

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

let _store: CustomCategory[] = [];
let _nextId = 1;

function makeId(): string {
  return `custom_${_nextId++}_${Date.now()}`;
}

export async function getCustomCategories(): Promise<CustomCategory[]> {
  await delay();
  return _store.filter((c) => c.customerId === USER_ID && c.isActive);
}

export interface CreateCustomCategoryInput {
  nameVi: string;
  type: 'expense' | 'income';
  bucketId: BucketType | null;
  color: string;
}

export async function createCustomCategory(
  input: CreateCustomCategoryInput,
): Promise<CustomCategory> {
  await delay();
  const now = new Date().toISOString();
  const created: CustomCategory = {
    id: makeId(),
    customerId: USER_ID,
    nameVi: input.nameVi,
    type: input.type,
    bucketId: input.bucketId,
    color: input.color,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  _store = [..._store, created];
  return created;
}

export async function deleteCustomCategory(id: string): Promise<void> {
  await delay();
  _store = _store.map((c) =>
    c.id === id ? { ...c, isActive: false, updatedAt: new Date().toISOString() } : c,
  );
}

/** Reassign a customer-created category to a different bucket (drag-and-drop). */
export async function updateCustomCategoryBucket(
  id: string,
  bucketId: BucketType,
): Promise<CustomCategory> {
  await delay();
  const entry = _store.find((c) => c.id === id);
  if (!entry) throw new Error('not_found');
  entry.bucketId = bucketId;
  entry.updatedAt = new Date().toISOString();
  return { ...entry };
}
