/**
 * real/extraction.ts — real .NET transaction-extraction service.
 *
 * Mirrors src/services/mock/extraction.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/extract/* (ExtractController), ApiResponse<T> envelope.
 *   - POST /extract/sms  { text }  → ExtractResponse { rows[], totalScanned, skipped, errors }
 *
 * The screen consumes a SINGLE PhotoExtractionResult (one candidate transaction),
 * while the backend returns an array of parsed rows. We map the first recognised
 * row onto that shape. Amount/date/merchant are parsed deterministically server-
 * side, so they carry high confidence when present; the category is the only AI
 * guess, so its confidence comes from the row's model score.
 *
 * There is NO backend photo/OCR endpoint (the backend parses SMS text and CSV/XLSX
 * statements, not receipt images), so extractFromPhoto stays on the mock.
 */

import { api, unwrap } from '@/lib/api';
import type { PhotoExtractionResult } from '@/types/extraction';

// Photo/receipt OCR has no backend counterpart — keep the mock implementation.
export { extractFromPhoto } from '@/services/mock/extraction';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface ExtractedRowDto {
  amount: number;
  type: string;
  merchant: string | null;
  description: string | null;
  transactionDate: string; // ISO timestamp
  categoryId: string | null;
  categoryName: string | null;
  confidence: number | null;
}

interface ExtractResponseDto {
  rows: ExtractedRowDto[];
  totalScanned: number;
  skipped: number;
  errors: string[];
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

const EMPTY_RESULT: PhotoExtractionResult = {
  amount: null,
  merchant: null,
  transactionDate: new Date().toISOString().split('T')[0],
  categoryId: null,
  confidence: { amount: 0, merchant: 0, transactionDate: 0, categoryId: 0 },
};

function toExtractionResult(row: ExtractedRowDto): PhotoExtractionResult {
  return {
    amount: row.amount ?? null,
    merchant: row.merchant ?? null,
    transactionDate: (row.transactionDate ?? '').slice(0, 10),
    categoryId: row.categoryId ?? null,
    confidence: {
      // Amount/date are regex-parsed server-side — trust them when present.
      amount: row.amount != null ? 0.95 : 0,
      merchant: row.merchant ? 0.85 : 0,
      transactionDate: row.transactionDate ? 0.95 : 0,
      // The category is the model's suggestion; use its score (0 when unresolved).
      categoryId: row.categoryId ? (row.confidence ?? 0) : 0,
    },
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function extractFromSMS(text: string): Promise<PhotoExtractionResult> {
  const res = await api.post('/extract/sms', { text });
  const data = unwrap<ExtractResponseDto>(res);
  const first = data.rows?.[0];
  return first ? toExtractionResult(first) : EMPTY_RESULT;
}
