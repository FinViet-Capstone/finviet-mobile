/**
 * idempotency.ts — client-generated idempotency keys for money-mutating POSTs.
 *
 * The backend dedups create/transfer/withdraw/contribute by the `Idempotency-Key`
 * header (see BUSINESS_LOGIC §10 / APIs-List). Sending one protects the most
 * common double-execution path: the Axios 401→refresh→retry replays the SAME
 * request config (header included), so the server treats it as one operation.
 *
 * NOTE: a fresh key is generated per call. For true protection against a user
 * tapping "Save" twice, generate the key once at the UI/mutation layer and pass
 * it down — this helper is the service-level default.
 */

/** RFC4122-v4-shaped token (Math.random based — sufficient as an idempotency token). */
export function newIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Axios config fragment carrying a fresh idempotency key. */
export function idempotentConfig() {
  return { headers: { 'Idempotency-Key': newIdempotencyKey() } };
}
