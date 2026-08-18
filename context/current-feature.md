# Current Feature

<!-- Feature name and short description -->
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
