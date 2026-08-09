# Current Feature

<!-- Feature name and short description -->
Fix: wire the FE `real/*.ts` service layer to backend endpoints that shipped as part of the
BE todos handoff (`finviet-be/docs/10-08-2026-be-todos.md`) — transaction full-edit and the
savings-goal ledger rework (contribution history, withdraw-to-wallet, per-action wallet
choice, contribution notes). Second of the FE↔BE reconciliation follow-up branches (see
Notes) — the SePay OAuth fix and structured error-code messaging remain their own cycles.

## Status

<!-- Not Started | In Progress | Completed -->
Completed (this branch's scope — not yet verified on-device)

## Goals

<!-- Goals and requirements -->
- Transaction full-edit: `real/transactions.ts`'s `updateTransaction()` currently only ever
  sends `{ categoryId }`, silently dropping amount/merchant/date. Backend's
  `UpdateTransactionDto` now accepts `{ categoryId?, amount?, merchant?, transactionDate? }`,
  enforcing category-only edits server-side for `sepay_linked`-wallet transactions
  (`synced_transaction_fields_locked`). `app/(tabs)/transactions/[id].tsx` already implements
  exactly this split (`categoryOnly = modeParam === 'category' || selectedWallet?.type ===
  'linked'`) and sends the right patch shape — this is a pure service-layer fix, no UI change
  needed. `walletId`/`description` stay unsupported (backend has no fields for them) — a
  pre-existing, already-documented gap, not part of this fix.
- Goal contribution history: `real/goals.ts`'s `getContributionsByGoalId()` is stubbed to
  `[]`. Backend now has `GET /saving-goals/{id}/contributions` returning the combined
  contribution+withdrawal ledger, matching the mock's `GoalContribution` shape.
- Goal withdraw-to-wallet: `real/goals.ts`'s `withdrawFromGoal()` throws. Backend now has
  `POST /saving-goals/{id}/withdraw` with `{ amount, walletId, note? }` — `walletId` required
  per call (no static goal-level withdrawal wallet, matching the confirmed "no 1-goal-1-wallet
  binding" design). The `WithdrawSheet` UI in `[id].tsx` already sends this exact shape.
- Goal per-action wallet choice + notes on contribute: `real/goals.ts`'s
  `addGoalContribution()` already sends `fundingWalletId` but drops `note`. Backend's
  `ContributeSavingGoalRequest` now accepts `{ amount, fundingWalletId?, note? }` (note capped
  at 255 chars server-side). `ContributionSheet` UI already collects and sends a note.
- Income allocation cleanup (opportunistic, not originally scoped): backend also shipped the
  `GET /profile/income-allocation?month=` param I flagged as a gap while wiring the previous
  branch. `real/incomeAllocation.ts`'s `getEffectiveIncomeAllocation(month)` can now resolve
  any month precisely instead of only ever falling back to "current" — simplify it to pass
  `month` through and drop the `'current-fallback'` placeholder id. Not reverting
  `budgets/index.tsx`'s `useBudgetBuckets`-sourced approach from the previous branch — it's
  still correct and there's no need to churn it back.
- Out of scope (this branch): SePay OAuth link-flow fix, structured
  `BusinessRuleException` error-code → Vietnamese messaging utility (each is its own
  branch/cycle per the original plan).

## Notes

<!-- Any extra notes -->
Full FE↔BE reconciliation findings and the branch grouping this came out of are in
`C:\Users\Lenovo\.claude\plans\here-s-what-backend-has-woolly-barto.md`. The backend TODOs
this branch consumes (with validation/business rules as originally requested) are in
`finviet-be/docs/10-08-2026-be-todos.md` §1, §2, §3 — all now shipped per the updated
`finviet-be/docs/api-reference.md`.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Previous branch (category buckets, custom categories, change-password, income
  allocation, profile settings, wallet-picker guardrails) merged to `dev`. FE↔BE reconciliation
  plan's remaining backend-blocked items written up as BE todos with validation/business rules
  in `finviet-be/docs/10-08-2026-be-todos.md`, handed off for a separate backend-side session.
- 2026-08-10 — Backend session shipped all of it (confirmed via updated
  `finviet-be/docs/api-reference.md`): transaction full-edit with the wallet-type guard, the
  full savings-goal ledger rework, and a bonus income-allocation month param. Started this
  feature to wire the FE `real/*.ts` layer to the newly-shipped endpoints — confirmed the UI
  for both major features (transaction edit screen, goal contribution/withdraw sheets) was
  already built end-to-end against the exact target shapes during earlier mock-only work, so
  this is a contained service-layer fix.
- 2026-08-10 — Implemented all 5 items: `real/transactions.ts`'s `updateTransaction()` now
  forwards `amount`/`merchant`/`transactionDate` alongside `categoryId` as a partial update
  (no UI change needed — the edit screen already sent the right shape); `real/goals.ts` gained
  a real `getContributionsByGoalId()` (was stubbed to `[]`), a real `withdrawFromGoal()` (was a
  throw), and `addGoalContribution()` now forwards `note`; `real/incomeAllocation.ts` was
  simplified to pass the new `?month=` param through instead of only ever resolving "current".
  Updated `finviet-be/docs/10-08-2026-be-todos.md` and the FE plan file to record all of it as
  shipped. type-check/lint/64 tests all pass. Not yet verified on-device.
