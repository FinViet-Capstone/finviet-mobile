/**
 * api.ts - Transport envelope for the (planned) .NET 8 Web API.
 *
 * SCAFFOLDING ONLY. The current mock layer in src/services/mock/ returns raw
 * data (and async auth mocks throw AuthError) -- it does NOT yet wrap responses
 * in ApiResponse<T>. These types describe the shape the real API will return so
 * that, on integration day, only the queryFn/mutationFn bodies change.
 *
 * See src/lib/errors/normalizer.ts for the error counterpart (AppError).
 */

/** Field-level validation errors, keyed by the .NET DTO property name. */
export type ApiFieldErrors = Record<string, string>;

export interface ApiError {
  /** .NET custom business-exception code, e.g. 'INSUFFICIENT_BALANCE'. */
  code?: string;
  message: string;
  /** FluentValidation field errors, when the failure is a validation error. */
  fields?: ApiFieldErrors;
}

export interface PaginationMeta {
  /** Opaque cursor for keyset pagination; absent on the last page. */
  cursor?: string;
  hasMore: boolean;
  total?: number;
}

/**
 * Standard success/error envelope. Exactly one of `data` / `error` is
 * meaningful: on success `error` is null; on failure `data` is null.
 */
export interface ApiResponse<T> {
  data: T;
  error: ApiError | null;
  meta?: PaginationMeta;
}
