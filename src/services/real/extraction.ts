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

import { fetch as expoFetch } from 'expo/fetch';
import { api, refreshAccessToken, unwrap } from '@/lib/api';
import { API_BASE_URL } from '@/lib/env';
import { getAccessToken } from '@/lib/mmkv';
import type {
  CsvExtractionResult,
  PhotoExtractionResult,
  PhotoUploadInput,
} from '@/types/extraction';

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

interface ExtractEnvelopeDto {
  success: boolean;
  message?: string | null;
  code?: string | null;
  data?: ExtractResponseDto | null;
}

export class PhotoUploadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly apiCode?: string | null,
  ) {
    super(message);
    this.name = 'PhotoUploadError';
  }
}

function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const normalized = value.replace(/\s/g, '').replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((normalized.length * 6) / 8));
  let buffer = 0;
  let bits = 0;
  let offset = 0;

  for (const char of normalized) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid base64 image data');
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset] = (buffer >> bits) & 0xff;
      offset += 1;
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function createPhotoMultipartBody(
  imageBase64: string,
  fileName: string,
  mime: string,
): { boundary: string; body: Uint8Array } {
  const boundary = `----FinVietOcr${Date.now().toString(36)}`;
  const safeName = fileName.replace(/["\\/\r\n]/g, '_');
  const encoder = new TextEncoder();
  const header = encoder.encode(
    `--${boundary}\r\n`
      + `Content-Disposition: form-data; name="File"; filename="${safeName}"\r\n`
      + `Content-Type: ${mime}\r\n\r\n`,
  );
  const payload = imageBase64.includes(',')
    ? imageBase64.slice(imageBase64.indexOf(',') + 1)
    : imageBase64;
  const footer = encoder.encode(`\r\n--${boundary}--\r\n`);
  return { boundary, body: joinBytes(header, base64ToBytes(payload), footer) };
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
export async function extractFromPhoto(
  input: string | PhotoUploadInput,
): Promise<PhotoExtractionResult> {
  const source = typeof input === 'string' ? { uri: input } : input;
  const cleanPath = source.uri.split(/[?#]/, 1)[0];
  const uriName = cleanPath.split('/').pop();
  const name = source.fileName?.trim() || uriName || 'receipt.jpg';
  const ext = name.split('.').pop()?.toLowerCase();
  const inferredMime =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic' || ext === 'heif'
          ? 'image/heic'
          : 'image/jpeg';
  const mime = source.mimeType?.startsWith('image/')
    ? source.mimeType
    : inferredMime;
  if (!source.base64) {
    throw new PhotoUploadError(
      'Ảnh không còn dữ liệu để gửi OCR. Vui lòng chọn hoặc chụp lại ảnh.',
    );
  }
  let multipart: ReturnType<typeof createPhotoMultipartBody>;
  try {
    multipart = createPhotoMultipartBody(source.base64, name, mime);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new PhotoUploadError(`Không thể chuẩn bị ảnh OCR (${detail}).`);
  }
  const upload = (token?: string) => {
    return expoFetch(`${API_BASE_URL}/extract/photo`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${multipart.boundary}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: multipart.body,
    });
  };

  // Raw bytes bypass Expo's incompatible FormData and File.bytes() adapters.
  let result: Awaited<ReturnType<typeof upload>>;
  try {
    result = await upload(getAccessToken());
    if (result.status === 401) {
      const refreshedToken = await refreshAccessToken();
      result = await upload(refreshedToken);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new PhotoUploadError(
      `Không thể kết nối tới dịch vụ OCR (${detail}).`,
    );
  }

  let envelope: ExtractEnvelopeDto | undefined;
  try {
    envelope = JSON.parse(await result.text()) as ExtractEnvelopeDto;
  } catch {
    // A proxy/server HTML error still gets a useful HTTP-specific message below.
  }

  if (result.status < 200 || result.status >= 300 || !envelope?.success) {
    const message =
      result.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : result.status === 413
          ? 'Ảnh hóa đơn quá lớn. Vui lòng chụp lại ở chất lượng thấp hơn.'
          : `Không thể gửi ảnh để phân tích (HTTP ${result.status}). Vui lòng thử lại.`;
    throw new PhotoUploadError(message, result.status, envelope?.code);
  }

  const data = envelope.data;
  const first = data?.rows?.[0];
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
