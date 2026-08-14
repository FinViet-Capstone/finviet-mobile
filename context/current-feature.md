# Current Feature

<!-- Feature name and short description -->
Fix: complete saving-goal archive verification by netting withdrawals in Savings progress,
keeping dashboard percentages bounded, and preserving both transaction directions in Calendar.

## Status

<!-- Not Started | In Progress | Completed -->
Completed — implementation and post-merge verification passed on branch
`fix/saving-goal-archive-navigation`; physical-device acceptance remains pending.

## Goals

<!-- Goals and requirements -->
- Stop the Budgets tab from retaining a saving-goal detail route after the user leaves the tab;
  Back actions and successful archive navigation use explicit destinations instead of relying on
  incidental nested-stack history.
- A goal with money cannot be archived. The user must first use the existing withdrawal flow and
  choose the basic wallet that receives the entire remaining amount.
- After the balance reaches zero, DELETE archives rather than reverses financial activity. The
  backend preserves contribution/withdrawal ledger rows and their transactions; archived goals
  appear in a collapsed `Đã lưu trữ` section with read-only detail/history.
- Prevent the white 404 retry screen after archive by updating the active and archived caches
  before dismissing the detail route, without refetching the just-archived active resource.
- Align nullable deadlines, icon/deletion/timestamps, archived queries, 404 handling, encoded
  path IDs, PATCH semantics, and in-flight idempotency keys across mock and real services.
- Cover the regressions with focused tests. Restore/unarchive, permanent purge, fixed-wallet
  reassignment, and deadline clearing remain out of scope.

## Notes

<!-- Any extra notes -->
- Cross-repo backend work is on `D:/SEP490/newestbe/finviet-be`, branch
  `fix/saving-goal-archive`, based on the clean committed Gemini feature state.
- `hd.env.local` is an untracked review input only and must remain uncommitted.
- No commit, push, merge, or branch deletion without explicit permission.
- 2026-08-14 — Started after tracing the post-delete 404 to broad `goals.all()` invalidation
  while the deleted detail remained mounted. Backend source confirmed DELETE physically reversed
  wallets and removed transactions/ledger; approved replacement is zero-balance soft archive plus
  read-only archived-goal history.
- 2026-08-15 — Physical-device follow-up implemented: Savings progress now subtracts saving-goal
  withdrawal income and clamps at zero; the Home percentage badge/bar clamp to 100%; the real
  transaction service fetches every backend page at the supported 100-row size; Calendar retains
  separate gross income/expense traces; and saving-goal withdrawal rows have direction-correct copy.
  Added focused tests for derivation, display bounds, pagination, Calendar aggregation, and row
  visuals. Verification: TypeScript clean; changed-file ESLint clean (pre-existing warnings only);
  13 Jest suites / 87 tests pass; mobile and backend `git diff --check` clean. Backend Application
  tests pass 200/200 and the solution plus integration-test project compile. Live integration and
  physical-device acceptance remain pending; no commit, push, deployment, or database operation run.
- 2026-08-15 — Fixed the next physical-device findings: archive-triggered `Rút toàn bộ` now waits
  for the native alert interaction to finish before mounting the sheet, displays mutation failures
  without closing the sheet, retains the pending/idempotency single-flight guard, and advances a
  successful full withdrawal to the existing explicit archive confirmation. Calendar now derives
  complete seven-cell weeks and renders each week as a fixed flex row, so Sunday cannot wrap out of
  its column; August 2026 places day 1 under Saturday and day 2 under Sunday. Added focused tests for
  full/partial/error withdrawal outcomes, duplicate in-flight calls, Saturday/Sunday alignment,
  Sunday-start months, and trailing week cells. Verification: TypeScript clean; changed-file ESLint
  has 0 errors / 4 pre-existing warnings; `npx eslint app src` has 0 errors / 87 pre-existing
  warnings; focused tests pass 9/9; the restricted full suite passes 14 suites / 94 tests; and
  `git diff --check` is clean. An unrestricted related-test command also traversed stale
  `.claude/worktrees` and failed only against their obsolete duplicate goal tests; the workspace-
  restricted suite above passed the current source. iOS/Android physical-device acceptance remains
  pending; no deployment, database operation, or protected environment-file change run.
- The merged `dev` registration/Sentry diagnosis and Maestro work remain preserved in History. The
  registration fix was verified against the deployed `/api` route, and Sentry initialization was
  consolidated so explicit captures no longer depend on an unset-only configuration path.
- 2026-08-15 — Merged latest `origin/dev` into the saving-goal branch and resolved the three
  conflicts by retaining archived-goal/navigation/withdrawal behavior together with `dev`'s goal
  mutation error feedback, accessibility label, registration/Sentry changes, onboarding allocation
  controls, and Maestro flows/history. Post-merge verification: TypeScript clean; resolved goal-file
  ESLint clean; `npx eslint app src` has 0 errors / 86 pre-existing warnings; restricted Jest passes
  14 suites / 94 tests; staged and working-tree `git diff --check` clean.

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
