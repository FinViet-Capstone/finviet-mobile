# Current Feature

<!-- Feature name and short description -->
(Between features — see History below for what's landed. Next: item 2, Settings hub refactor + theme system, per `context/fe-plan-2026-07-revamp.md`.)

## Status

<!-- Not Started | In Progress | Completed -->
Not Started

## Goals

<!-- Goals and requirements -->

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-26 — Finverse removal started.
- 2026-07-26 — Finverse removal implemented: deleted `app/link-bank.tsx` + `src/services/real/finverse.ts`, removed `useSyncFinverseWallet` (hook + barrel export), simplified wallet-detail sync to SePay-only, removed the Finverse option from the add-wallet sheet, removed the dead `link-bank` route registration from `app/_layout.tsx`, removed the "linked" wallet-type option from onboarding, updated `docs/integration-status.md`/`CLAUDE.md`/`context/project-spec.md` to stop describing Finverse as wired. `type-check`/`lint`/`test` all pass. Completed.
- 2026-07-26 — Income/allocation snapshot rule started.
- 2026-07-26 — Income/allocation snapshot rule implemented: new `src/services/mock/incomeAllocation.ts` + `real/incomeAllocation.ts` (mock-forwarding), barrel-wired via `services/index.ts`; new `src/hooks/useIncomeAllocation.ts`; new `queryKeys.incomeAllocation.*`; `mock/budgets.ts`'s `getBudgetBuckets()` now resolves through the history instead of a hardcoded split; `app/settings/budget-allocation.tsx` redesigned to the current/next-month split; fixed a 4-file stale-read ripple (`app/(tabs)/home/index.tsx`, `app/(tabs)/budgets/index.tsx`, `app/settings/index.tsx`, `app/settings/categories.tsx` all read `Customer.needsPct/wantsPct/savingsPct`/`monthlyIncome` directly — switched to `useEffectiveIncomeAllocation()`). `type-check`/`lint`/`test` all pass. Completed.
- 2026-07-26 — Category-request removal started.
- 2026-07-27 — Category-request removal implemented: deleted `CategoryRequest`/`CategoryRequestStatus` types, both mock/real service modules, the hook, the query key, barrel wiring, the `/settings/category-requests` route, `CategoryRequestSheet`, and `CategoryRequestListScreen`. Removed the "Yêu cầu danh mục" row from `app/settings/index.tsx`. `CategoryBucketCard`'s "Add Sub-category" row now only renders when a handler is actually passed. `type-check`/`lint`/`test` all pass. Completed.
- 2026-07-27 — Custom-category creation + icon rendering (contained scope) implemented on the same branch: new `CustomCategory` type + mock/real service (real forwards to mock, no BE endpoint yet) + hooks; new on-device-only icon storage (`lib/categoryIconStorage.ts`, `expo-file-system`'s sync API) plus `expo-document-picker` (not image-picker — that can't pick SVGs); new `resolveCategoryVisual()`/`useCategoryVisual()`/`<CategoryIcon>`; wired end-to-end into `app/settings/categories.tsx`. Deliberately scoped down from a full app-wide icon-rendering sweep — audited all ~10 `getCategoryIcon()` call sites across 9 files and found each needs real category-lookup changes (not just icon swaps) with no simulator available to verify; left as an explicit follow-up. `type-check`/`lint`/`test` all pass. Completed.
- 2026-07-27 — All three branches (`feature/remove-finverse`, `feature/income-allocation-snapshot`, `feature/remove-category-requests`) merged into `dev` (local merges, not pushed to origin).
