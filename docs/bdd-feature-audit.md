# FinViet — BDD Feature Audit (as a Vietnamese User)

_Date: 2026-08-08 · Persona: **Linh**, 21, university student, first time managing her own money,
transacts via MoMo/bank apps, low financial literacy · Mode: `EXPO_PUBLIC_USE_MOCK=true`
(current `.env.local` setting — no live .NET/Gemini backend needed)_

## Fixed / resolved since this audit (2026-08-08)

- **Savings-goal deletion silently lost money** — `addGoalContribution` now honors the
  wallet picked in the contribution sheet, and `deleteGoal` reverses any contribution with a
  transaction regardless of `goal.fundingWalletId`. Regression-tested (`goals.test.ts`).
- Wallet create/transfer no longer swallow save errors silently (Alert on failure).
- Mock `createWallet` now rejects duplicate names; `deleteWallet` blocks deleting your last wallet.
- `SetLimitSheet`'s non-functional per-wallet budget-scope picker removed (Budget has no
  wallet field in the data model — the control did nothing).
- Onboarding income step now requires a value > 0 before continuing.
- Theme preference now persists across logout/login (mock backing store); `notifications.tsx`
  migrated off hardcoded dark-only colors to `useThemeColors()`. (Onboarding and the auth
  screen still hardcode dark colors — see item 12, still open.)
- Subscription screen's "Thanh toán an toàn" copy replaced — it no longer implies a real
  payment guarantee for a flow with zero payment integration.
- Score detail screen now respects the weekly/monthly toggle set on Home instead of
  hardcoding "weekly".
- Weekly report's "Hỏi AI Cố vấn" CTA now opens the real chat sheet instead of routing to a
  nonexistent `/advisor` screen.
- SePay linking now fails fast with a clear Vietnamese message when the backend isn't
  configured, plus a proactive mock-mode notice, instead of a generic network error. (The
  underlying architecture — SePay always calling the real backend regardless of `USE_MOCK` —
  is intentional and unchanged; only the messaging was fixed.)
- **Category requests removed from all docs.** This was never a "missing feature to build" —
  it's a feature the team decided against months ago (no admin-approval UI ever existed) that
  stale docs kept describing as shipped. `context/project-spec.md` and `context/architecture.md`
  no longer mention it; `docs/integration-status.md` was deleted from the repo entirely. Do not
  reintroduce this feature.
- **Data export is now real.** `DataExportScreen` builds an actual CSV from the selected date
  range's transactions (with a UTF-8 BOM so Excel renders Vietnamese correctly) and shares it
  via `expo-sharing`, instead of a fake "exporting..." alert. The summary line now shows the
  real transaction count instead of a fabricated estimate.
- **CSV import now reads a real file.** `csv-import.tsx` uses `expo-document-picker` to pick an
  actual `.csv` file, then a header-based parser (date/description/amount or debit/credit
  columns, Vietnamese-diacritic-insensitive header matching) replaces the old hardcoded 5-row
  demo. Category suggestions now come from the customer's real saved merchant rules
  (`getRules()`), and duplicate detection checks against real existing transactions instead of
  one hardcoded flagged row. The "Tải file mẫu .csv" button now actually generates and shares a
  sample file matching the parser's expected format. This is a lightweight heuristic parser for
  the common single-sheet bank/e-wallet export shape — not a full spreadsheet/AI parser, and
  unsigned single-amount columns default to "expense" when the source has no sign to read.
- **Category deactivation removed entirely.** It was a data-layer function
  (`deactivateCustomerCategory`) with zero UI entry point, a no-op against the real backend,
  and no reactivation path at any layer — not a feature worth finishing. Removed from mock,
  real, and the barrel; `CustomerCategory.isActive` dropped from the type.

Remaining items below (mostly mock-data realism for the AI/SMS/photo layers, plus a few
smaller rough edges) were deliberately left for a separate pass — see the conversation that
produced this audit for scope reasoning.

## Methodology

