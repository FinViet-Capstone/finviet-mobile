/**
 * mock/categoryRequests.ts
 *
 * Pending admin-approval requests for new global categories.
 * Status flow: pending → approved | rejected (admin side, not modelled in FE yet).
 */

import type { CategoryRequest } from '@/types/category';

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

// ─── In-memory store ─────────────────────────────────────────────────────────

let _store: CategoryRequest[] = [];
let _nextId = 1;

function makeId() { return `cr_${_nextId++}`; }

// ─── Service functions ────────────────────────────────────────────────────────

export interface CreateCategoryRequestPayload {
  customerId: string;
  nameVi: string;
  type: 'expense' | 'income';
  suggestedBucket: 'needs' | 'wants' | 'savings' | null;
  notes?: string;
}

export async function createCategoryRequest(
  payload: CreateCategoryRequestPayload,
): Promise<CategoryRequest> {
  await delay();
  const now = new Date().toISOString();
  const req: CategoryRequest = {
    id: makeId(),
    customerId: payload.customerId,
    nameVi: payload.nameVi,
    type: payload.type,
    suggestedBucket: payload.suggestedBucket,
    notes: payload.notes ?? null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  _store.push(req);
  return req;
}

export async function getCategoryRequests(customerId: string): Promise<CategoryRequest[]> {
  await delay();
  return _store.filter((r) => r.customerId === customerId);
}
