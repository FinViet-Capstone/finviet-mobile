# Current Feature

<!-- Feature name and short description -->
Fix: wire the FE `real/*.ts` service layer to backend endpoints that have shipped since they
were last touched (categories, custom categories, change-password, income allocation) plus a
few low-risk client-side guardrails and a doc correction. First of three grouped branches from
the FE↔BE API reconciliation pass (see Notes) — the other two (SePay OAuth fix,
structured error-code messaging) get their own `current-feature.md` cycles.

## Status

<!-- Not Started | In Progress | Completed -->
Completed (this branch's scope — not yet verified on-device)

## Goals

<!-- Goals and requirements -->
- Category bucket moves: replace `real/categories.ts`'s session-local `Map` override
  (`moveBucket`/`bulkMoveBucket`, lost on app restart) with real `PUT`/`DELETE /categories/{id}/bucket`
  calls. Keep FE's existing pre-flight validation (bucket enum, etc.).
- Custom categories: replace `real/customCategories.ts`'s wholesale mock re-export with real
  `POST /categories/custom` / `DELETE /categories/custom/{id}` calls. Icon stays device-local
  as today (backend has no icon field).
- Change password: replace `real/auth.ts`'s `changePassword` mock re-export with a real
  `POST /auth/change-password` call. `ChangePasswordSheet` UI/validation is already shaped
  correctly and needs no changes.
- Profile settings: wire `useUpdatePreferences` (or a new hook) to `PATCH /profile/settings`
  for theme + budget-alert notification thresholds — currently not wired to any backend call
  in real mode at all.
- Income allocation: replace `real/incomeAllocation.ts`'s wholesale mock re-export with real
  `GET`/`POST /profile/income-allocation` calls, mapping the backend's `{current, pending}`
  shape onto FE's existing `useEffectiveIncomeAllocation`/`useScheduledIncomeAllocation` hooks.
- Wallet-picker guardrails: confirm manual-entry and photo-entry wallet pickers exclude
  `sepay_linked` wallets (CSV-import already does this); add source/target wallet-type
  filtering to the wallet-withdraw screen (`POST /wallets/withdraw` requires a `sepay_linked`
  source and rejects a `sepay_linked` target).
- `cat_income` check: confirm no category picker offers a bare `cat_income` leaf (backend
  silently remaps it to `cat_income_other` on transaction create).
- Doc fix: `context/project-spec.md` §B still claims the Savings bucket is locked in both
  directions — stale against both the FE mock and the backend (confirmed unrestricted
  server-side too). One-line correction, folded into this branch since it's adjacent to the
  category-buckets work.
- Out of scope (this branch): SePay OAuth link-flow fix, structured `BusinessRuleException`
  error-code → Vietnamese messaging utility (each is its own branch/cycle), and everything
  blocked on new backend work (transaction full-edit, goal ledger rework) — tracked in
  `finviet-be/docs/10-08-2026-be-todos.md` for a separate backend-side session.

## Notes

<!-- Any extra notes -->
Full FE↔BE reconciliation findings and the 3-branch grouping this came out of are in
`C:\Users\Lenovo\.claude\plans\here-s-what-backend-has-woolly-barto.md`. Backend-only TODOs
(with validation/business rules) are in `finviet-be/docs/10-08-2026-be-todos.md`.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Savings Goal contribution-history + withdraw feature: implemented, 64/64 tests
  passing, not yet verified on-device. Superseded by the new feature below without an on-device
  check having happened — worth verifying manually whenever the app is next run.
- 2026-08-10 — Started this feature: FE↔BE API reconciliation done (compared
  `finviet-be/docs/api-reference.md` against `src/services/real/*.ts`), found the backend has
  shipped 4 endpoints the FE still treats as unavailable, plus a real bug in the SePay OAuth
  screen and several backend gaps. Plan approved, branching grouped by risk (this branch =
  low-risk wiring items).
- 2026-08-10 — Implemented all 8 items: category bucket moves + custom categories rewired to
  real `PUT`/`DELETE .../bucket` and `POST`/`DELETE /categories/custom`; change-password wired
  to real `POST /auth/change-password`; income allocation rewired to real
  `GET`/`POST /profile/income-allocation` (discovered and worked around a real-mode precision
  gap — no arbitrary-month lookup — by switching `budgets/index.tsx` to source its per-month
  income/split from `useBudgetBuckets` instead, which the backend already resolves correctly
  per month; gap logged in `finviet-be/docs/10-08-2026-be-todos.md` §3); profile settings
  (theme + `notifBudgetThresholds`) wired to real `PATCH /profile/settings` — required adding
  `notifBudgetThresholds` to the `Customer` type and threading it through
  `AuthResponsePayload`/`toCustomer()`/`useUpdatePreferences`; fixed a real bug in
  `photo-confirm.tsx` (was saving to `wallets[0]` with no basic-wallet filter, unlike every
  other entry method); confirmed `cat_income` is never a selectable leaf and the wallet-level
  withdraw hook has no consuming screen (nothing to guard yet); corrected the stale
  savings-bucket-locked claim in `project-spec.md`. type-check/lint/64 tests all pass. Not yet
  verified on-device.