This is a **Behavior-Driven Development (BDD)** pass: every feature is expressed as
`Given/When/Then` scenarios from a real user's perspective, then checked against what the
code actually does — not what the docs or UI copy claim it does.

**Important caveat:** this is a code-reading walkthrough, not a live device/simulator run.
No Android emulator or iOS simulator was available in this environment, and the app has no
web target (`react-native-web`/`react-dom` aren't installed — it's mobile-only by design, per
`context/architecture.md`). Every scenario below is traced through the actual TypeScript
source (screens → hooks → mock service layer) and cites `file:line`, but purely visual/gesture
feel (animation smoothness, drag-and-drop hit-testing) could not be confirmed by eye.

**What was run for real**, as a baseline (2026-08-08, after the fixes above):

| Check | Result |
|---|---|
| `npm run type-check` (`tsc --noEmit`) | ✅ 0 errors |
| `npm run lint` (`eslint .`) | ✅ 0 errors, 86 warnings (80 original + 6 justified `require()` calls in the goals regression test; mostly `react-hooks` compiler-readiness rules, intentionally downgraded per `eslint.config.js`) |
| `npm test` (`jest`) | ✅ 59/59 passing across **7 test suites** (formatters, mmkv token storage, API interceptors, one auth type test, mock auth service, mock goals service). Wallets, transactions, budgets, categories, CSV parsing, and the AI/report/chat layer still have **zero** automated test coverage. |

---

## 1. Auth, Onboarding & Settings

### Register / Login
```gherkin
Scenario: Linh registers with a fresh email
  When she submits an unused email + "Password123"
  Then she lands on email verification with onboardingDone:false (src/services/mock/auth.ts:78-84)
  → WORKS

Scenario: Linh mistypes her password
  Then she sees "Email hoặc mật khẩu không chính xác" (src/types/auth.ts:47)
  → WORKS

Scenario: Linh picks a password that looks fine client-side but the "server" rejects
  Given zod's regex passes ("Password123") but the mock still throws weak_password (auth.ts:75)
  → WORKS — good demonstration of defense-in-depth (client validation isn't trusted alone)

Scenario: Linh registers with an email that's already taken
  Then "Email này đã được sử dụng..." (auth.ts:74)
  → WORKS
```

### Google OAuth
```gherkin
Scenario: Linh taps "Đăng nhập với Google" (mock mode)
  Then a synthetic "google.user@gmail.com" session is created (mock/auth.ts:97-113) — no real Google picker
  → PARTIAL (fake handshake)

Scenario: Same tap against the real .NET backend (USE_MOCK=false)
  Then the button is hidden entirely, and if forced, throws "Đăng nhập Google chưa khả dụng..." (real/auth.ts:39-42)
  → MISSING — stubbed, not implemented; needs Firebase + a custom dev build
```

### Forgot password / verify email
All flows — request code, wrong 6-char code, 60s resend cooldown, auto-login after reset —
**WORK** (`app/(auth)/forgot-password.tsx:49,101-122,172-308`; `app/(auth)/verify-email.tsx:42,63-77`).

### Onboarding
```gherkin
Scenario: Linh tries to skip entering her income
  Given the "Tiếp theo" button is now disabled until a positive amount is entered
  (src/components/onboarding/OnboardingIncome.tsx)
  → RESOLVED — was PARTIAL (no validation gate, possible onboardingDone divergence), now fixed

Scenario: Linh expects to customize her categories at step 3
  Given ONBOARDING_STEPS/CATEGORY_GROUPS still describe a "categories" step (src/data/onboardingData.ts:1-7)
  Then step 3 actually renders a persona (name/gender/DOB) form instead (app/onboarding.tsx:124-135) — categories are silently auto-seeded on finish
  → MISSING (still open) — dead data left over from a since-replaced onboarding step
```

