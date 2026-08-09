# Current Feature

<!-- Feature name and short description -->
Fix + feature: Savings Goal detail screen — wire up the contribution history (was hardcoded empty) and add a withdraw-to-wallet capability (didn't exist at all).

## Status

<!-- Not Started | In Progress | Completed -->
In Progress

## Goals

<!-- Goals and requirements -->
- Bug: the "Lịch sử đóng góp" section on `app/(tabs)/budgets/goals/[id].tsx` always rendered a hardcoded "Chưa có lần nào đóng góp" placeholder, even for goals with real progress. Root cause: `getContributionsByGoalId` was fully implemented in `src/services/mock/goals.ts` but never exported from the `src/services` barrel and never called by any hook/screen — the history section never fetched anything. Fix: export it, add a `useGoalContributions` hook, and render the real list (note-or-default label, date, signed amount) in place of the placeholder.
- Feature: there was no way to withdraw savings back to a wallet at any layer (type, mock service, real service, hook, UI) — only `deleteGoal`, which reverses *all* contributions and deletes the whole goal. Added a new `withdrawFromGoal` mock-service function + `useWithdrawFromGoal` hook + a `WithdrawSheet` UI (mirrors the existing `ContributionSheet`), restricted to basic wallets (same restriction contributions already use — crediting a linked/bank-synced wallet manually would desync it from the real account).
- `GoalContribution` gained a required `type: 'contribution' | 'withdrawal'` field. `currentAmount` is now `Σ(contributions) − Σ(withdrawals)`. Withdrawals are stored in the same `CONTRIBUTIONS` array as contributions (not a separate store), so `deleteGoal`'s existing reversal loop reverses withdrawals for free with no logic change there.
- A withdrawal books `type: 'income'` + `categoryId: 'cat_savings_goal'` on the chosen wallet (symmetric with a contribution's `type: 'expense'` on the same category). Verified this is safe: `useBucketSpend` only counts `type === 'expense'`, so a withdrawal correctly does NOT reduce the Savings bucket's pacing "spent" figure; `transactionCardVisuals.ts` already signs the amount by `tx.type`, so a withdrawal shows as `+amount` with no changes needed there.
- Explicitly decided with the user: both pieces are **mock-only for now** — the real .NET backend has no endpoints for contribution history or withdrawal yet. `src/services/real/goals.ts` gets thin stubs (empty-array read, throwing write) rather than live calls, so the barrel's `USE_MOCK ? mock : real` swap doesn't break if ever flipped to real.
- Withdraw destination is restricted to basic wallets only (not linked/bank-synced wallets) — confirmed with the user.
- Out of scope: editing/deleting an individual history entry; withdrawing to a linked wallet; any real backend wiring.

## Notes

<!-- Any extra notes -->
Full plan (file list, exact guard/error-code names, test list) is in
`C:\Users\Lenovo\.claude\plans\ch-a-c-n-i-l-ch-frolicking-puppy.md`.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Started. Diagnosed both gaps, planned, confirmed scope with user (mock-only, basic wallets only).
- 2026-08-09 — Implemented: type field + withdrawFromGoal in mock service, real/goals.ts stubs, barrel/queryKeys/hooks wiring, history list + WithdrawSheet UI, 5 new tests. type-check/lint/full test suite (64/64) all pass. Not yet verified on-device (app has no web target to browser-test).
