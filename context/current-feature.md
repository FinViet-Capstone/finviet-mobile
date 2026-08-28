# Current Feature

<!-- Feature name and short description -->
Feature: Automatic balance between saving goals and suggested spending (branch
`feature/savings-goal-spending-balance`, cross-repo with `finviet-be`'s branch of the same
name). Closes the thesis-council finding of 19-08-2026: *"Cần có sự cân đối tự động giữa việc
mục tiêu tiết kiệm được đề ra và hệ thống tự scale và đề xuất mức chi tiêu phù hợp."* This
screen has warned about over-allocation since 17-08 via its own client-side
`computeGoalAffordability` — the council saw that warning and still raised the finding, because
a warning that tells the user to go fix it by hand is not the system scaling anything. The
backend now does the comparison and proposes a rebalanced split; this wires the screen to it
and adds the one-tap apply that makes it actually automatic from the user's side.

## Status

Implemented and locally verified: `npm run type-check` clean; `npx eslint` on all six changed
files reports 0 problems (0 warnings — the `axios.isAxiosError` named-export warning that the
first draft introduced was removed by importing `isAxiosError` directly); `npm test` 26/26
suites, 131/131 tests (125 pre-existing + 6 new in
`src/services/real/__tests__/incomeAllocation.test.ts`). **Not committed/pushed yet.**

Not exercised against a running backend: the endpoints this calls are on a `finviet-be` branch
that is itself uncommitted and not deployed to Render, and that repo's local Postgres can't
start (pre-existing journal drift). So the wiring is verified by unit tests and types only —
one manual pass on device is still needed once the backend ships.

## Goals

- `useSavingsPlanRecommendation()` / `useApplySavingsPlanRecommendation()` over
  `GET /profile/income-allocation/recommendation` and
  `POST .../recommendation/apply`.