### Settings
```gherkin
Scenario: Linh switches to Light theme
  Then settings/index.tsx and notifications.tsx now repaint correctly (both migrated to useThemeColors())
  But onboarding and the auth screen still hardcode dark-only COLORS
  → PARTIAL (still open, narrower than before) — theme preference IS now persisted across logout
  (src/hooks/useCustomer.ts), and notifications.tsx is fixed; onboarding/auth screens remain

Scenario: Linh edits her budget allocation for next month
  Then current month is locked (🔒), next month is editable with proportional slider redistribution (settings/budget-allocation.tsx:161-183)
  → WORKS — genuinely thoughtful "changes apply next month" model

Scenario: Linh exports her transaction history
  Given she picks a date range and taps "Xuất dữ liệu"
  Then a real CSV is generated from her actual transactions for that range and handed to the
  OS share sheet via expo-sharing (DataExportScreen.tsx)
  → RESOLVED — was BROKEN (fake alert, no file), now a real feature

Scenario: Linh upgrades to Premium
  Then in-memory state flips to premium with zero payment flow (subscriptions.ts:94-120); the
  copy now honestly says "Bản demo — chưa thu phí thật" instead of a misleading trust badge
  → RESOLVED (copy) — the underlying no-op payment flow is unchanged, which is fine since it's honestly labeled now

Scenario: Linh deletes her account
  → WORKS (delete-account.tsx:14-17)
```

### Notifications
Tapping a budget alert, goal milestone, or weekly-report notification routes correctly and
marks-read first (`app/notifications.tsx:96,180-184`); an announcement (no linked entity)
correctly no-ops instead of crashing (`notifications.tsx:98-99`). **All WORK.**

---

## 2. Wallets, Transfers & Bank Linking (SePay)

```gherkin
Scenario: Linh creates a wallet named "Tiền mặt" — a name that already exists
  Given mock createWallet now rejects a duplicate name (case/whitespace-insensitive) with a
  Vietnamese Alert (mock/wallets.ts, app/(tabs)/wallets/create.tsx)
  → RESOLVED — was PARTIAL (silently allowed), now blocked with feedback

Scenario: Linh's wallet-create request fails
  Given create.tsx now wraps the save in try/catch and shows an Alert on failure
  → RESOLVED — was BROKEN (silent failure)

Scenario: Linh deletes her only wallet
  Given mock deleteWallet now blocks deleting your last remaining wallet, matching the
  Vietnamese error copy that already existed for this case
  → RESOLVED — was PARTIAL (copy existed, mock didn't enforce it). Deliberately NOT also
  guarding on "has transactions" — that would break the intentional soft-delete design where a
  deleted wallet's past transactions keep working (see "Ví đã xóa" fallback, transactions/index.tsx:224)

Scenario: Linh transfers ₫200,000 between two wallets
  Then both balances update atomically and correctly (mock/transactions.ts:1505-1550)
  → WORKS

Scenario: Linh tries to transfer to the same wallet or over her balance
  Then both are structurally/UI-blocked before submit (transfer.tsx:50,101-121,152)
  → WORKS

Scenario: Linh's transfer request fails server-side
  Given transfer.tsx now wraps the save in try/catch and shows an Alert on failure
  → RESOLVED — was BROKEN (silent failure)

Scenario: Linh taps "SePay" to link her bank account (mock mode)
  Given SePay linking still imports straight from src/services/real/sepay.ts, bypassing
  USE_MOCK entirely — that architecture is intentional (an OAuth/token flow can't be
  meaningfully mocked) and unchanged
  When the backend isn't configured (empty EXPO_PUBLIC_API_BASE_URL)
  Then she now sees a specific "chưa cấu hình máy chủ thật" message before any request is
  attempted, plus a proactive banner in mock mode explaining this feature needs a real backend
  → RESOLVED (messaging) — was BROKEN (generic unhelpful error); the mock-bypass architecture
  itself is unchanged by design (see Cross-Cutting notes)

Scenario: Linh syncs an already-linked wallet
  Given no mock wallet can ever be type 'linked' (mock/walletStore.ts seeds only 'basic')
  → MISSING (still open) — this path is entirely untestable/dead in mock mode
```
Also found (still open): `app/link-sepay.tsx` (the OAuth2 WebView flow) is **orphaned** —
nothing in the app navigates to it anymore; only `/link-sepay-token` is wired
(`wallets/index.tsx:192-197`).

