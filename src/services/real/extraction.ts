/**
 * real/extraction.ts — real .NET transaction-extraction service.
 *
 * Backend: api/extract/* (ExtractController), ApiResponse<T> envelope.
 *   - POST /extract/sms   { text }                      → ExtractResponse { rows[], totalScanned, skipped, errors }
 *   - POST /extract/csv   multipart: file, maxRows?      → ExtractResponse (same shape)
 *   - POST /extract/photo multipart: file                → ExtractResponse (same shape, ≤1 row)
 *
 * The SMS/photo screens each consume a SINGLE PhotoExtractionResult (one
 * candidate transaction), while the backend returns an array of parsed rows —
 * we map the first recognised row onto that shape. SMS fields are parsed
 * deterministically; receipt fields are AI-read and may
 * carry field-level confidence from the backend. The category keeps its own
 * rule/model confidence. CSV extraction surfaces the full row array instead
 * (the review-list UX needs every row, not just the first).
 */

import { api, unwrap } from '@/lib/api';
import type { CsvExtractionResult, PhotoExtractionResult } from '@/types/extraction';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface ExtractedRowDto {
  amount: number;
  type: string;
  merchant: string | null;
  description: string | null;
  transactionDate: string; // ISO timestamp
  amountConfidence?: number | null;
  merchantConfidence?: number | null;
  transactionDateConfidence?: number | null;
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

function confidenceOrFallback(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function toExtractionResult(row: ExtractedRowDto): PhotoExtractionResult {
  return {
    amount: row.amount ?? null,
    type: (row.type ?? '').toUpperCase() === 'INCOME' ? 'income' : 'expense',
    merchant: row.merchant ?? row.description ?? null,
    transactionDate: (row.transactionDate ?? '').slice(0, 10),
    categoryId: row.categoryId ?? null,
    confidence: {
      // New OCR responses supply real field confidence. Fallbacks keep SMS and
      // pre-deploy backend responses backward compatible.
      amount: confidenceOrFallback(row.amountConfidence, row.amount != null ? 0.95 : 0),
      merchant: confidenceOrFallback(row.merchantConfidence, row.merchant ? 0.85 : 0),
      transactionDate: confidenceOrFallback(
        row.transactionDateConfidence,
        row.transactionDate ? 0.95 : 0,
      ),
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

/**
 * POST /extract/photo — multipart upload of a receipt photo. Gemini/Render can
 * take longer than the shared 20s Axios default, especially after a cold start.
 */
export async function extractFromPhoto(uri: string): Promise<PhotoExtractionResult> {
  const name = uri.split('/').pop() || 'receipt.jpg';
  const ext = name.split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
  const form = new FormData();
  // React Native FormData file part shape ({ uri, name, type }).
  form.append('file', { uri, name, type: mime } as unknown as Blob);

  const res = await api.post('/extract/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  const data = unwrap<ExtractResponseDto>(res);
  const first = data.rows?.[0];
  return first ? toExtractionResult(first) : EMPTY_RESULT;
}

// ─── CSV / XLSX extraction ────────────────────────────────────────────────────

function toCsvRow(row: ExtractedRowDto): CsvExtractionResult['rows'][number] {
  return {
    amount: row.amount ?? 0,
    type: (row.type ?? '').toUpperCase() === 'INCOME' ? 'income' : 'expense',
    merchant: row.merchant ?? row.description ?? null,
    description: row.description ?? null,
    transactionDate: (row.transactionDate ?? '').slice(0, 10),
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
    confidence: row.categoryId ? (row.confidence ?? 0) : null,
  };
}

/**
 * POST /extract/csv — multipart upload of a bank-statement export (.csv,
 * .xlsx, .xls). Parse-only, nothing persisted server-side; the caller still
 * confirms/imports each row via the normal createTransaction flow.
 *
 * A large statement can need many per-row AI classification calls server-side
 * (batched/parallelized backend-side, but still one HTTP round trip overall),
 * so this uses the same longer timeout as the other slow AI calls in
 * real/reports.ts rather than the shared api instance's 20s default.
 */
export async function extractFromCsv(
  fileUri: string,
  fileName: string,
  maxRows?: number,
): Promise<CsvExtractionResult> {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mime =
    ext === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : ext === 'xls'
        ? 'application/vnd.ms-excel'
        : 'text/csv';
  const form = new FormData();
  // React Native FormData file part shape ({ uri, name, type }).
  form.append('file', { uri: fileUri, name: fileName, type: mime } as unknown as Blob);
  if (maxRows != null) form.append('maxRows', String(maxRows));

  const res = await api.post('/extract/csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  const data = unwrap<ExtractResponseDto>(res);
  return {
    rows: (data.rows ?? []).map(toCsvRow),
    totalScanned: data.totalScanned,
    skipped: data.skipped,
    errors: data.errors ?? [],
  };
}
