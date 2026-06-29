/**
 * real/categoryRequests.ts — real .NET category-request service.
 *
 * Mirrors src/services/mock/categoryRequests.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/category-requests/* (CategoryRequestsController), ApiResponse<T>.
 *   - POST /category-requests        → CategoryRequestResponse
 *   - GET  /category-requests/mine   → CategoryRequestResponse[]
 *
 * Field mapping (FE ⇄ BE):
 *   nameVi          ⇄ categoryName
 *   suggestedBucket ⇄ expenseClass (needs | wants | savings; null for income)
 *   notes           ⇄ note
 */

import { api, unwrap } from '@/lib/api';
import type { CategoryRequest, CategoryRequestStatus } from '@/types/category';
import type { BucketType } from '@/constants/categories';
import type { CreateCategoryRequestPayload } from '@/services/mock/categoryRequests';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface CategoryRequestDto {
  requestId: string;
  customerId: string;
  categoryName: string;
  type: string;
  expenseClass: string | null;
  note: string | null;
  status: string;
  reviewNote: string | null;
  createdCategoryId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toBucket(v: string | null): BucketType | null {
  return v === 'needs' || v === 'wants' || v === 'savings' ? v : null;
}

function toStatus(v: string): CategoryRequestStatus {
  const s = (v ?? '').toLowerCase();
  return s === 'approved' || s === 'rejected' ? s : 'pending';
}

function toCategoryRequest(dto: CategoryRequestDto): CategoryRequest {
  return {
    id: dto.requestId,
    customerId: dto.customerId,
    nameVi: dto.categoryName,
    type: dto.type === 'income' ? 'income' : 'expense',
    suggestedBucket: toBucket(dto.expenseClass),
    notes: dto.note ?? null,
    status: toStatus(dto.status),
    createdAt: dto.createdAt,
    updatedAt: dto.reviewedAt ?? dto.createdAt,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createCategoryRequest(
  payload: CreateCategoryRequestPayload,
): Promise<CategoryRequest> {
  const res = await api.post('/category-requests', {
    categoryName: payload.nameVi,
    type: payload.type,
    expenseClass: payload.suggestedBucket ?? null,
    note: payload.notes ?? null,
  });
  return toCategoryRequest(unwrap<CategoryRequestDto>(res));
}

export async function getCategoryRequests(
  _customerId: string,
): Promise<CategoryRequest[]> {
  const res = await api.get('/category-requests/mine');
  return unwrap<CategoryRequestDto[]>(res).map(toCategoryRequest);
}