---

## 3. Transaction Entry & AI Categorization

```gherkin
Scenario: Linh manually enters an expense larger than her wallet balance
  Then "Số dư ví không đủ" blocks the save (manual.tsx:166-169)
  → WORKS

Scenario: Linh pastes a real, messy SMS — "Nap Lien Quan 50k"
  Given mock extractFromSMS(_text) ignores its argument completely
  Then she ALWAYS gets "Grab Food, 125.000đ" back, regardless of what she pasted
  → BROKEN (still open) — not a parser, a fixed canned response; no backend SMS-extraction
  substitute exists client-side, unlike CSV import which now has a real client-side parser

Scenario: Linh scans 5 different receipts
  Given mock extractFromPhoto(_uri) ignores the image and always returns "Circle K, 85.000đ"
  Then all 5 rows come back identical and get flagged as duplicates of each other
  → BROKEN (still open) — confirmed mock-only, and permanently so: no backend OCR endpoint
  exists at all (per real/extraction.ts), and OCR isn't something the FE alone can fake usefully

Scenario: Linh imports a CSV of her bank transactions
  Given csv-import.tsx now uses expo-document-picker to select a real file, reads it with
  expo-file-system, and parses date/description/amount columns (or debit/credit columns) with
  Vietnamese-diacritic-insensitive header matching
  Then her actual file's rows are parsed, category-suggested from her saved merchant rules, and
  checked for duplicates against her real transaction history
  → RESOLVED — was BROKEN (no file picker, 5 hardcoded demo rows always). This is a pragmatic
  heuristic parser for common single-sheet exports, not a full spreadsheet/AI parser — a file
  with unrecognized headers surfaces a clear "no date/amount column found" error instead of
  silently producing garbage rows

Scenario: Linh taps "Tải file mẫu .csv" to see the expected format
  Then a real sample CSV (matching the parser's expected columns) is generated and shared
  → RESOLVED — was BROKEN (no onPress handler at all, a dead button)

Scenario: Linh deletes a transfer transaction
  Then both legs delete and both wallet balances reverse correctly (mock/transactions.ts:1477-1486)
  → WORKS

Scenario: Linh overrides a category on an already-saved transaction
  Then she's offered "Tạo quy tắc cho [merchant] → [category]?" and accepting retroactively re-labels every past transaction from that merchant (transactions/[id].tsx:134-153; mock/rules.ts:46-61)
  → WORKS — real "teaching" happens here

Scenario: Linh overrides a category during initial entry (manual/SMS/CSV/photo review)
  Given none of those four screens ever call useCreateRule
  → PARTIAL/MISSING (still open) — the "AI learns from you" promise only applies after the
  fact, not at the moment of correction
```

---

## 4. Categories, Budgets & Savings Goals

