/**
 * normalizer.ts - Collapse every backend / transport error shape into AppError.
 *
 * SCAFFOLDING. Not wired into the mock services yet (auth still throws the
 * typed AuthError from src/types/auth.ts, which this normaliser already
 * understands). When the .NET 8 layer + axios land, route every caught error
 * through normalizeError() so screens only ever handle one shape.
 *
 * .NET 8 can surface four shapes; we also fold in the existing AuthError:
 *   1. ProblemDetails (RFC 7807):  { type, title, status, traceId, detail? }
 *   2. Validation error:           { errors: { Field: ['msg'] }, status, title }
 *   3. Business exception:         { code: 'INSUFFICIENT_BALANCE', message }
 *   4. Network error:              fetch/axios threw before an HTTP response
 */

import { AuthError, AUTH_ERROR_MESSAGES_VI } from '@/types/auth';

export interface AppError {
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  message: string;
  /** Business / domain code when the backend supplies one. */
  code?: string;
  /** Field-level validation messages, keyed by DTO property name. */
  fields?: Record<string, string>;
}

const FALLBACK_MESSAGE_VI = 'Đã có lỗi xảy ra. Hãy thử lại sau.';
const NETWORK_MESSAGE_VI = 'Mất kết nối mạng. Hãy kiểm tra kết nối và thử lại.';

// ─── narrowing helpers (no `any`) ─────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Shape 2: flatten { errors: { Field: ['m1','m2'] } } -> { Field: 'm1' }. */
function extractFieldErrors(
  errors: unknown
): Record<string, string> | undefined {
  if (!isRecord(errors)) return undefined;
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      const first = asString(messages[0]);
      if (first) out[field] = first;
    } else {
      const single = asString(messages);
      if (single) out[field] = single;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ─── main entry ───────────────────────────────────────────────────────────────

export function normalizeError(err: unknown): AppError {
  // Existing typed auth errors -- reuse the VI copy already defined for them.
  if (err instanceof AuthError) {
    return {
      status: err.code === 'network_error' ? 0 : 400,
      message: AUTH_ERROR_MESSAGES_VI[err.code],
      code: err.code,
    };
  }

  // Shape 4: a thrown Error that is not an HTTP response (network/timeout).
  if (err instanceof Error && !isRecord((err as { response?: unknown }).response)) {
    // Plain Error with no HTTP envelope -> treat as network/unknown.
    if (!isRecord(err) || !('status' in err)) {
      return { status: 0, message: NETWORK_MESSAGE_VI };
    }
  }

  if (!isRecord(err)) {
    return { status: 0, message: FALLBACK_MESSAGE_VI };
  }

  const status = asNumber(err.status) ?? 500;

  // Shape 2: validation error ({ errors: {...} }).
  const fields = extractFieldErrors(err.errors);
  if (fields) {
    return {
      status,
      message: asString(err.title) ?? FALLBACK_MESSAGE_VI,
      fields,
    };
  }

  // Shape 3: business exception ({ code, message }).
  const code = asString(err.code);
  const message = asString(err.message);
  if (code && message) {
    return { status: status === 500 ? 400 : status, message, code };
  }

  // Shape 1: ProblemDetails ({ title, status, detail? }).
  const problemMessage = asString(err.detail) ?? asString(err.title);
  if (problemMessage) {
    return { status, message: problemMessage, code };
  }

  return { status, message: message ?? FALLBACK_MESSAGE_VI, code };
}

/**
 * Throw an AppError-shaped object from a mock service. Lets mock failures and
 * real failures be caught identically, so no error-handling code changes on
 * API swap.
 */
export function throwMockError(
  code: string,
  message: string,
  status = 400
): never {
  const err: AppError = { status, message, code };
  throw err;
}