- `SavingsPlanBanner` on the goals screen renders only the three statuses the customer can act
  on — `adjustable` (with the proposed Savings % and the new Wants cap, plus an "Áp dụng từ
  tháng sau" button), `infeasible` (with the ceiling reachable without cutting Needs), and
  `no_income`. `on_track` / `no_goals` / `invalid_allocation` render nothing: a banner saying
  everything is fine, on a screen already showing every goal's progress, is just noise.
- Apply sends **no payload**. The backend recomputes the split server-side, so a proposal this
  screen is holding can't be written after a goal changed underneath it. A 422 back means
  exactly that, and is surfaced as "đề xuất không còn phù hợp, hãy kéo xuống để tải lại".

## Notes

- **`computeGoalAffordability` is deliberately kept, not deleted.** `getSavingsPlanRecommendation`
  resolves to `null` on 404 and the screen falls back to the local check then. This ships ahead
  of the backend reaching Render; letting the 404 surface as a query error would make the
  over-allocation warning vanish entirely on the live deployment — a silent regression of
  behaviour the council has already seen. Once the backend is deployed everywhere, the local
  path and its tests can be removed as a follow-up.
- Both banners are mutually exclusive (`showLocalWarning = !savingsPlan && isOverAllocated`), so
  there is never a moment where two versions of the same warning stack.
- Goal mutations now invalidate `queryKeys.incomeAllocation.recommendation()`
  (`invalidateGoalDependents` for create/contribute/withdraw/delete, and `useUpdateGoal`
  separately since an edit moves no money and shouldn't invalidate wallets/transactions).
  Without this the banner would contradict the very list it sits above after a goal edit —
  the same "con số không khớp" class of defect the council flagged for the AI report.
- Pull-to-refresh refetches the recommendation too, because the stale-plan error message tells
  the user to do exactly that.
- The backend never proposes cutting the Needs bucket (`WantsFloorPct = 5`), so `infeasible`
  copy asks the user to extend a deadline, lower a target, or raise income rather than offering
  a number to accept. That is a product decision on the backend side — see its
  `context/current-feature.md`.

---

Feature: Three user-reported fixes (cross-repo with `finviet-be`; mobile branch
`fix/score-no-data-and-budget-pct`, backend branch `fix/custom-category-id-and-score-no-data`).
(1) Custom category creation always fails with the backend 500 fallback "An unexpected error
occurred." — the image is NOT the cause (the FE already treats it as optional and never sends
it): `CategoryService.CreateCustomCategoryAsync` generates `custom_{Guid}` = 43 chars into a
`varchar(40)` `categories.id` column, so Postgres rejects every insert. Backend fix: generate
`custom_{Guid:N}` (39 chars, fits everywhere `category_id` appears) — no migration needed.
(2) The AI Spending Score shows a hardcoded neutral 50/100 + an LLM "trung bình" comment even
when the selected week/month has zero transactions (`SpendingScoreService` line ~73: neutral
baseline when no metric has data), and the spike metric counts spike days from a trailing
30-day window that crosses period boundaries. Backend fix: add `HasData` to
`SpendingScoreResult` (false when the customer has no expense transactions inside
`[periodStart, periodEnd]`; comment generation skipped), and count spike days only within the
period while keeping the trailing 30 days as the mean/std baseline. Mobile fix: map `hasData`
through the DTO/type and render a "Chưa có giao dịch" empty state on the Home score card and
score detail screen instead of a fake score.
(3) Budgets category rows: revert the "Vượt +X₫" overspend badge to always showing the raw
percentage (user's explicit choice, e.g. 500%; the bar stays capped at 100%).

## Status

Implemented — both repos verified. Backend: `dotnet build` 0 errors (6 pre-existing warnings in
untouched transaction files), `FinViet.Application.UnitTests` 267/267 (262 pre-existing + 5 new
in `SpendingScoreServiceTests.cs`: HasData false/true/income-only, spike-outside-period not
penalized, spike-inside-period penalized). Mobile: `npm run type-check` clean; changed-file
ESLint 0 errors (2 pre-existing warnings on untouched lines of `budgets/index.tsx`); Jest 25/25
suites, 127/127 tests (2 new `hasData` mapping tests in `reports.test.ts`). No physical-device
acceptance (no device in this environment), commit, or push.

## Notes

- Backend changes: `CategoryService.cs` id generation `custom_{Guid:N}` (39 ≤ varchar(40));
  `SpendingScoreResult.HasData` (default true); `SpendingScoreService.ComputeAsync` computes
  `HasExpenseInPeriodAsync` and skips the LLM comment when false; `ComputeSpikeAsync` now takes
  `periodStart` and counts spike days only inside the period (trailing 30 days remain the
  mean/std baseline only). `ComputeCurrentAsync`/interface signatures unchanged; snapshot
  persistence unchanged.
- Mobile changes: `hasData` mapped through `SpendingScoreDto` → `toSpendingScore` →
  `SpendingScore` (`?? true` so an older backend still shows scores); `SpendingScoreCard`
  renders a "Chưa có giao dịch trong tuần/tháng này" empty state replacing ring + AI insight;
  the score detail screen reuses its existing `EmptyState` branch with period-specific copy;
  `budgets/index.tsx` category rows always show the raw percentage (user explicitly chose e.g.
  500% over the "Vượt +X₫" badge from 2026-08-18 — that change is reverted; bar still capped
  at 100%), unused `S.over` removed.
- `HasData` is expense-only on purpose: the score assesses spending, so an income-only period
  still reads as "no data" (locked by a test).
- The score's savings metric (monthly view, 3–6-month consistency window) is deliberately
  untouched — it measures long-horizon consistency by design.
- No commit, push, deployment, production DB migration, or credential change without explicit
  permission, in either repo.

---

Feature: Remove the mock service layer + fix Photo/CSV/Settings bugs that surfaced while
testing against the real backend (branch `feature/remove-mock-layer`). User reported: Photo
entry never parses the actual receipt and its flashlight button does nothing; CSV import has
no select-all/deselect-all across up to 158 rows; Settings looked "still mock" and theme
changes didn't stick on the real API. A 5-pass Explore audit (both `finviet-mobile` and
`finviet-be`) found concrete causes: `real/extraction.ts` unconditionally re-exports mock's
`extractFromPhoto` regardless of `USE_MOCK` (never calls the real, intentionally-503ing
`POST /extract/photo`); the flashlight button only toggles an icon glyph (capture goes
through `expo-image-picker`'s native camera, which has no torch hook); CSV/photo review
screens have per-row-only selection with no bulk toggle anywhere in the codebase to copy;
Settings' theme/notification mutations have no `onError` handling so real-API failures are
invisible; and `real/auth.ts`'s `toCustomer` hardcodes `notifications: {budget:true,
report:true, goals:true}` on every login/profile fetch because the backend has no field at
all for those three toggles (confirmed via `finviet-be` — `UpdateProfileSettingsRequest`
only has `Theme` and a `NotifBudgetThresholds` threshold pair, not per-category booleans).
Given that audit, the user decided to delete the mock layer outright (`src/services/mock/*`,
the `USE_MOCK` flag) rather than keep patching drift, with three domain-specific decisions:
Photo OCR calls the real endpoint and shows an honest "coming soon" error instead of fake
data; the three backend-less notification toggles persist locally per customer (SecureStore,
like the existing `themeCache`) instead of round-tripping a nonexistent API; and Subscriptions
(confirmed via `finviet-be`: a real `POST /subscriptions/subscribe`/VNPay endpoint exists, but
plan-catalog and status-check are `Admin`-only, no customer-facing equivalent) gets its
Settings entry hidden entirely until backend adds those two endpoints, rather than half-wired.
Full plan at the session's plan file; ordering rule: wire/fix the real side only in the first
four steps, touch nothing under `src/services/mock/` until the final wholesale-deletion step.

## Status

Implemented — all five plan steps done, `npm run type-check` clean (one pre-existing unrelated
error in `app/settings/categories.tsx` untouched), `npm run lint` 0 errors / 70 warnings (down
from a higher pre-branch count — several warnings disappeared along with the deleted files;
none newly introduced beyond two pre-existing `axios`-named-export-style warnings matching the
one already present in `src/utils/errors.ts`), `npm test` 24/24 suites, 120/120 tests (the 5
mock-only test suites were deleted along with `src/services/mock/`, their subjects confirmed
dead — real mode gets that computation from the backend already, nothing needed porting). No
physical-device/emulator verification in this environment (none available); manual on-device
check of the actual UI flows is the user's to do. Not committed/pushed.

## Notes

- Steps 1–4 (Settings error surfacing + local notification-prefs cache; Photo real OCR wiring
  + flashlight removal; CSV/photo select-all UX; Subscriptions entry-point hiding + backend
  handoff doc) only touched `real/*`, hooks, and screens — `src/services/mock/` was left
  completely untouched until step 5's wholesale deletion, per the user's explicit ordering
  instruction.
- Step 5 surfaced two bugs beyond the original plan, both fixed as directly-caused follow-ups
  rather than new scope: (1) renaming the service-layer auth input types off their `Mock*`
  prefix collided with pre-existing, unrelated form-validation types of the same name in
  `src/validators/auth.schema.ts` — resolved by adopting the codebase's own pre-existing (if
  previously unused) `*Payload` naming convention instead (`LoginPayload`, `RegisterPayload`,
  `ChangePasswordPayload`, `ResetPasswordPayload`), and deleting the now-doubly-redundant dead
  `*Payload` types that already existed unused in `src/types/customer.ts`. (2) Found and
  deleted several other confirmed-zero-consumer dead type scaffolds while relocating types out
  of `mock/*` (`src/types/api.ts` — an entirely unused "planned backend envelope" file whose own
  docstring referenced the mock layer; unused legacy `*Payload` types in `budget.ts`/`goal.ts`/
  `wallet.ts`; `src/types/subscription.ts`, orphaned once the Subscriptions UI was removed) —
  verified each via grep for zero consumers before deleting, not assumed.
- `getCustomer` (barrel-exported from `mock/user.ts`, unconditional regardless of `USE_MOCK`)
  turned out to have zero runtime consumers — `useCustomer()` reads from the Zustand auth store
  instead, populated by `real/auth.ts`'s `toCustomer` at login/bootstrap — so it was dropped
  outright rather than needing a real replacement. Same for `getIncomeAllocationHistory`
  (confirmed no backend endpoint and no callers).
- `app/(auth)/index.tsx`'s Google-OAuth button was previously gated behind `USE_MOCK &&` (a
  demo-only affordance, since `real/auth.ts`'s `googleOAuth` always throws a clear "not
  available yet, use email/password" error). Rather than deleting the button along with the
  flag, it's now shown unconditionally — consistent with the Photo OCR treatment elsewhere in
  this same change (call the real path, surface its honest error) rather than hiding a
  already-working error message.
- `.fallowrc.jsonc`'s `duplicate-exports: off` was re-verified against the new no-mock world
  (temporarily flipped on, ran `fallow dead-code`, confirmed the findings are the ordinary
  barrel re-export pattern in `src/services/index.ts`, not anything mock-related) and its
  justifying comment updated accordingly; the rule itself stays off.
- `context/architecture.md` and `context/project-spec.md` updated throughout to remove
  `USE_MOCK`/mock-layer framing and describe the current real-only state, including the
  Photo-OCR-503 and Subscriptions-hidden exceptions.

Feature: Savings Goals ↔ Budget Adherence ↔ AI Spending Score integration — cross-repo work
with `finviet-be` (branch `fix/savings-bucket-goal-netting` there; this repo's branch is
`fix/savings-goal-budget-score-integration`). Started from an inspection of how the three
features relate: found the Budgets-bucket "Savings" spend figure was blind to Saving Goal
money entirely (backend excluded it by design), mobile's own client-side workaround for that
had a data-loss clamp bug, the real backend's `allocationPct`/`uncategorizedRatio` scale
(0-100) didn't match the mobile mock's assumed 0-1 fraction, the AI score's colour bands
(≥80/≥50 backend-side) didn't match the 70/40 the mobile FE assumed everywhere, and the score
was never refreshed after a transaction/goal/budget mutation.

## Status

<!-- Not Started | In Progress | Completed -->
Completed — backend fix implemented and verified (`dotnet build` 0 errors/warnings,
`FinViet.Application.UnitTests` 238/238); all three tiers of the mobile fix implemented and
verified (`npm run type-check` clean, `npm run lint` 0 errors/93 pre-existing warnings,
`npm test` 28/28 suites, 162/162 tests). Backend handoff doc written
(`finviet-be/docs/saving-goals-todo.md`) for the remaining genuinely open product questions.
Not committed/pushed in either repo yet.

## Goals

<!-- Goals and requirements -->
- **Backend** (`BudgetService.ComputeBucketSpentAsync`): net `cat_savings_goal`
  contributions minus withdrawals into the Savings bucket's `Spent`, instead of excluding the
  category outright — a goal contribution is functionally the customer fulfilling their
  Savings allocation.
- **Mobile Tier 1 (correctness)**: invalidate the AI score's query keys on
  transaction/goal/budget mutations + add pull-to-refresh to the score detail screen; fix
  `useBucketSpend`'s clamp to floor only the goal-net component, not the whole Savings
  accumulator; normalize `allocationPct`/`uncategorizedRatio` from the real backend's 0-100
  scale to the mock's 0-1 contract; fix the score detail screen's period label/duplicate-
  comment/view-param bugs and stop re-deriving colour from the raw score number; add a
  regression test locking in the allocation-percentage exact-sum-100 invariant (hardened with
  integer basis-point arithmetic after the test caught real floating-point summation noise).
- **Mobile Tier 2 (integration)**: surface the AI score's `spikeScore`/`budgetScore`/
  `savingsScore`/`weights` sub-scores on the score detail screen, with copy that accurately
  describes what `savingsScore` actually measures; exclude the savings bucket from the mock's
  `budgetAdherenceScore`, matching the real backend's already-correct formula; warn on the
  goals list when active goals collectively need more than the customer's own Savings
  allocation cap.
- **Mobile Tier 3 (consistency)**: reconcile the mock's `getBudgetBuckets` bucket assignment
  and goal-netting with the corrected backend rule; unify the Needs/Wants spend-status colour
  thresholds (previously three different sets: 60/80, >60/>80, >85/>60) into one shared
  `getBudgetStatus`; fix savings category rows to never show red over 100%; hide the
  "Cần X/tháng" line for a deadline-less goal instead of fabricating a value; correct two
  stale docstrings.
- No schema/migration change on the backend side — this is a query-logic change inside an
  existing service method.

## Notes

<!-- Any extra notes -->
- Full inspection notes (both repos, exact file:line citations, and the reasoning behind each
  finding) live in this session's plan file and are summarized in
  `finviet-be/docs/saving-goals-todo.md`'s "Context" section.
- The mobile-only reading of several findings turned out to be wrong once checked against
  actual backend source: the "100× allocationCap bug" and "score penalizes ahead-of-pace
  saving" were both confirmed to be mobile mock/real drift, with the real backend already
  correct — fixed on the mobile side only, no backend change needed for those two.
- Deadline-less goals (no `monthsRemaining`/`monthlySavingNeeded`) are unreachable through
  either app's own create flow today (`SavingGoalService.ValidateCreate` requires a deadline
  on the backend; `NewGoalSheet` always defaults+requires one on mobile) — the mobile display
  fix for this case is defensive only, not fixing a live bug.
- No `.env`, API key, commit, push, deployment, production database change, or credential
  change without explicit permission, in either repo.

---

Feature: reliable notification delivery with foreground in-app banners, background/terminated
OS push, unread visibility, and a static notification-detail screen.

## Status

<!-- Not Started | In Progress | Completed -->
Implemented — automated mobile/backend verification passes; physical-device push acceptance and
non-production EAS/provider credential setup remain before the feature can be marked completed.

## Goals

<!-- Goals and requirements -->
- Register each authenticated app installation with the backend using its Expo push token,
  platform, and stable installation identifier; unregister best-effort on logout/account change.
- Show a queued, accessible in-app banner for notifications first observed while FinViet is open,
  without replaying the customer's historical unread inbox after login.
- Keep the Notification Center as the canonical durable inbox, add a visible unread count on the
  Home bell, poll/refetch while foregrounded, and deduplicate push and polling arrivals by ID.
- Mark a notification read and open a static notification-detail screen (title + body only) when
  either the in-app banner, OS notification, or a Notification Center row is tapped — replaces the
  earlier per-entity deep-link routing (see 2026-08-18 note below).
- Suppress duplicate foreground OS presentation in favor of the custom banner while preserving
  normal background/terminated push behavior through EAS/Expo Notifications.
- Keep permission denial and push-provider failure non-fatal: persisted notification rows and the
  foreground polling path must continue working.
- Add focused contract, routing, queue/deduplication, listener, registration, cache, and badge tests.
  Email/SMS channels, rich push actions/media, grouping, and per-device settings UI remain out of
  scope.

## Notes

<!-- Any extra notes -->
- Cross-repo backend work is in `D:/SEP490/newestbe/finviet-be` on the matching
  `feature/notification-delivery` branch.
- Backend persisted notification rows are the canonical source of truth. Push is a best-effort
  delivery channel and must never roll back or replace the durable inbox row.
- Use Expo push tokens end to end. EAS credentials bridge Expo Push Service to FCM/APNs; do not add
  client-side Firebase topic subscription or commit Firebase/APNs/provider credentials.
- Backend device registrations must support multiple installations per customer and remove invalid
  tokens reported by the provider. The existing single `CustomerSetting.FcmToken` is not sufficient.
- The mobile banner must be mounted at the authenticated root, respect safe-area insets, and clear
  queue/cache state when the authenticated customer changes.
- No commit, push, deployment, production database migration, credential change, or branch deletion
  without explicit permission.
- 2026-08-17 — Diagnosed the AI chat history layout regression: `AIChatbotSheet` renders the history
  drawer in normal document flow immediately above the message `FlatList`, so opening it consumes up
  to 280 points and pushes the chat viewport downward. The drawer also renders sessions with
  `sessions.map` inside a non-scrollable `View`; a long history can overflow its `maxHeight` and cover
  the chat/input area. Approved fix scope: make the history drawer an absolutely positioned overlay
  below the header, render sessions in a bounded vertical `FlatList`, preserve session selection and
  chat behavior, and add focused regression coverage. No API or backend change is required.
- 2026-08-17 — Implemented on `fix/chat-history-layout`: the history drawer is now an absolutely
  positioned overlay below the fixed chat header, so opening it no longer participates in the flex
  layout or reduces the message viewport. Sessions now render in a vertically scrollable `FlatList`
  constrained to 280 points, with explicit shrink behavior for long histories on iOS and Android.
  Added accessible expanded-state labels to the history toggle and a component regression test that
  verifies the bounded overlay and independent history list. Verified: TypeScript clean; changed-test
  ESLint clean; full main-workspace ESLint 0 errors / 86 pre-existing warnings; focused Jest 1/1 and
  full main-workspace Jest 23/23 suites, 122/122 tests pass; `git diff --check` clean. Raw full-repo
  Jest also passed 107/107 suites and 578/578 tests but redundantly scanned four temporary `.claude`
  worktrees; raw ESLint likewise scanned those checkouts, so the authoritative reruns excluded them.
  No physical-device acceptance, commit, or push.
- 2026-08-17 — Diagnosed a linked-wallet uncategorized income transaction that failed when the
  customer selected `Ăn uống`: the transaction-detail picker exposed every system category instead
  of filtering by transaction type, so the backend correctly rejected the expense category with
  `category_type_mismatch`. Approved fix scope: filter the picker to compatible, manually selectable
  categories, surface the mapped API error instead of the generic save failure, and add regression
  coverage. No backend change is required; category-only edits on SePay transactions are supported.
- 2026-08-17 — Implemented on `fix/transaction-category-filter`: transaction detail now reuses the
  shared type-aware `CategoryPickerSheet`, with a transaction-type helper that maps only income and
  expense records to compatible picker categories; transfers remain non-classifiable. Save failures
  now pass through `getApiErrorMessage`, so any backend safeguard such as `category_type_mismatch`
  is shown in Vietnamese. Added category filtering and error-mapping regression tests. Verified:
  TypeScript clean; changed-file ESLint clean; full main-workspace ESLint 0 errors / 87 pre-existing
  warnings; focused Jest 12/12 and full main-workspace Jest 22/22 suites, 118/118 tests pass. The raw
  full-repo commands initially also scanned two locked temporary `.claude/worktrees` created by
  failed read-only agents; reruns explicitly excluded those duplicate checkouts. No commit or push.
- 2026-08-17 — Diagnosed the follow-up Calendar regression after categorizing the final
  uncategorized transaction: the mutation invalidated and refetched the month correctly, but the
  Transactions screen retained its local `uncategorizedOnly` filter. Because the hook derived the
  summary, Calendar cells, and history from that now-empty filtered list—and also counted
  uncategorized rows from the same filtered list—the whole month appeared empty until login remounted
  the screen. Approved fix scope: count uncategorized rows from the raw month query, automatically
  clear the filter only when a completed refetch leaves no uncategorized rows, and add regression
  coverage. Existing filters must remain active while matching rows still exist.
- 2026-08-17 — Implemented the Calendar follow-up on the same branch: the monthly hook now keeps the
  raw month query separate from its display-filtered transactions and derives the uncategorized count
  from the raw rows. The Transactions screen clears a retained uncategorized-only filter only after
  the focused month's query has loaded, finished refetching, and reports zero uncategorized rows; it
  keeps the filter while any matching rows remain. The next render therefore restores the full month
  immediately, including summary totals, Calendar amounts, and transaction history. Added regression
  coverage for raw counting, transfer exclusion, completed-refetch clearing, and all guard conditions.
  Verified: TypeScript clean; changed-file ESLint clean; full main-workspace ESLint 0 errors / 87
  pre-existing warnings; focused Jest 3/3 suites and 20/20 tests; full main-workspace Jest 22/22 suites
  and 121/121 tests pass; `git diff --check` clean. No physical-device acceptance, commit, or push.
- 2026-08-18 — Diagnosed "rút tất cả tiền bị lag" (lag after tapping "Rút toàn bộ" in the
  archive-withdrawal Alert): `openArchiveWithdrawal` opened the WithdrawSheet via a hardcoded
  `setTimeout(500)` (commit `b47c17b` swapped in for `InteractionManager.runAfterInteractions` from
  the earlier `bcf3787` "withdraw freeze" fix — the native Alert dismissal isn't a JS-tracked
  interaction, so both were workarounds for the same collision), and `DraggableSheet` had no
  entrance/exit animation: it set `translateY.value = 0` on open and unmounted instantly on close,
  so the sheet popped in abruptly. Net effect: tap → alert closes → 500ms dead screen → pop-in.
  Approved fix: give `DraggableSheet` a real spring slide-up entrance and timed slide-down exit
  (staying mounted until the exit finishes; API unchanged, all 10 sheet consumers benefit), and
  open the archive withdrawal sheet immediately — no delay, no unused `InteractionManager` import.
  Also fixed a pre-existing type error blocking `type-check` on this branch's HEAD (not from the
  lag fix): `b47c17b` made `CustomCategoryInput.pickedUri`/`ext` optional but left
  `saveCategoryIcon(created.id, input.pickedUri, input.ext)` in `app/settings/categories.tsx`
  unguarded — now only called when both are present.
  Verified on `fix/some-ux`: type-check clean; changed-file lint 0 errors (remaining warnings are
  the project-tolerated `react-hooks` v6 class, 4 of them pre-existing on untouched lines); full
  Jest 28/28 suites, 162/162 tests (run with `--testPathIgnorePatterns "\\.claude"` to skip the
  stale locked worktree checkouts that fail module resolution). No physical-device acceptance,
  commit, or push.
- 2026-08-18 — User reported the withdraw-all flow still lagged after the animation fix, and
  proposed the design change themselves: drop the two-button (Hủy/Rút toàn bộ) alert — show an
  info-only alert (single "Đã hiểu" button) telling the customer to withdraw first, and let them
  use the screen's regular "Rút tiền" button. This removes the alert-dismissal → sheet-open
  transition (the collision source) entirely. Implemented on `fix/some-ux` with two approved
  refinements: the WithdrawSheet gained a "Tất cả" quick-fill chip (fills the full saved amount,
  closes the numpad — the only zero-balance path without typing the whole number by hand), and a
  withdrawal that drains the goal (`drainedGoal: parsedAmount >= goal.currentAmount`, renamed
  from `wasWithdrawAll` in `executeGoalWithdrawal` + its tests) still auto-opens the archive
  confirm. Removed the `withdrawAll` prop, `isArchiveWithdrawal` state, `openArchiveWithdrawal`,
  and the now-unused `S.withdrawAll` string. Verified: type-check clean; changed-file lint
  0 errors (4 pre-existing tolerated `set-state-in-effect` warnings on untouched lines); full
  Jest 28/28 suites, 162/162 tests. No physical-device acceptance, commit, or push.
- 2026-08-18 — User reported the Budgets category-row overspend badge shows an absurdly high
  percentage (e.g. "Vượt 400%" when spending 500K against a 100K limit) and asked for a saner
  representation. Confirmed this was the only unclamped >100% percentage display in the app
  (goal progress and the Home savings row are already capped). Approved change: show the real
  overspend amount instead — "Vượt +400Kđ" via `formatVND(budget.spent - budget.monthlyLimit)`;
  widened `categoryRight` 64→84px so the longer text fits, `numberOfLines={1}` as a guard.
  Under-limit rows still show the plain percentage. Verified: type-check clean; changed-file
  lint 0 errors (2 pre-existing warnings on untouched lines); full Jest 28/28 suites, 162/162
  tests. No physical-device acceptance, commit, or push.
- 2026-08-18 — Clarified the "% quá cao" report actually pointed at the Transactions screen's
  three-column summary banner, whose month-over-month trend badges could show huge percentages
  (e.g. ↑1700% after a low-spend baseline month). User's decision on reflection: drop the number
  entirely — arrows only. `TransactionSummaryBanner`'s `pctTrend` became a direction-only
  `trendState`, `TrendBadge` now renders just the up/down arrow (dash when unchanged or no
  baseline), with Vietnamese `accessibilityLabel`s keeping the trend readable for screen readers
  now that the visible text is gone; unused `trendText` style removed. The earlier Budgets
  category-row change ("Vượt +400Kđ") was a different spot and stays. Verified: type-check
  clean; changed-file lint 0 problems; full Jest 28/28 suites, 162/162 tests. No
  physical-device acceptance, commit, or push.
- 2026-08-18 — User sent a reference screenshot of the arrow style they wanted (image not
  viewable in-session); picked the diagonal variant from mockups: the trend arrows are now
  `north_east`/`south_east` (↗/↘) instead of `arrow_upward`/`arrow_downward`. Same file,
  one-line icon swap. Verified: type-check clean; changed-file lint 0 problems; full Jest
  28/28 suites, 162/162 tests. No physical-device acceptance, commit, or push.
- 2026-08-15 — Started after confirming the current app only requests notification permission: it
  does not register an Expo token, install receive/response listeners, poll unread notifications,
  show a global banner, or expose the unread count. Backend push is incomplete: customer-token push
  is a no-op, topic publishers have no subscribed clients, and weekly-report push does not create a
  durable Notification Center row.
- 2026-08-15 — Implemented the mobile delivery lifecycle: authenticated Expo-token registration and
  token-rotation handling with a stable SecureStore installation ID, best-effort unregister on
  explicit logout, foreground unread polling, account-scoped TanStack Query caches, push/poll ID
  deduplication, queued global safe-area banners, suppressed foreground OS presentation, unread Home
  bell count, cold-start/foreground response handling, and one shared entity route resolver used by
  banners, OS responses, and Notification Center. Weekly-report links can now load the exact report
  ID; goal and wallet links open their detail routes, budget links open the Budgets tab because this
  app has no budget-detail route, and invalid destinations fall back to Notification Center.
- 2026-08-15 — Added focused routing, arrival, cache, real-service, and exact-report tests. Extracted
  the pure arrival collector from `NotificationProvider` so its unit test no longer imports
  `expo-notifications`; the SDK's Expo Go warning disappeared. Traced Jest's remaining open handles
  to TanStack Query GC timers created by the cache tests and now clear their `QueryClient` after each
  case; a full `--detectOpenHandles` run exits cleanly. Verified: TypeScript clean; full ESLint 0
  errors / 85 warnings; focused notification lint clean; full mobile Jest 19/19 suites and 109/109
  tests pass; backend notification tests 10/10, all Application tests
  210/210, Domain tests 1/1, and solution build 0 warnings / 0 errors. No commit, push, deployment,
  provider credential change, production migration, or physical-device acceptance was performed.
- 2026-08-18 — User asked to stop deep-linking notification taps to the entity's own tab/screen and
  instead open a static detail page (title + content only), for every tap surface (Notification
  Center row, in-app banner, and OS push tap on background/terminated). Implemented: added
  `app/notification-detail.tsx` (simple header + title + body, no entity awareness); replaced
  `notificationEntityRoute` in `src/lib/notificationRouting.ts` with `notificationDetailRoute`,
  which every tap path now uses (`notificationRoute` for the Notification Center list and banner —
  both already have the full `AppNotification`; the OS-response handler in `NotificationProvider`
  now builds it from `response.notification.request.content.title`/`.body` since the push payload
  itself only carries IDs). `AppNotification.entityType`/`entityId` and `parseNotificationPushData`
  are unchanged and still populated (backend contract, cache identity) — only routing stopped
  consuming them; updated their doc comments to say so instead of claiming they drive navigation.
  Verified: `npm run type-check` clean; `npm run lint` 0 errors / 93 pre-existing warnings (none
  newly introduced); `npm test` 29/29 suites, 160/160 tests (3 new routing tests replacing the 3
  removed `notificationEntityRoute` cases). No physical-device acceptance (no device access in this
  environment), commit, or push.
- 2026-08-18 — User reported an on-device `Cài đặt` (Settings) alert, "The request field is
  required.", when changing the theme. Diagnosed against live `finviet-be` source (not guessed):
  `real/auth.ts`'s `FE_THEME_TO_BE` sent theme as a capitalized string (`'Light'`/`'Dark'`/
  `'System'`) in the `PUT /profile/settings` body, but the backend has no
  `JsonStringEnumConverter` registered anywhere (`FinViet.Api/Program.cs`'s `AddJsonOptions` only
  sets `ReferenceHandler.IgnoreCycles`), so `System.Text.Json` requires the `AppTheme` enum as a
  raw integer — same convention the FE's own `GENDER_TO_INT` already follows for `Gender`, just
  not mirrored for `Theme`. The string body fails to deserialize, `ProfileController`'s
  `[FromBody] UpdateProfileSettingsRequest request` binds to `null`, and ASP.NET's automatic
  `ApiController` validation reports the generic "The request field is required." on the
  parameter itself. Fixed `FE_THEME_TO_BE` to map to ints (`Light=0, Dark=1, System=2`, matching
  the backend enum's declared order) — no backend change needed. While fixing, found and fixed
  the mirror-image bug on the read side: `BE_THEME_TO_FE`/`toTheme` (used by `getProfile`/
  `login`) expected the same wrong string shape back from the backend, and separately used
  `raw && BE_THEME_TO_FE[raw]`, which would have silently mis-mapped `0` (Light) to `'system'`
  even after switching to ints, since `0` is falsy in JS — changed the lookup keys to numbers and
  the guard to an explicit `raw !== undefined` check. Added
  `src/services/real/__tests__/auth.test.ts` (5 tests: int-body assertion on save, all three
  raw-int → FE-string mappings on read including the `0`/Light edge case, and the
  no-theme-in-response fallback). Verified: `npm run type-check` clean; `npm run lint` 0 errors on
  changed/new files; `npm test` 25/25 suites, 125/125 tests (5 new). No physical-device
  acceptance, commit, or push.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Previous three branches (shipped-endpoint wiring; transaction-edit + goal-ledger
  wiring; SePay OAuth fix) merged to `dev`. Verified the complete error code list against
  `finviet-be` source directly rather than trusting the markdown reference alone.
- 2026-08-10 — Implemented: `BUSINESS_RULE_MESSAGES_VI` (38 codes) added to
  `src/utils/errors.ts`; `getApiErrorMessage()` now checks `code` first, ahead of the raw
  `message`; consolidated `app/(tabs)/wallets/[id].tsx`'s local `WALLET_DELETE_ERROR_MESSAGES`
  duplicate into the shared map. Added `src/utils/__tests__/errors.test.ts` (8 tests). This
  closed out every item from the FE↔BE reconciliation plan.
- 2026-08-13 — Started. Branch `feature/csv-extraction-wiring` created from
  `dev` (pre-existing uncommitted `app.json`/`eas.json`/`package.json`
  EAS-build-config WIP on `dev` carried over untouched — it's needed for this
  same session's LAN `http://` testing via `expo-build-properties`'
  `usesCleartextTraffic`).
- 2026-08-13 — Implemented CSV wiring: `CsvExtractionRow`/`CsvExtractionResult`
  types added to `src/types/extraction.ts`; `extractFromCsv` added to
  `mock/extraction.ts` (canned 2-row sample) and `real/extraction.ts`
  (multipart `POST /extract/csv`, reusing the existing `ExtractedRowDto`
  mapper pattern extended to a full array); exported through
  `src/services/index.ts` (also fixed a stale header-comment claim that
  custom-category creation was mock-only — `real/customCategories.ts` already
  implements it against a real endpoint); new `src/hooks/useExtractFromCsv.ts`
  added to the hooks barrel; `app/(tabs)/entry/csv-import.tsx` reworked to
  call the new hook instead of its former ~150-line client-side CSV parser
  (`parseCsvContent`/`parseCsvLine`/header-matching/`normalizeDate`/
  `normalizeAmount` all removed), keeping only client-side duplicate
  detection and the merchant-rule fallback for rows the backend's AI
  couldn't categorize; updated the `aiBadge` copy since categorization is now
  real AI, not just saved-rule matching.
- 2026-08-13 — Corrected stale "AI is mock-only" claims in
  `context/project-spec.md` (intro paragraph, Features §A extraction-methods
  bullet, Features §E, Tech Stack `USE_MOCK` bullet) — the real AI/reports
  path (`src/services/real/reports.ts`) and CSV extraction are both fully
  wired to the backend already; only photo-OCR (backend endpoint exists but
  no real OCR provider, always 503) and subscriptions (no backend) remain
  mock-only.
- 2026-08-13 — Set `.env.local` for this session's physical-device-over-LAN
  testing: `EXPO_PUBLIC_USE_MOCK=false`,
  `EXPO_PUBLIC_API_BASE_URL=http://10.3.73.232:5122/api` (gitignored, no
  commit). `npm run type-check` clean, `npm run lint` 0 errors / 84
  pre-existing warnings (none newly introduced — verified none touch the
  changed files beyond one pre-existing warning on an untouched effect in
  `csv-import.tsx`). Awaiting commit approval; on-device verification is the
  user's to do (no device access in this environment).
- 2026-08-13 — Audited the whole mobile↔backend API surface: all 68 `real/*` calls resolve against
  the current `finviet-be` controllers (the app is **not** pointed at an old backend), but four
  areas lag the current contract — multi-session AI chat, `/profile/ai-preferences`, `/extract/csv`,
  and `/extract/photo` (the last correctly stays mock: its OCR provider is an unwired scaffold that
  returns 503). Started this branch for the first and largest of those.
- 2026-08-13 — Implemented on `feature/real-chat-sessions`: `real/reports.ts` chat block rewritten
  onto `/ai/chat/sessions` + per-session `/ai/chat/history`, `sendChatMessage(question, sessionId?)`,
  new `createChatSession(title?)`, and `toChatMessage` now reads the DTO's real `sessionId`;
  `messageCount` made optional in `types/ai.ts` with the drawer omitting the suffix when absent;
  `mock/reports.ts` given matching signatures + its own `createChatSession`; `useSendChatMessage`
  now takes `{ question, sessionId }` and added `useCreateChatSession`; `AIChatbotSheet` tracks
  `activeSessionId` (cleared by "+", set when a session is opened, created on the first message of
  a fresh conversation). type-check clean, lint clean on all changed files, 112/112 Jest tests pass.
- 2026-08-13 — Verified against a live backend (18 assertions replaying the exact HTTP calls the
  new service issues, as the seeded demo customer): session create/list/scoping, the 120-char title
  slice avoiding `NormalizeTitle`'s 400, the `lastMessageAt ?? updatedAt` fallback on a
  never-used session, a real Gemini round trip landing in the right session, and newest-first
  ordering. **Found one backend defect**: `AiChatService.CompleteTurnAsync` stamps the user and
  assistant rows of an exchange with the *same* `CreatedAt`
  (`AiChatService.cs:247`/`:256`), while `GetHistoryAsync` orders by that column alone — so
  Postgres can and does return the answer before its own question (observed live). Mitigated
  client-side in `fetchChatHistory` with a role tiebreak (`user` before `assistant`) on equal
  timestamps, comparing parsed values because the API mixes `Z` and `+07:00` offsets. The real fix
  belongs in `finviet-be` (give the assistant row a later timestamp, or add a secondary sort key)
  and is filed separately. Re-verified: 18/18 assertions pass, type-check clean, lint clean on
  changed files, 112/112 Jest tests pass. Test sessions created during the run were deleted (204).
- 2026-08-14 — Diagnosed the linked-wallet balance question against live data rather than
  assuming: confirmed by code and by DB query that a linked balance mirrors SePay and is never
  summed from transactions, so a footnote is the honest fix rather than "correcting" a balance
  that is behaving as designed. Implemented on `feature/linked-wallet-balance-note` (commit
  `95442d2`): the `Số dư đồng bộ từ ngân hàng` line on the wallet detail screen, shown only for
  linked wallets. type-check clean, lint 0 errors on the changed file, 112/112 Jest tests pass.
- 2026-08-14 — Merged both `feature/real-chat-sessions` and
  `feature/linked-wallet-balance-note` into `dev` (which had moved 19 commits ahead in the
  meantime, including the CSV-extraction wiring). Conflicts were confined to this document and
  the `src/services/index.ts` header comment; both resolved by combining rather than picking a
  side, so the CSV work's history and its "wired to real" claims survive intact. Re-verified on
  the merge result: type-check clean, 112/112 Jest tests pass. Not pushed.
- 2026-08-14 — User reported registration failing against the deployed backend
  (`https://finviet-be-7t8w.onrender.com`) with no visible error and nothing in Sentry.
  Diagnosed via two parallel Explore investigations rather than guessing: confirmed live
  against the backend that `.env.local`'s `EXPO_PUBLIC_API_BASE_URL` was missing the `/api`
  prefix (unlike `eas.json`'s already-correct `preview`/`production` values), so every
  real-backend call 404'd with an empty body and no JSON envelope — explaining both the
  generic "Đã có lỗi xảy ra" banner and, separately, why Sentry never saw it: the app's
  `captureException` (used by the query client's global `onError` and the root
  `ErrorBoundary`) gated on `EXPO_PUBLIC_SENTRY_DSN`, which was never set anywhere despite
  `app/_layout.tsx` also unconditionally running a second, disconnected hardcoded
  `Sentry.init(...)` — so the SDK was alive but every explicit capture call was a permanent
  no-op in every build, not just this one. Fixed both: appended `/api` to `.env.local`, and
  consolidated Sentry init onto a single path by defaulting `SENTRY_DSN`
  (`src/lib/env.ts`) to the previously-hardcoded DSN, moving the full init config into
  `initSentry()` (`src/lib/sentry.ts`), and deleting the duplicate raw `Sentry.init(...)`
  block from `app/_layout.tsx`. type-check clean, lint 0 errors (84 pre-existing warnings
  untouched), 72/72 Jest tests pass.
- 2026-08-14 — User asked to leave Maestro flows running overnight against a real backend to
  catch bugs. Built two flows (`.maestro/flows/happy-path.yaml`,
  `exception-and-boundary-path.yaml`, shared `subflows/login.yaml`) run through Expo Go
  (`host.exp.exponent`) rather than the installed `com.finviet.mobile` dev-client build — that
  build predates the `expo-secure-store` native dependency and crashes on every launch, and a
  rebuild wasn't something to do unilaterally. Added `accessibilityLabel` to a handful of
  icon-only controls (`+` entry tab, `NumericKeypad` backspace/Done, goal-detail delete) so
  Maestro could target them — closes a real a11y gap the project's own coding standards call
  for, not just a test convenience. Added a self-healing PowerShell runner
  (`scripts/maestro-overnight.ps1`, gitignored under the existing `scripts/` rule) that
  relaunches the emulator/Metro if either dies mid-run. The emulator crashed and needed manual
  or self-healing recovery four separate times over the course of the night — a recurring
  instability worth investigating separately, not chased further here.
- 2026-08-14 — Live testing surfaced two real, verified app bugs (not test-script issues):
  (1) **Unhandled goal-mutation errors**: all four mutation handlers in the goals feature
  (`NewGoalSheet.handleSave`, `ContributionSheet.handleSave`, `WithdrawSheet.handleSave`,
  `handleDelete` — `app/(tabs)/budgets/goals/index.tsx` and `[id].tsx`) called
  `await x.mutateAsync(...)` with no try/catch; a failed request (confirmed via a Sentry issue,
  `AxiosError: Request failed with status code 400`, `onunhandledrejection`) threw straight
  past the cleanup/close code, leaving the sheet stuck open with old values and zero feedback —
  this is what caused goal creation to look "stuck" in Maestro runs before the fix. Fixed all
  four to match the existing `getApiErrorMessage(err, fallback) + Alert.alert` pattern already
  used in `entry/manual.tsx`. (2) **Onboarding allocation missing lock/edit**: user reported
  `OnboardingAllocation.tsx` (onboarding step 2) has no lock-bucket or tap-to-edit-number
  controls, unlike `app/settings/budget-allocation.tsx` — confirmed these are two fully
  separate implementations, not a shared component. Added the same lock-toggle +
  tap-to-edit-via-numpad UX to onboarding, reusing the settings screen's clamped-redistribution
  behavior when a bucket is locked. (3) **Not fixed — out of scope for this repo**: user also
  found the Budgets screen showing a bucket cap 100x too large (e.g. 1.050M instead of
  10.5M for a 42%-of-25M allocation). Traced to `real/budgets.ts`'s `getBudgetBuckets` being a
  pure passthrough of the backend's `allocationCap` field (`{ ...dto }`, no client math) — the
  mock implementation correctly divides `needsPct` by 100 before multiplying by income, so this
  is a `finviet-be` backend bug (using the raw whole-number percent instead of the fraction),
  not fixable from this repo. Reported with an exact repro for whoever owns that repo.
  type-check clean; lint clean on all changed files (pre-existing warnings elsewhere
  untouched). Not fully re-verified live end-to-end after the last emulator crash — worth a
  fresh Maestro pass next session before trusting these fixes fully.
  **Correction (2026-08-17):** direct inspection of `finviet-be` source confirmed this was
  never a backend bug — `BudgetService.cs` computes `AllocationCap = income * pct / 100m`
  correctly server-side, and `AllocationPct` is deliberately a raw 0–100 percent by design,
  matching `Customer.NeedsPct` storage. The 100× mismatch was entirely `real/budgets.ts`'s own
  passthrough disagreeing with the mock's pre-divided 0–1 contract. Fixed in `toBucket()` — see
  the entry below.
- 2026-08-17 — Inspected how Saving Goals, Budget Adherence, and the AI Spending Score relate
  to each other, across both `finviet-mobile` and `finviet-be`, prompted by a user question
  about whether the three surfaces stacked on Home actually form one coherent system. Found the
  UI implies they do (score card above budget card above goal card, plus the score screen's own
  copy claiming the score factors in "đều đặn tiết kiệm") but the Budgets-bucket "Savings" spend
  figure was backend-blind to goal money entirely — `ComputeBucketSpentAsync` excluded
  `cat_savings_goal` outright, not by oversight but in a way that made the bucket effectively
  unfillable for anyone who actually uses Goals. Recommended fixing this at the source rather
  than deepening the mobile-only workaround (`useBucketSpend`'s ad hoc netting, which itself had
  a real data-loss clamp bug — a goal withdrawal larger than that month's contributions could
  zero out an unrelated `cat_savings` expense logged the same month). User confirmed doing both
  repos in one coordinated effort.
- 2026-08-17 — Implemented across both repos. **Backend** (`fix/savings-bucket-goal-netting`):
  `ComputeBucketSpentAsync`'s Savings bucket now nets `cat_savings_goal` contributions minus
  withdrawals (floored at 0) via a new `ComputeGoalNetSavingsAsync`; `CalculateFlatBudgetAdherenceScore`'s
  separate needs/wants-only exclusion left untouched (a different, correct design choice). New
  `BudgetServiceTests.cs` (3 tests, EF Core InMemory pattern) prove the netting formula and the
  exact data-loss repro reported from mobile. `dotnet build` 0 errors/warnings, full
  `FinViet.Application.UnitTests` 238/238 (235 pre-existing + 3 new), no regressions.
  **Mobile** (`fix/savings-goal-budget-score-integration`), all three tiers: Tier 1 — score
  query invalidation on transaction/goal/budget mutations + pull-to-refresh on the score detail
  screen; `useBucketSpend`'s clamp fixed to floor only the goal-net sub-total; `real/budgets.ts`'s
  `toBucket()` now divides `allocationPct`/`uncategorizedRatio` by 100 to match the mock's 0-1
  contract (the confirmed root cause of the "100x bug" noted above); score detail screen's period
  label/duplicate-AI-comment/view-param bugs fixed and its colour now always comes from
  `score.color` instead of re-deriving a 70/40 band from the raw number (backend's real bands are
  80/50); new shared `src/utils/allocationRedistribution.ts` consolidates the two allocation
  screens' redistribution math (previously duplicated) with a regression test for the
  exact-sum-100 invariant — the test itself caught a real subtlety (naive JS `+` on three
  individually-correct 2-decimal percentages can show floating-point noise like
  `99.99999999999999` even though each value round-trips correctly through JSON to the backend's
  exact decimal type), which led to hardening the production math with integer basis-point
  arithmetic rather than just patching the test. Tier 2 — `SpendingScore` gained optional
  `spikeScore`/`budgetScore`/`savingsScore`/`weights`, mapped from the real DTO and surfaced as a
  three-row breakdown on the score detail screen (replacing the prose-only note) with copy that
  correctly describes `savingsScore` as a blended income-rate model rather than "goal
  regularity"; mock's `budgetAdherenceScore` now excludes the savings bucket, matching the real
  backend's already-correct formula; goals list now warns when active goals' summed
  `requiredMonthlySaving` exceeds the customer's own Savings allocation cap. Tier 3 — mock's
  `getBudgetBuckets` now honors the customer's bucket override and nets goal transactions the
  same way the corrected backend does; Needs/Wants spend-status colour thresholds unified into
  one shared `getBudgetStatus` (previously three drifted sets: 60/80, >60/>80, >85/>60); savings
  category rows no longer turn red over 100%; the "Cần X/tháng" line is hidden rather than
  fabricated for a deadline-less goal (confirmed unreachable via either app's real create flow
  today); two stale docstrings corrected (`hideGoalContributions`'s actual caller,
  `deleteTransactionSync`'s stale claim about `goals.ts`). Verified: `npm run type-check` clean;
  `npm run lint` 0 errors / 93 pre-existing warnings (none newly introduced); `npm test` 28/28
  suites, 162/162 tests (23 new: allocation redistribution ×22, budget status ×3, mock budgets
  score ×4, getBudgetBuckets reconciliation ×3, goal affordability ×5, real budgets scale ×1,
  real reports sub-scores ×2 — some overlap across categories). Backend handoff doc written at
  `finviet-be/docs/saving-goals-todo.md` covering the three genuinely open product questions
  (score threshold finality, `savingsScore`'s flat 20% target, the income/expense category-type
  mismatch on goal withdrawals) — deliberately short, since most of what looked like backend
  gaps from a mobile-only read turned out to be mobile-side mock/real drift once checked against
  actual backend source. Not committed/pushed in either repo.
- 2026-08-18 — User reported AI can't auto-categorize transactions from SMS, photo, CSV entry,
  or SePay-linked-wallet sync. Deep-inspected the full pipeline across both repos (two parallel
  Explore passes, read-only). **Mobile side is not the source**: `real/extraction.ts`'s
  SMS/CSV/Photo mappers pass through the backend's `categoryId` correctly with nothing dropped
  or reset, and all three review screens (`sms.tsx`, `csv-import.tsx`, `photo-confirm.tsx`)
  display it correctly. **Real backend causes found**: (1) the shared categorizer
  (`AiCategorizationService.CategorizeTransactionAsync`, called by SMS/CSV extraction's
  `PreviewAsync` and by SePay sync's `CategorizeAsync` helper) catches any
  `AiProviderUnavailableException` from the Gemini call and silently falls back to
  `categoryId: null`, logged only as a warning — never surfaced to the app. Git history shows
  the Gemini model config (`FlashModel` + fallback chain) changed three times in the days just
  before this report (commits `c83a331`→`80d5e33`→`460fc9c`), landing on
  `gemini-3.1-flash-lite`; an invalid/decommissioned model ID anywhere in that fallback chain
  would exhaust every attempt and silently degrade every SMS/CSV/SePay categorization to
  uncategorized — the most likely proximate cause, but unconfirmed since this environment can't
  read the deployed `Gemini:ApiKey` secret or backend logs. (2) A separate, independent bug:
  `POST /extract/photo` never calls the categorization service at all (unlike SMS/CSV), so
  every photo-extracted row is uncategorized by construction regardless of Gemini's health —
  not fixed this round, flagged as a backend follow-up. **Also found**: `real/reports.ts`'s
  `categorizeTransaction`/`overrideCategorization` (AI re-categorize endpoints) have zero UI
  consumers anywhere in the mobile app — no screen offers a manual "re-suggest AI category"
  action on an existing uncategorized transaction (e.g. one that landed uncategorized from
  SePay sync). Not fixed this round either. **Stale docs corrected**: `project-spec.md` and
  `architecture.md` both still claimed photo OCR "always responds 503, `IReceiptOcrService` is
  an intentional placeholder" — that's no longer true (`finviet-be` commit `aff76cc` wired in a
  real Gemini OCR provider); both docs updated to describe the actual current gap (OCR works,
  categorization on that path doesn't) instead. User's chosen scope for this round: report +
  doc correction only — the two code bugs above (photo-extraction categorization gap, missing
  mobile AI-recategorize UI) are follow-up candidates, not implemented. No code changed besides
  these context docs. Not committed/pushed.
- 2026-08-18 — User asked to implement the flagged code bugs. Investigating further before
  writing code surfaced a bigger, always-reproducing root cause than the earlier "occasional
  Gemini failure" framing: `finviet-be`'s `AiClassificationResult` (the DTO `PreviewAsync`
  returns, used by SMS/CSV extraction) only ever carried `CategoryName`/`Confidence`, never a
  `CategoryId` — `ExtractedTransactionItem.CategoryId` was explicitly commented "reserved...
  not populated by the preview." So every SMS/CSV row categorized by the AI path (not an exact
  merchant-rule match) came back with a real category *name* but no *id* — permanently, on
  every successful AI call, not just on provider failures — and the mobile app only ever reads
  `categoryId`. Separately, for SePay-synced transactions, `CategorizeTransactionAsync` only
  writes `txn.CategoryId` when the customer's AI preference mode is `high_confidence_auto`;
  the default (no preference row) is `suggest_only`, so by design the AI produces a confident
  guess (`AiCategoryGuess`) that's never applied — correct-by-design, but with zero mobile UI
  to ever surface or accept the suggestion, so linked-wallet transactions stayed uncategorized
  indefinitely. Confirmed with the user which fixes to do this round (all three): the SMS/CSV
  CategoryId gap, photo-extraction's missing categorization call, and a mobile UI to accept
  AI suggestions.
- 2026-08-18 — Implemented across both repos, on new branches
  (`fix/ai-categorization-suggestions` in both `finviet-mobile` and `finviet-be`, backend off
  `feature/gemini-receipt-ocr` since it already carries the working photo-OCR wiring this fix
  builds on). Not committed/pushed in either repo; not merged. **Backend** (`finviet-be`):
  `AiClassificationResult` gained a `CategoryId` property, resolved in
  `AiCategorizationService.PreviewAsync` from the model's chosen category name against the same
  `expenseCategories` dictionary `CategorizeTransactionAsync` already uses (mirrors that
  method's existing name→id resolution, just applied to the preview path too).
  `TransactionExtractService`'s per-row rule-then-AI logic (previously inlined in
  `BuildResponseAsync`) was extracted into a shared `ApplyCategorizationAsync` helper, now also
  setting `item.CategoryId` from the AI branch (previously only `CategoryName`/`Confidence`). A
  new `ITransactionExtractService.CategorizeItemAsync(customerId, item, ct)` exposes that same
  rule-then-AI logic for a single already-extracted row; `ExtractController.ExtractPhoto` now
  calls it on the OCR result before returning, so photo rows get the same category suggestion
  SMS/CSV rows always got (previously: no categorization call existed for photo at all). Fixed
  two stale doc spots the investigation surfaced: `ExtractedTransactionItem.CategoryId`'s
  "reserved, not populated" comment, and `docs/api-reference.md`'s three remaining "photo OCR
  always 503 / `ocr_not_configured`" lines (already known-stale per the mobile-repo doc fix
  earlier the same day, just not yet corrected in the backend's own docs). Added
  `PreviewAsync_ResolvesCategoryIdFromCategoryName` +
  `PreviewAsync_UnresolvableCategoryName_LeavesCategoryIdNull` to
  `AiCategorizationServiceTests.cs`, and a new `TransactionExtractServiceTests.cs` (5 tests:
  AI-branch CategoryId propagation, rule-precedence-over-AI, AI-exception leaves row
  uncategorized without throwing, income rows skip categorization entirely, and the new
  `CategorizeItemAsync` photo path). Verified: `dotnet build` 0 errors (6 pre-existing warnings,
  none new); `FinViet.Application.UnitTests` 256/256 (249 pre-existing + 7 new), no
  regressions. **Mobile** (`finviet-mobile`): fixed a second, independently-discovered
  contract-drift bug while wiring the new UI — `real/reports.ts`'s
  `CategorizationOutcomeDto`/`toOutcome`/`toSource` only recognized backend source values
  `RULE`/`AI`/`FALLBACK`, but the real backend's `CategorizationOutcome.Source` is
  `MANUAL`/`RULE`/`AI_AUTO`/`AI_SUGGESTION`/`OFF`/`FALLBACK` — every other value was silently
  collapsing to `FALLBACK`, and `applied`/`suggestedCategoryId`/`suggestedCategoryName`/`reason`
  weren't mapped at all, which would have made the new "accept suggestion" UI unable to tell an
  applied result from a pending suggestion. Fixed
  `CategorizationSource`/`AiClassificationResult`/`CategorizationOutcome` in `src/types/ai.ts`
  and the DTO/mapper in `real/reports.ts` to match the backend exactly. Added
  `useCategorizeTransaction`/`useOverrideCategorization` to `useReports.ts` (same
  invalidate-transactions/budgets/AI-derived pattern as the existing transaction mutations,
  exported through the hooks barrel). Added the UI itself to the transaction detail screen
  (`app/(tabs)/transactions/[id].tsx`): when a non-transfer transaction is uncategorized, a
  dashed "Gợi ý danh mục bằng AI" button calls `categorizeTransaction`; an `applied` outcome
  sets the category directly with a confirmation alert, an `AI_SUGGESTION` outcome renders an
  inline suggestion card (category name + confidence %) with Áp dụng/Bỏ qua, and Áp dụng calls
  `overrideCategorization` (which always writes, unlike the suggest_only-gated
  `categorizeTransaction`) to actually apply it. New Vietnamese strings added to
  `transactionDetailData.ts` per the i18n convention. Added 4 new tests to
  `src/services/real/__tests__/reports.test.ts` covering the categoryId passthrough and every
  backend source value (including the "unknown value still falls back to FALLBACK" case).
  Verified: `npm run type-check` clean; `npm run lint` 0 errors (77 pre-existing warnings, same
  set as before this change — the one new warning line is the pre-existing tolerated
  `set-state-in-effect` class firing on a line added inside an already-flagged effect, not a
  new warning category); `npm test` 25/25 suites, 129/129 tests (7 new). No
  physical-device/emulator verification in this environment (none available) — manual
  on-device check of the actual "Gợi ý danh mục bằng AI" flow (both the immediate-apply and
  suggest-then-accept paths) is the user's to do before merging.
- 2026-08-18 — Backend PR opened: `finviet-be` [#67](https://github.com/FinViet-Capstone/finviet-be/pull/67)
  (`fix/ai-categorization-suggestions` → `dev`), carrying only the categorization-fix commit —
  confirmed `feature/gemini-receipt-ocr` (the branch it was cut from) is already an ancestor of
  `origin/dev` via PR #65, so the diff doesn't re-bundle the OCR wiring. Not merged yet.
  User separately reported (with a screenshot of the CSV review screen showing 158/158 rows
  stuck "Chưa phân loại") that once AI categorization actually works, up to 158 sequential
  per-row Gemini calls during CSV extraction need a real loading state — the previous UI only
  showed a small spinner inside the upload button while the whole batch parsed inline on the
  same screen as the wallet/review step. Requested: (1) move CSV review to its own screen, and
  (2) show a proper "AI is categorizing" loading state during extraction. Implemented on
  `fix/ai-categorization-suggestions` (mobile): split `app/(tabs)/entry/csv-import.tsx` down to
  just the file-picker/template/guide screen — `handlePickFile` now only opens the document
  picker and pushes `/(tabs)/entry/csv-review` with `fileUri`/`fileName` route params (same
  pattern `photo.tsx` → `photo-confirm.tsx` already uses for handing off to a review screen).
  New `app/(tabs)/entry/csv-review.tsx` receives those params, calls `extractFromCsv` itself on
  mount, and renders three states: a full-screen "AI đang phân loại giao dịch..." loading view
  (icon + spinner + a "may take a moment for large files" subtext) while the request is in
  flight, an error view with a "Quay lại" button on failure/zero-rows, and — once ready — the
  wallet-picker + preview-list + duplicate-detection + category-picker + import UI that
  previously lived inline in `csv-import.tsx` (moved verbatim: `WalletCard`, `PreviewRow`,
  `ParsedRow`, `suggestCategoryFromMerchant`, `formatVND`, and all the selection/import
  handlers). No backend or hook changes needed — this is purely a screen split. Verified:
  `npm run type-check` clean; changed-file lint 0 errors (2 pre-existing tolerated
  `set-state-in-effect` warnings — the wallet-auto-select effect carried over unchanged, plus
  one new instance of the same tolerated class in the new extraction effect); full `npm test`
  25/25 suites, 129/129 tests (no existing test file covered `csv-import.tsx` before this
  split, matching the untested-navigation-screen pattern `photo.tsx` already has). Not
  committed — user asked to test the mobile change locally before it goes to PR, unlike the
  backend fix above which was explicitly asked to PR straight to `dev`.
- 2026-08-19 — User reported the CSV screenshot from 2026-08-18 (158/158 "Chưa phân loại")
  was reproduced again after merging PR #67. Diagnosed as a pure deploy gap, not a code bug:
  `finviet-be`'s `deploy-render.yml` only deploys on push to `main`, and the categorization
  fix (`79e6d62`/PR #67) was merged into `dev` but hadn't reached `main` yet, so the live
  Render backend the app talks to (`.env.local`/`eas.json`'s `EXPO_PUBLIC_API_BASE_URL`) was
  still running pre-fix code. User merged `dev` → `main` themselves to trigger the deploy.
  Re-testing then surfaced a **new** regression: CSV import now fails outright with "Không đọc
  được file CSV". A user-supplied Sentry share link (`REACT-NATIVE-A`,
  `AxiosError: timeout of 20000ms exceeded`) confirmed the cause: the categorization fix made
  `TransactionExtractService.BuildResponseAsync`'s per-row `foreach` loop call the AI
  classifier once per row, sequentially — for a 158-row file that's up to 158 sequential
  Gemini round trips in one request, blowing past `src/lib/api.ts`'s shared 20s axios timeout
  (`extractFromCsv` had no per-request override). While designing the parallelization fix,
  found a second, more fundamental blocker: `PostgresAiRateLimiter`'s default quota
  (`AiLimitsOptions`: 6 calls/minute, 100/day per customer, no override in either
  `appsettings.json`) applies to the same `"classification_preview"` feature CSV/SMS
  extraction uses — meaning even perfectly parallelized, a large import would still come back
  mostly uncategorized (quickly, instead of via timeout). User chose to give bulk import its
  own separate, higher quota rather than raise the global limit or cap AI calls per import.
  Separately, user proposed letting the customer switch tabs/background the app during
  extraction instead of blocking on the loading screen, with a notify-when-done trigger;
  scoped down (after a feasibility check) to the **light version** — survives tab switches and
  brief backgrounding (the app process staying alive), not a force-quit, which would need
  `/extract/csv` to become a real persisted async job (deferred). Implemented on new branches
  (`fix/csv-extraction-timeout` in `finviet-be`, continuing on `fix/ai-categorization-suggestions`
  in `finviet-mobile`): **Backend** — `PostgresAiRateLimiter` switched from an injected scoped
  `FinVietDbContext` to `IDbContextFactory<FinVietDbContext>` (mirroring `AiTelemetryRecorder`'s
  existing pattern) so it's safe to call concurrently, and now branches its per-minute/per-day
  limit pair on the feature name — new `AiLimitsOptions.BulkImportPerMinute`/`BulkImportPerDay`
  (100/1000) apply only to a new `"classification_batch"` feature key, leaving the existing
  6/100 limits untouched for single-transaction flows. `IAiCategorizationService` gained
  `PreviewManyAsync(customerId, inputs, ct)`, hoisting the once-per-request preference/category-
  catalog DB reads out of the per-row path and running the remaining Gemini calls with bounded
  concurrency (`SemaphoreSlim`, degree 6) via `Task.WhenAll`; each input's failure (AI error or
  hitting the bulk quota) degrades independently, matching the old single-row behavior.
  `TransactionExtractService.BuildResponseAsync` now does a synchronous rule-match pass per row
  first (unchanged precedence), then one batched `PreviewManyAsync` call for whatever's left,
  instead of one `PreviewAsync` call per row; `ApplyCategorizationAsync`/single-row `PreviewAsync`
  are untouched and still serve the photo path (`CategorizeItemAsync`), which doesn't need
  batching at one row. **Mobile** — `extractFromCsv` now passes `{ timeout: 120_000 }` on its
  `api.post` call (matching the convention already used by `reports.ts`'s other slow-AI calls)
  instead of inheriting the shared instance's 20s default; `extractFromPhoto` left alone
  (single-row, no batching risk). For notify-when-done: new `useEphemeralBannerStore` (Zustand)
  + root-mounted `EphemeralBanner` component — deliberately **not** routed through
  `NotificationProvider`'s `AppNotification` queue, since that type/UI is closed over backend
  notification types (`budget_alert|weekly_report|goal_milestone|announcement`) and would have
  needed widening a backend-contract type for a client-only event; new
  `scheduleCsvImportReadyNotification` in `src/lib/notifications.ts` for the backgrounded case
  (`expo-notifications`' `scheduleNotificationAsync` with `trigger: null` — first local-notification
  use in this codebase, previously only push-token registration existed). `csv-review.tsx` tracks
  focus (`useIsFocused`) via a ref (so the async extraction effect reads live focus state at
  resolve time, not mount time) and checks `AppState.currentState`; on completion while
  off-screen, shows the banner (foregrounded elsewhere) or schedules the OS notification
  (backgrounded), covering both success and failure. Added `csvImportReadyRoute` to
  `src/lib/notificationRouting.ts` (a pure `data → Href | null` helper, deliberately placed
  there rather than in `lib/notifications.ts` so routing logic/tests don't pull in the heavy
  `expo-notifications` SDK) — `NotificationProvider`'s response and receive listeners both now
  check it first and skip their generic backend-notification handling for a match, so a local
  notification tap routes straight back to `csv-review` with its original `fileUri`/`fileName`
  instead of falling through to the generic "no pushData → /notifications" fallback. Also
  disabled the header back button while `status === 'loading'` — unlike a tab switch, backing
  out via the stack really does unmount the screen and silently drop the in-flight result under
  this light-version scope. Added 6 new backend tests (`PreviewManyAsync` empty/mode-off/
  ordering/isolation/rate-limit degradation in `AiCategorizationServiceTests.cs`, one multi-row
  batching test in `TransactionExtractServiceTests.cs`, all four pre-existing `ExtractSmsAsync_*`
  tests updated to mock `PreviewManyAsync` instead of `PreviewAsync`) and 4 new mobile tests
  (`csvImportReadyRoute` in `notificationRouting.test.ts`). Verified: backend `dotnet build`
  clean, `FinViet.Application.UnitTests` 262/262 (256 pre-existing + 6 new); mobile
  `npm run type-check` clean, `npm run lint` 0 errors/78 warnings (only the 2 pre-existing
  tolerated `set-state-in-effect` warnings on unchanged `csv-review.tsx` lines), `npm test`
  25/25 suites, 133/133 tests (129 pre-existing + 4 new). No live-backend timing verification or
  physical-device notify-flow check in this environment (none available) — confirming the
  actual wall-clock speedup and the tab-switch/background notify UX end-to-end is the user's to
  do. Backend committed and PR'd: `finviet-be`
  [#69](https://github.com/FinViet-Capstone/finviet-be/pull/69)
  (`fix/csv-extraction-timeout` → `dev`), not merged yet. Mobile left uncommitted, same as the
  CSV-review screen split above — user wants to test the notify-when-done flow on-device first.
- 2026-08-19 — User confirmed AI categorization itself now works after PR #69's fix (screenshot
  of a 3-row CSV import, all correctly categorized), then asked for two UI/data changes on the
  new labeled-field `csv-review.tsx` cards: (1) let the merchant title wrap/grow instead of
  truncating to one line, and (2) flagged a suspicion — from a screenshot with long raw bank-note
  titles like "Thanh toan hoa don tien nuoc SAWACO..." — that a distinct recipient/beneficiary
  name might be getting parsed but silently dropped or merged into that title. Diagnosed via
  `finviet-be` source before proposing anything: confirmed both are possible depending on the
  source file — the app's own 3-column template (`Ngày,Nội dung,Số tiền`) genuinely has no
  separate recipient data (nothing lost), but a fuller bank-statement export with a distinct
  correspondent/beneficiary column *did* have that value momentarily separate in
  `BankStatementRowParser.cs` before being concatenated straight into the single `Note` string
  (`"{description} | Doi ung: {correspondent}"`, `ParsedTransactionDto` had no field to keep it
  structured) — and the header aliases recognized for that column (`"doi ung"`,
  `"correspondent"`, `"beneficiary"`, exact-match only) likely miss common real Vietnamese bank
  header phrasing like "Tên đối tác"/"Người thụ hưởng" anyway. User confirmed wanting the
  robustness fix, since which bank-CSV shape a customer uploads isn't knowable in advance
  ("sao kê" formats differ by bank). Implemented on the same branches as the fix above
  (`fix/csv-extraction-timeout` backend, `fix/ai-categorization-suggestions` mobile — this is a
  continuation of the same CSV-review work, not a new branch): **Backend** — `ParsedTransactionDto`
  gained `CorrespondentName` (`TransactionImportDto.cs`), kept as its own field instead of being
  folded into `Note`, in both `BankStatementRowParser.ParseNamedRow` and
  `ParseLegacyPositionalRow`; `CorrespondentAliases` broadened (`doi tac`, `thu huong`,
  `nguoi nhan`, `nguoi gui`, `doi tuong giao dich`, `ten khach hang doi ung`) and — since bank
  header phrasing varies far more than date/description/amount headers do — switched from exact
  header-string equality to substring matching (`IsCorrespondentHeader`) for this one column, so
  e.g. "Tên đối tác giao dịch" still resolves via the "doi tac" substring without every exact
  bank phrase needing to be enumerated. `TransactionExtractService.BuildResponseAsync` now sets
  `Merchant`/`Description` from genuinely separate values (`Merchant = CorrespondentName ??
  Note`, `Description = Note`, versus both being the same `Note` string before), and combines
  both texts for rule-matching/AI-categorization input (`"{Note} {CorrespondentName}"`) so
  categorization quality doesn't regress now that the two are stored separately instead of
  pre-merged. Updated the one existing test that asserted the old merged-into-Note string, and
  added 5 new backend tests (correspondent kept separate, absent-correspondent leaves the field
  null, 4 header-variant cases proving the substring match) plus 1 new
  `TransactionExtractServiceTests.cs` test proving Merchant/Description end up genuinely distinct
  while categorization still sees both. **Mobile** — `CsvExtractionRow`/`toCsvRow()` gained a
  `description` field alongside `merchant`; `csv-review.tsx`'s `ParsedRow` and its mapping carry
  a `description` only when it's genuinely different from `merchant` (most rows still have none);
  `PreviewRow` shows it as a new "Nội dung" labeled field between Số tiền and Danh mục, only when
  present — most CSV rows show exactly what they did before. Also removed the merchant title's
  `numberOfLines={1}` truncation and switched the top row from center- to top-alignment so a
  wrapped multi-line title still looks right against the checkbox/duplicate badge. Verified:
  backend `dotnet build` clean, `FinViet.Application.UnitTests` 268/268 (262 pre-existing + 6
  new); mobile `npm run type-check` clean, `npm run lint` 0 errors/78 warnings (same 2
  pre-existing tolerated `set-state-in-effect` warnings as before, line numbers only shifted),
  `npm test` 25/25 suites, 133/133 tests (unchanged count — no new mobile test file for this
  purely presentational change). User confirmed committing the backend side; discovered PR #69
  had already been merged into `dev` by then (local `dev` branch had drifted to it mid-session),
  so this landed as a new branch/PR instead of an addition to #69: `finviet-be`
  [#71](https://github.com/FinViet-Capstone/finviet-be/pull/71) (`fix/csv-correspondent-name` →
  `dev`), not merged yet.
- 2026-08-19 — Committed and PR'd the mobile side of this whole branch (AI category suggestions,
  the CSV import/review rework, notify-when-done, and the CSV review redesign), split into three
  commits on `fix/ai-categorization-suggestions`: `feat: let users accept AI category suggestions
  on uncategorized transactions`, `refactor: split CSV import into upload/review screens, speed
  up categorization, add notify-when-done`, and `docs: update feature context notes`. PR'd as
  `finviet-mobile` [#41](https://github.com/FinViet-Capstone/finviet-mobile/pull/41) →
  `dev`, not merged yet.

---

Feature: Collapsible transaction calendar (mobile-only, branch
`fix/collapsible-transaction-calendar`). User reported the transaction-history list at the
bottom of the Transactions screen was too small to scroll — the full month calendar grid inside
the screen's sticky header (month nav + summary banner + calendar) always rendered every week
row, so on 5–6-week months it consumed most of the viewport and left almost no room for the
history list below.

## Status

Implemented and PR'd — `npm run type-check` clean; `npm run lint` 0 errors/warnings on both
changed files; `npm test` 25/25 suites, 135/135 tests. No physical-device check in this
environment (none available) — confirming the collapse/expand feel on-device is the user's to
do. Committed and pushed: `fix: let calendar collapse to give transaction history more room`.
PR'd as `finviet-mobile` [#44](https://github.com/FinViet-Capstone/finviet-mobile/pull/44) →
`dev`, not merged yet.

## Notes

- `TransactionCalendar` (`src/components/transaction/TransactionCalendar.tsx`) gained
  `expanded`/`onToggleExpanded` props: collapsed renders only the week row containing the
  selected day (falling back to today's week, then the first week), instead of all weeks: less
  vertical space, same day-selection/navigation behavior. A chevron handle
  (`expand_less`/`expand_more`, same icon pair `CategoryBucketCard` already uses for its own
  expand/collapse rows) below the grid toggles it.
- `app/(tabs)/transactions/index.tsx` owns `calendarExpanded` state (default `true`, matching
  prior always-expanded behavior) and animates the toggle with `LayoutAnimation.easeInEaseOut`
  (no reanimated dependency needed since visible row count, not just height, changes between
  states) — first use of `LayoutAnimation` in this codebase; the Android
  `setLayoutAnimationEnabledExperimental` enable-call is a harmless no-op under the New
  Architecture (default since Expo SDK 54), kept for older-device safety.

---

Feature: CSV import data loss + AI categorization pipeline fixes (cross-repo,
branch `fix/csv-import-pipeline` in both repos; backend branch same name). Started
from "what scalability metrics exist for the AI pipeline" (none did), which led to
finding and fixing a `classification_preview` rate-limit bug (5.3% success rate,
now deployed via `finviet-be` PR #77). Live-testing that fix with a real 138-row
Vietcombank CSV then surfaced three symptoms: all rows uncategorized, saved
transactions missing merchant/description despite the review screen showing them
correctly, and the suggest-category button failing 100%. Root cause of the 138/138
failure turned out to be a settings toggle (`categorization_mode = 'off'` on that
account, unrelated to any code) — but the investigation found four real,
independent defects underneath it that would have hit regardless: the backend
silently drops `Merchant`/`Description` on every created transaction; the bulk
CSV/SMS rate limit (100/min) is smaller than a routine import; unresolved
categorizations fail with zero telemetry; and the app can't distinguish "AI is
turned off" from "AI tried and failed."

## Status

Backend (`finviet-be`) implemented and verified: `dotnet build` clean,
`FinViet.Application.UnitTests` 291/291 (287 pre-existing + 4 new). Mobile
implemented and verified: `npm run type-check` clean, `npm run lint` 0 new (78
pre-existing warnings untouched), `npm test` 25/25 suites, 135/135 tests. Both
repos committed and PR'd to `dev` this session — see commit/PR links added when
this entry was written. Not merged/deployed yet.

## Goals

- `csv-review.tsx`: send `description` (was hardcoded `null`, silently dropping
  data the review screen itself displayed) and `aiSource`/`aiConfidence` (new,
  tracked via a `categorySource` field on `ParsedRow` — `'ai'` when the backend's
  extraction suggestion is used unedited, `'client_rule'` for the client-side
  merchant-rule fallback, cleared to `null` the moment the user manually picks a
  category) so the backend can write a categorization-decision audit record.
- Import loop now continues past a failed row instead of aborting on the first
  error, and reports a real "`N` imported, `M` failed" summary with per-row
  reasons instead of a single opaque alert.
- `app/(tabs)/transactions/[id].tsx`: the "Gợi ý danh mục bằng AI" button now
  checks `outcome.source === 'OFF'` (a value the backend already returned for
  this case, just never distinguished client-side) and shows "AI categorization
  is turned off" with a direct link to `/settings/ai-preferences`, instead of the
  generic "AI couldn't find a category" message that was actively misleading for
  this case.
- `CreateTransactionInput`/`real/transactions.ts`: two new optional wire fields,
  `aiSource`/`aiConfidence`, passed straight through to the backend.

## Notes

- The backend side of this fix (merchant persistence, the new
  `categorization_decision` audit log reusing `ai_audit_events`, the bulk rate
  limit raise, and silent-failure logging) is the larger half of this change —
  see `finviet-be/context/current-feature.md` for the full breakdown, since most
  of the actual defects were backend-side.
- No mobile UI change for the merchant/description fix itself beyond the one
  `csv-review.tsx:312` line — the backend was silently discarding a field the
  client was already sending correctly.
- No physical-device verification in this environment; confirming the on-device
  suggest-button/settings-link flow and a real CSV re-import is the user's to do.