```gherkin
Scenario: Linh drags a category from Wants into Savings (and back)
  Given the old savings-bucket lock is confirmed removed — "never actually enforced server-side either" (customerCategories.ts:8-9)
  Then it moves freely in both directions, for system AND custom categories
  → WORKS
  (Note: stale doc comments and a dead canMove flag still describe the old lock — still open,
  low-risk cleanup item — customerCategories.ts:4, CategoryBucketCard.tsx:32)

Scenario: Linh wants to request a category the app doesn't have
  → RESOLVED — this is not a gap to fill: the feature was deliberately removed months ago and
  never had an admin-approval UI. Docs corrected, not the code (see "Fixed / resolved" above).

Scenario: Linh wants to hide a category she never uses
  → REMOVED (2026-08-08) — `deactivateCustomerCategory` and `CustomerCategory.isActive` no
  longer exist anywhere (mock, real, or the type). It was a data-layer function with no UI
  entry point, a no-op on the real backend, and no reactivation path — not worth finishing, so
  it was deleted instead. There is now no way to hide a category, by design.

Scenario: Linh sets a ₫2,000,000 food budget and spends past 80% of it
  Then the bar/percentage flip to danger-red live, no refresh needed (mock/budgets.ts:37-76; budgets/index.tsx:203-208)
  → WORKS

Scenario: Linh picks a specific wallet as a budget's "scope" in the limit sheet
  Given SetLimitSheet's wallet-scope picker has been removed entirely
  → RESOLVED — was BROKEN (cosmetic control, silently discarded); removed rather than wired
  through, since Budget has no wallet field in the data model at all

Scenario: Linh checks whether she's "ahead" or "behind" pace for the month
  Given the visible pacing banner correctly uses her actual configured needs/wants/savings % (budgets/index.tsx:159-166; mock/incomeAllocation.ts)
  → WORKS — the previously-documented "hardcoded 50/30/20" issue is fixed for the screen users actually see
  (A second, richer ahead/on_track/behind engine, getBudgetBuckets, still exists but is dead/unused code — and it has a latent bug: it buckets spend by each category's global default bucket, not the customer's dragged-to bucket, unlike the one actually in use. Still open — a landmine if someone wires it up later without fixing that.)

Scenario: Linh creates a "Mua laptop" goal and contributes ₫500,000 from a wallet with only ₫300,000
  Then "Số dư ví không đủ (Hiện có: 300.000đ)" blocks it, both client- and server-side (goals/[id].tsx:52,130,133; mock/goals.ts:287-292)
  → WORKS

Scenario: Linh deletes a goal she already contributed to
  Given addGoalContribution now honors the wallet picked in the contribution sheet
  (input.fundingWalletId), and deleteGoal reverses any contribution with a transaction
  regardless of goal.fundingWalletId
  → RESOLVED — was BROKEN and the most serious bug found in this audit (money silently
  vanished on delete). Regression-tested in goals.test.ts.

Scenario: Linh checks her "Lịch sử đóng góp" (contribution history) on a goal
  Given getContributionsByGoalId is fully implemented but never called by any screen
  Then she always sees a hardcoded "no history" placeholder regardless of real contributions (goals/[id].tsx:380-383)
  → MISSING (still open)
```

---

## 5. AI Spending Score, Weekly Report & Finance Advisor Chat

This remains the feature area with the largest gap between **appearance** and **reality**.
Under mock mode, the AI *content* is still static, disconnected from the user's own
transactions — that's inherent to running without a backend/Gemini call and was out of scope
for this pass (fixing it means either real backend integration or a much deeper mock
rewrite). What *was* fixed here were two independent UI bugs unrelated to the mock/real split:

```gherkin
Scenario: Linh checks her weekly Spending Score
  Then she always sees score=72/green, from a fixed object, regardless of her real transactions (mock/reports.ts:14-31,150-152)
  → BROKEN (still open, mock-data realism)

Scenario: Linh toggles to "Tháng" (monthly)
  Then the score instantly jumps 72→54 — she's just switched to the OTHER fixed object (mock/reports.ts:34-50), not triggered a recalculation
  → BROKEN (still open, mock-data realism)

Scenario: Linh opens the score detail screen after viewing "Tháng" on Home
  Given the active view (weekly/monthly) is now passed as a route param and read on the detail screen
  → RESOLVED — was BROKEN (state-loss bug, independent of mock/real), now fixed

Scenario: Linh looks for a budget/savings/spending-spike breakdown on the score screen
  Then there is no structured sub-score UI at all — those numbers only exist inside a paragraph of prose text (score.tsx:99-124)
  → PARTIAL (still open)

Scenario: Linh opens this week's AI report on today's date (Aug 2026)
  Then it narrates the week of 11–17 May 2026 — three months stale — and "refreshing" it only bumps the timestamp to now while the body text stays frozen in May (mock/reports.ts:56-74,246-249)
  → BROKEN (still open, mock-data realism)

Scenario: Linh taps "Hỏi AI Cố vấn" at the bottom of the weekly report
  Then it now opens the real AIChatbotSheet instead of routing to a nonexistent screen
  → RESOLVED — was BROKEN (dead link)

Scenario: Linh asks the chatbot "Tháng này tôi tiêu bao nhiêu cho ăn uống?"
  Then after a fake 900ms "thinking" delay she gets: 'Đây là phản hồi mẫu cho câu hỏi "...". Kết nối backend để nhận phân tích tài chính thực tế.' — the mock explicitly tells her to go connect a real backend
  → BROKEN (still open, mock-data realism)

Scenario: Linh opens a brand-new account with zero transactions
  Then Home correctly hides the score card behind a "Chưa đủ dữ liệu" CTA instead of showing a fake number (home/index.tsx:193-216)
  But score.tsx and weekly.tsx's well-written empty states can never actually be reached, because the mock functions never return null (mock/reports.ts:150-156)
  → PARTIAL (still open) — good defensive design on Home, undermined by mock data that can't exercise it
```

