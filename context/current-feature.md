# Current Feature

<!-- Feature name and short description -->
Feature: reliable notification delivery with foreground in-app banners, background/terminated
OS push, unread visibility, and exact entity deep links.

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
- Mark a notification read and deep-link to its exact goal, budget, report, or wallet when either
  the in-app banner or OS notification is tapped; fall back to Notification Center for invalid or
  unsupported targets.
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
