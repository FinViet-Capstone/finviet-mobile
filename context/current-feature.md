# Current Feature

<!-- Feature name and short description -->
Fix: structured `BusinessRuleException.Code` → Vietnamese error messaging, cross-cutting
across every domain (not just auth, which already has this via `AUTH_ERROR_MESSAGES_VI`).
Last item from the FE↔BE API reconciliation pass (see Notes).

## Status

<!-- Not Started | In Progress | Completed -->
Completed — this was the last item from the FE↔BE reconciliation plan; all of it is now done

## Goals

<!-- Goals and requirements -->
- The backend's `ExceptionHandlingMiddleware` puts a machine-readable `code` at the top level
  of every error envelope for `BusinessRuleException` (422), `ExternalServiceException` (502),
  and `IntegrationUnavailableException` (503) — confirmed directly against
  `finviet-be/src/FinViet.Api/Middlewares/ExceptionHandlingMiddleware.cs`, whose own comment
  says "FE maps to VI message." `src/utils/errors.ts`'s `getApiErrorMessage()` already declares
  a `code` field on its local `ApiErrorBody` type but never reads it — it falls straight to the
  raw (English) backend `message`.
- Extracted and verified the complete, current list of codes directly from
  `finviet-be` source (`grep`-ing every `new BusinessRuleException/ExternalServiceException/
  IntegrationUnavailableException(...)` call site, not just the markdown API reference, which
  turned out to be missing several — e.g. `wallet_has_transactions`, `transaction_type_invalid`,
  `sepay_wallet_orphaned`, and 5 dynamic `sepay_*` codes generated from SePay's own HTTP
  status on upstream failures, including a `sepay_error_{statusCode}` catch-all pattern).
  38 stable codes total, covering Transactions, Wallets, SePay linking, Saving Goals, and
  Extract.
- Add `BUSINESS_RULE_MESSAGES_VI` (same pattern as `AUTH_ERROR_MESSAGES_VI`) in
  `src/utils/errors.ts`, wire code-based lookup into `getApiErrorMessage()` **ahead of**
  `data.message` (a recognized code should always win over the raw English text — matches the
  backend's own stated intent).
- Consolidate `app/(tabs)/wallets/[id].tsx`'s local `WALLET_DELETE_ERROR_MESSAGES` map (the
  only pre-existing local code→message map found in the app) into the shared utility, reusing
  its exact existing Vietnamese copy for `wallet_has_transactions`/`last_wallet` so wording
  doesn't drift.
- Out of scope: this only changes what message text is shown for errors already being
  displayed (via `getApiErrorMessage()`, used at 7 existing call sites) — not adding new
  error-handling UI where none exists today.

## Notes

<!-- Any extra notes -->
Full FE↔BE reconciliation findings and branch grouping are in
`C:\Users\Lenovo\.claude\plans\here-s-what-backend-has-woolly-barto.md`. This is the last
remaining item from that plan.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Previous three branches (shipped-endpoint wiring; transaction-edit + goal-ledger
  wiring; SePay OAuth fix) merged to `dev`. Started this feature — verified the complete error
  code list against `finviet-be` source directly rather than trusting the markdown reference
  alone, since it was already found to be incomplete for this exact list.
- 2026-08-10 — Implemented: `BUSINESS_RULE_MESSAGES_VI` (38 codes) added to
  `src/utils/errors.ts`; `getApiErrorMessage()` now checks `code` first, ahead of the raw
  `message`; consolidated `app/(tabs)/wallets/[id].tsx`'s local `WALLET_DELETE_ERROR_MESSAGES`
  duplicate into the shared map and upgraded its sync/unlink error handlers to the same
  utility. Added `src/utils/__tests__/errors.test.ts` (8 tests: code-priority-over-message,
  the dynamic `sepay_error_{status}` catch-all, FluentValidation field-error fallback,
  non-axios-error safety, and a completeness check that every mapped code has a non-empty
  message). type-check/lint/72 tests all pass (64 prior + 8 new). This closes out every item
  from the FE↔BE reconciliation plan.