---

## Cross-Cutting: Documentation vs. Reality

- ~~Category requests were documented as a shipped, backend-wired feature~~ — **resolved**:
  never existed anywhere in this codebase; docs corrected, `docs/integration-status.md` deleted.
- ~~Category deactivation existed as an unreachable data-layer function~~ — **resolved**:
  removed entirely rather than given a UI, since it was also a no-op on the real backend with
  no reactivation path.
- **SePay bank-linking bypasses `USE_MOCK` entirely**, unlike every other domain in the
  service barrel — **by design**, and now clearly messaged (see §2). A developer testing "in
  mock mode" now gets an explicit banner instead of discovering this by hitting a cryptic error.
- **Stale in-code comments** (`useCustomerCategories.ts:4`) still describe the removed
  savings-bucket lock, and a dead `canMove` flag (`CategoryBucketCard.tsx:32`) is a vestige of
  it — still open, low risk today, but exactly the kind of stale doc that causes a future dev
  to "fix" a non-bug or miss a real one.
- **Onboarding's step data (`src/data/onboardingData.ts`) describes a step that was replaced**
  (category customization → persona form) but was never deleted — still open, dead weight that
  misleads anyone reading the onboarding code cold.

---

## ✅ What's Great

1. **Defense-in-depth validation** — client-side zod checks are backed by independent
   server-side (mock) rejection logic, e.g. a password that passes the regex can still be
   rejected as `weak_password` (`src/services/mock/auth.ts:75`).
2. **Atomic, correct money movement** — wallet transfers and transfer-pair deletions update
   both legs' balances together with no observed drift (`src/services/mock/transactions.ts:1477-1486,1505-1550`).
3. **Honest, thoughtful empty/guard states** — Home hides the Spending Score behind a friendly
   CTA for new users instead of showing a fake number (`app/(tabs)/home/index.tsx:193-216`);
   the savings-goal contribution sheet locks the numpad entirely for a zero-balance wallet
   instead of letting you type and then error (`goals/[id].tsx:139,195-199`).
4. **Real "AI learns from you" behavior** — overriding a category on a saved transaction
   offers to create a merchant rule and retroactively re-labels every past transaction from
   that merchant, with a count shown back to the user (`transactions/[id].tsx:134-153`,
   `src/services/mock/rules.ts:46-61`); the new CSV importer reuses these same saved rules for
   category suggestions instead of inventing a separate mechanism.
5. **A budgeting model that respects the calendar** — budget-allocation changes lock the
   current month and only take effect next month, with proportional slider redistribution so
   percentages always sum to 100 (`app/settings/budget-allocation.tsx:161-183`).
6. **A deterministic test harness for every auth error path** — magic emails
   (`taken@…`, `weak@…`, wrong-password) make every failure state reproducible without a real
   backend (`src/services/mock/auth.ts:1-18`).
