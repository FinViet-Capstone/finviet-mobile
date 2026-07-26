# Current Feature

<!-- Feature name and short description -->
Income / budget-allocation snapshot rule: edits schedule for next month instead of applying immediately/retroactively. See item 4 of `context/fe-plan-2026-07-revamp.md` for full rationale.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- New versioned `IncomeAllocationSetting` history (one entry per effective month) replacing the single mutable income/allocation row.
- `scheduleIncomeAllocationChange` always targets next calendar month — editing again before rollover just revises the draft, never touches the current or a past month.
- `getEffectiveIncomeAllocation(month)` resolves the latest entry with `effectiveMonth <= month` (carry-forward), falling back to onboarding defaults.
- Fix a real pre-existing bug along the way: `mock/budgets.ts`'s `getBudgetBuckets()` used a hardcoded 50/30/20 split and transaction-summed income, completely ignoring the customer's actual settings.
- `app/settings/budget-allocation.tsx` becomes "current (locked, read-only this month) vs. next month (editable)" instead of "edit and save immediately".
- Real backend endpoint doesn't exist yet (BE is building the matching history table) — `real/incomeAllocation.ts` forwards to the mock for now, same pattern as `changePassword` in `real/auth.ts`.

## Notes

<!-- Any extra notes -->
Fixed a ripple I found while implementing: `app/(tabs)/home/index.tsx`, `app/(tabs)/budgets/index.tsx`, `app/settings/index.tsx`, and `app/settings/categories.tsx` all read `Customer.needsPct/wantsPct/savingsPct`/`monthlyIncome` directly for display/calculation — these stop updating once a change is scheduled (only the new history advances), so all four were switched to `useEffectiveIncomeAllocation()` to avoid silently going stale.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-26 — Started.
- 2026-07-26 — Implemented: new `src/services/mock/incomeAllocation.ts` + `real/incomeAllocation.ts` (mock-forwarding), barrel-wired via `services/index.ts`; new `src/hooks/useIncomeAllocation.ts`; new `queryKeys.incomeAllocation.*`; `mock/budgets.ts`'s `getBudgetBuckets()` now resolves through the history instead of a hardcoded split; `app/settings/budget-allocation.tsx` redesigned to the current/next-month split; fixed the 4-file stale-read ripple listed above. `type-check`/`lint`/`test` all pass. Completed.