7. **Bucket-level budget pacing genuinely reflects the user's real allocation settings**,
   not a hardcoded 50/30/20 split, for the screen users actually see
   (`app/(tabs)/budgets/index.tsx:159-166`, `src/services/mock/incomeAllocation.ts`).
8. **Well-copywritten, honest Vietnamese throughout**, including disclaimers like the weekly
   report's "Nội dung có thể chưa hoàn toàn chính xác" footnote
   (`app/(tabs)/home/weekly.tsx:97-99`) and the now-corrected subscription copy that admits
   it's a demo rather than implying a real charge.
9. **Confidence-driven "please double check this" UI** for photo/SMS extraction is a clean,
   reusable pattern (`src/constants/extraction.ts:4`), even though today's mock data never
   triggers it.
10. **Willingness to delete rather than half-finish** — both category requests and category
    deactivation were removed outright once confirmed unreachable/unsupported, instead of
    being left as confusing dead code or given a rushed UI just to "complete" them.

## ❌ What's Missing / Broken (still open)

**Mock-data realism (the AI layer) — largest remaining gap:**
1. The entire "AI" layer (Spending Score, Weekly Report, Finance Advisor chat) is static,
   canned content disconnected from the user's actual transactions under mock mode — including
   a chatbot reply that literally tells the user to "connect the backend"
   (`src/services/mock/reports.ts`, full file). Fixing this for real needs backend/Gemini
   integration, not a client-side patch.
2. SMS-paste and photo/receipt OCR extraction ignore their actual input and always return the
   same hardcoded result ("Grab Food 125.000đ" / "Circle K 85.000đ") — five different receipts
   produce five identical, mutually-flagged "duplicate" rows
   (`src/services/mock/extraction.ts:3-44`). Photo OCR has no backend counterpart even in real
   mode, so this one may never be fixable client-side; SMS extraction does have a real backend
   path (`real/extraction.ts`), unlike CSV which now also has a real client-side parser.

**Smaller rough edges:**
3. Theme (light/dark) switching is now only *partially* half-wired — onboarding and the auth
   screen still ignore the user's preference and stay dark-only (`notifications.tsx` and
   persistence were fixed; see "Fixed / resolved" above).
4. Category override only "teaches" the app (creates a merchant rule) from the post-save edit
   screen — the same correction made during initial manual/SMS/CSV/photo entry does not.
5. The score detail screen has no structured sub-score UI — budget/savings/spike numbers only
   exist inside a paragraph of prose text (`app/(tabs)/home/score.tsx:99-124`).
6. Contribution history UI is a hardcoded empty placeholder though the data layer supports it
   (`getContributionsByGoalId`, never called — `goals/[id].tsx:380-383`).
7. `app/link-sepay.tsx` (the OAuth2 WebView flow) is orphaned — nothing navigates to it anymore.
8. Syncing an already-linked SePay wallet is untestable in mock mode (no mock wallet can be
   type `'linked'`).
9. `getBudgetBuckets` is dead/unused code with a latent bucket-override bug — a landmine if
   someone wires it up later without fixing that it ignores per-customer bucket overrides.
10. Stale in-code comments/dead flags (`useCustomerCategories.ts:4`, `CategoryBucketCard.tsx:32`
    `canMove`) describe a savings-bucket lock that no longer exists.
11. `src/data/onboardingData.ts` still describes a "categories" onboarding step that was
    replaced by a persona form — dead data.
12. **Test coverage gap:** only 7 Jest suites exist total. Wallets, transactions, budgets,
    categories, CSV parsing, and the AI/report/chat layer still have zero automated test
    coverage, so bugs in any of that code could regress silently.

---

_Compiled from a 5-part parallel code audit covering Auth/Onboarding/Settings/Notifications,
Wallets/Transfers/SePay, Transaction Entry/AI Categorization, Categories/Budgets/Savings
Goals, and the AI Score/Report/Chatbot layer, plus a live `type-check`/`lint`/`test` run.
Updated 2026-08-08 after a follow-up pass: data export, CSV import file-picking, and category
deactivation removal._
