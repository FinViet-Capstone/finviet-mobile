# FinViet — BDD Feature Audit (as a Vietnamese User)

_Date: 2026-08-08 · Persona: **Linh**, 21, university student, first time managing her own money,
transacts via MoMo/bank apps, low financial literacy · Mode: `EXPO_PUBLIC_USE_MOCK=true`
(current `.env.local` setting — no live .NET/Gemini backend needed)_

## Fixed since this audit (2026-08-08)

- **Savings-goal deletion silently lost money** — `addGoalContribution` now honors the
  wallet picked in the contribution sheet, and `deleteGoal` reverses any contribution with a
  transaction regardless of `goal.fundingWalletId`. Regression-tested (`goals.test.ts`).
- Wallet create/transfer no longer swallow save errors silently (Alert on failure).
- Mock `createWallet` now rejects duplicate names; `deleteWallet` blocks deleting your last wallet.
- `SetLimitSheet`'s non-functional per-wallet budget-scope picker removed (Budget has no
  wallet field in the data model — the control did nothing).
- Onboarding income step now requires a value > 0 before continuing.
- Theme preference now persists across logout/login (mock backing store); `notifications.tsx`
  migrated off hardcoded dark-only colors to `useThemeColors()`.
- Subscription screen's "Thanh toán an toàn" copy replaced — it no longer implies a real
  payment guarantee for a flow with zero payment integration.
- Score detail screen now respects the weekly/monthly toggle set on Home instead of
  hardcoding "weekly".
- Weekly report's "Hỏi AI Cố vấn" CTA now opens the real chat sheet instead of routing to a
  nonexistent `/advisor` screen.
- SePay linking now fails fast with a clear Vietnamese message when the backend isn't
  configured, plus a proactive mock-mode notice, instead of a generic network error.
- **Category requests removed from all docs (2026-08-08).** This was never a "missing
  feature to build" — it's a feature the team decided against months ago (no admin-approval
  UI ever existed) that stale docs kept describing as shipped. `context/project-spec.md` and
  `context/architecture.md` no longer mention it (the `docs/integration-status.md` file that
  also mentioned it was separately deleted from the repo entirely). The scenario/findings
  below are left as a historical record of the discrepancy that was found and fixed, not as
  an open TODO — do not reintroduce this feature.

Remaining items below (mostly mock-data realism and other missing features) were
deliberately left for a separate pass — see the conversation that produced this audit for
scope reasoning.

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

**What was run for real**, as a baseline:

| Check | Result |
|---|---|
| `npm run type-check` (`tsc --noEmit`) | ✅ 0 errors |
| `npm run lint` (`eslint .`) | ✅ 0 errors, 80 warnings (mostly `react-hooks` compiler-readiness rules, intentionally downgraded per `eslint.config.js`) |
| `npm test` (`jest`) | ✅ 56/56 passing — but only **6 test suites** (formatters, mmkv token storage, API interceptors, one auth type test, mock auth service). **Zero tests** cover wallets, transactions, budgets, goals, categories, or the AI/report/chat layer — the riskiest, most-mutated code in the app is entirely untested. |

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
Scenario: Linh skips entering her income
  Given step 1 has no validation gate — "Tiếp theo" always fires (app/onboarding.tsx:66)
  Then onboardingDone stays false server-side (mock/auth.ts:208) while the local store forces it true (authStore.ts:43-48)
  → PARTIAL — invisible today only because login always forces onboardingDone:true

Scenario: Linh expects to customize her categories at step 3
  Given ONBOARDING_STEPS/CATEGORY_GROUPS still describe a "categories" step (src/data/onboardingData.ts:1-7)
  Then step 3 actually renders a persona (name/gender/DOB) form instead (app/onboarding.tsx:124-135) — categories are silently auto-seeded on finish
  → MISSING — dead data left over from a since-replaced onboarding step
```

### Settings
```gherkin
Scenario: Linh switches to Light theme
  Then settings/index.tsx and screens using useThemeColors() repaint correctly
  But app/notifications.tsx, onboarding, and the auth screen hardcode dark-only COLORS (notifications.tsx:12)
  → PARTIAL — theme switching is half-wired app-wide, and not persisted (resets on logout, useCustomer.ts:88-114)

Scenario: Linh edits her budget allocation for next month
  Then current month is locked (🔒), next month is editable with proportional slider redistribution (settings/budget-allocation.tsx:161-183)
  → WORKS — genuinely thoughtful "changes apply next month" model

Scenario: Linh exports her transaction history
  Given she picks a date range and taps "Xuất dữ liệu"
  Then only Alert.alert("Đang xuất file CSV...") fires — no file is generated, shared, or saved (DataExportScreen.tsx:87-93)
  → BROKEN — looks finished, does nothing

Scenario: Linh upgrades to Premium
  Then in-memory state flips to premium with zero payment flow (subscriptions.ts:94-120), yet the screen shows a "Thanh toán an toàn" (secure payment) trust badge
  → PARTIAL — misleading UI copy for a no-op payment

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
  Given mock createWallet has zero duplicate-name check (mock/wallets.ts:55-70)
  Then it silently succeeds — two wallets end up with the identical name
  → PARTIAL

Scenario: Linh's wallet-create request fails
  Given create.tsx:50-54 has no try/catch around mutateAsync
  Then any thrown error vanishes with no Alert — she's stuck on the same form with zero feedback
  → BROKEN (silent failure)

Scenario: Linh deletes her only wallet
  Given mock deleteWallet unconditionally soft-deletes with no "last wallet" guard (mock/wallets.ts:95-103)
  Then she succeeds and is left with an empty wallet list, even though the UI has error-copy ready for exactly this case (wallets/[id].tsx:40-49)
  → PARTIAL (guardrail exists in copy, not enforced in mock)

Scenario: Linh transfers ₫200,000 between two wallets
  Then both balances update atomically and correctly (mock/transactions.ts:1505-1550)
  → WORKS

Scenario: Linh tries to transfer to the same wallet or over her balance
  Then both are structurally/UI-blocked before submit (transfer.tsx:50,101-121,152)
  → WORKS

Scenario: Linh taps "SePay" to link her bank account (mock mode)
  Given SePay linking imports straight from src/services/real/sepay.ts, bypassing USE_MOCK entirely (useWallets.ts:17,126-136) — no mock/sepay.ts exists
  When she submits with no real backend reachable (empty EXPO_PUBLIC_API_BASE_URL by default)
  Then she gets a generic "Không thể liên kết tài khoản SePay." with no explanation that this needs the real backend
  → BROKEN in mock mode

Scenario: Linh syncs an already-linked wallet
  Given no mock wallet can ever be type 'linked' (mock/walletStore.ts seeds only 'basic')
  → MISSING — this path is entirely untestable/dead in mock mode
```
Also found: `app/link-sepay.tsx` (the OAuth2 WebView flow) is **orphaned** — nothing in the
app navigates to it anymore; only `/link-sepay-token` is wired (`wallets/index.tsx:192-197`).

---

## 3. Transaction Entry & AI Categorization

```gherkin
Scenario: Linh manually enters an expense larger than her wallet balance
  Then "Số dư ví không đủ" blocks the save (manual.tsx:166-169)
  → WORKS

Scenario: Linh pastes a real, messy SMS — "Nap Lien Quan 50k"
  Given mock extractFromSMS(_text) ignores its argument completely
  Then she ALWAYS gets "Grab Food, 125.000đ" back, regardless of what she pasted
  → BROKEN — not a parser, a fixed canned response

Scenario: Linh scans 5 different receipts
  Given mock extractFromPhoto(_uri) ignores the image and always returns "Circle K, 85.000đ"
  Then all 5 rows come back identical and get flagged as duplicates of each other
  → BROKEN — confirmed mock-only (no backend OCR endpoint exists at all, per real/extraction.ts)

Scenario: Linh imports a CSV of her bank transactions
  Given there is no file picker anywhere in csv-import.tsx — "Chọn file & phân tích" just setTimeout()s in 5 hardcoded demo rows
  Then no file Linh picks is ever actually read
  → BROKEN in mock mode (the screen is explicitly labeled "Demo" — csv-import.tsx:143 — but a user could easily miss that)

Scenario: Linh taps "Tải file mẫu .csv" to see the expected format
  → BROKEN — the button has no onPress handler at all (csv-import.tsx:240-243), a dead button

Scenario: Linh deletes a transfer transaction
  Then both legs delete and both wallet balances reverse correctly (mock/transactions.ts:1477-1486)
  → WORKS

Scenario: Linh overrides a category on an already-saved transaction
  Then she's offered "Tạo quy tắc cho [merchant] → [category]?" and accepting retroactively re-labels every past transaction from that merchant (transactions/[id].tsx:134-153; mock/rules.ts:46-61)
  → WORKS — real "teaching" happens here

Scenario: Linh overrides a category during initial entry (manual/SMS/CSV/photo review)
  Given none of those four screens ever call useCreateRule
  → PARTIAL/MISSING — the "AI learns from you" promise only applies after the fact, not at the moment of correction
```

---

## 4. Categories, Budgets & Savings Goals

```gherkin
Scenario: Linh drags a category from Wants into Savings (and back)
  Given the old savings-bucket lock is confirmed removed — "never actually enforced server-side either" (customerCategories.ts:8-9)
  Then it moves freely in both directions, for system AND custom categories
  → WORKS
  (Note: stale doc comments and a dead canMove flag still describe the old lock — customerCategories.ts:4, CategoryBucketCard.tsx:32 — worth cleaning up so a future dev doesn't "fix" a bug that isn't one)

Scenario: Linh wants to request a category the app doesn't have
  Given docs/integration-status.md claimed this is wired to the real backend
  Then there is NO category-request service, hook, or screen anywhere in this codebase
  → RESOLVED (2026-08-08) — not a gap to fill: the feature was deliberately removed months
  ago and never had an admin-approval UI. The stale doc claim has been corrected, not the code.

Scenario: Linh wants to hide a category she never uses
  Given deactivateCustomerCategory exists in both mock and real service layers
  Then there is no button/menu anywhere in the app that calls it
  → MISSING — implemented in the data layer, unreachable in the UI. Reactivation doesn't exist at any layer.

Scenario: Linh sets a ₫2,000,000 food budget and spends past 80% of it
  Then the bar/percentage flip to danger-red live, no refresh needed (mock/budgets.ts:37-76; budgets/index.tsx:203-208)
  → WORKS

Scenario: Linh picks a specific wallet as a budget's "scope" in the limit sheet
  Given SetLimitSheet collects selectedWalletId but the save call never passes it (SetLimitSheet.tsx:99-102)
  → BROKEN — cosmetic control, silently discarded

Scenario: Linh checks whether she's "ahead" or "behind" pace for the month
  Given the visible pacing banner correctly uses her actual configured needs/wants/savings % (budgets/index.tsx:159-166; mock/incomeAllocation.ts)
  → WORKS — the previously-documented "hardcoded 50/30/20" issue is fixed for the screen users actually see
  (A second, richer ahead/on_track/behind engine, getBudgetBuckets, still exists but is dead/unused code — and it has a latent bug: it buckets spend by each category's global default bucket, not the customer's dragged-to bucket, unlike the one actually in use. A landmine if someone wires it up later without fixing that.)

Scenario: Linh creates a "Mua laptop" goal and contributes ₫500,000 from a wallet with only ₫300,000
  Then "Số dư ví không đủ (Hiện có: 300.000đ)" blocks it, both client- and server-side (goals/[id].tsx:52,130,133; mock/goals.ts:287-292)
  → WORKS

Scenario: Linh deletes a goal she already contributed to
  Given deleteGoal only reverses the contribution's transaction "if goal.fundingWalletId is set" (mock/goals.ts:242)
  But the goal-creation sheet never lets her set a funding wallet in the first place (goals/index.tsx:91-187)
  Then for every goal a real user creates today: her contribution transactions are NOT reversed and her wallet is NOT refunded — money silently disappears from her balance, despite the delete dialog saying "Hành động này không thể hoàn tác" as if it were just discarding progress
  → BROKEN — the most serious bug found in this audit

Scenario: Linh checks her "Lịch sử đóng góp" (contribution history) on a goal
  Given getContributionsByGoalId is fully implemented but never called by any screen
  Then she always sees a hardcoded "no history" placeholder regardless of real contributions (goals/[id].tsx:380-383)
  → MISSING
```

---

## 5. AI Spending Score, Weekly Report & Finance Advisor Chat

This is the feature area with the largest gap between **appearance** and **reality**. Under
mock mode, the entire "AI" layer is static content, disconnected from the user's own data —
this matches what `context/project-spec.md` already documents about the mock layer, and this
audit confirms it in the actual running code:

```gherkin
Scenario: Linh checks her weekly Spending Score
  Then she always sees score=72/green, from a fixed object, regardless of her real transactions (mock/reports.ts:14-31,150-152)
  → BROKEN (looks computed, is a constant)

Scenario: Linh toggles to "Tháng" (monthly)
  Then the score instantly jumps 72→54 — she's just switched to the OTHER fixed object (mock/reports.ts:34-50), not triggered a recalculation
  → BROKEN

Scenario: Linh opens the score detail screen after viewing "Tháng" on Home
  Given score.tsx:60 hardcodes useSpendingScore('weekly')
  Then her monthly view silently reverts to weekly — a state-loss bug independent of the mock/real question
  → BROKEN

Scenario: Linh looks for a budget/savings/spending-spike breakdown on the score screen
  Then there is no structured sub-score UI at all — those numbers only exist inside a paragraph of prose text (score.tsx:99-124)
  → PARTIAL

Scenario: Linh opens this week's AI report on today's date (Aug 2026)
  Then it narrates the week of 11–17 May 2026 — three months stale — and "refreshing" it only bumps the timestamp to now while the body text stays frozen in May (mock/reports.ts:56-74,246-249)
  → BROKEN

Scenario: Linh taps "Hỏi AI Cố vấn" at the bottom of the weekly report
  Then it routes to /(tabs)/home/advisor, a route that does not exist (weekly.tsx:84)
  → BROKEN (dead link)

Scenario: Linh asks the chatbot "Tháng này tôi tiêu bao nhiêu cho ăn uống?"
  Then after a fake 900ms "thinking" delay she gets: 'Đây là phản hồi mẫu cho câu hỏi "...". Kết nối backend để nhận phân tích tài chính thực tế.' — the mock explicitly tells her to go connect a real backend
  → BROKEN (self-admitted placeholder, not an answer)

Scenario: Linh opens a brand-new account with zero transactions
  Then Home correctly hides the score card behind a "Chưa đủ dữ liệu" CTA instead of showing a fake number (home/index.tsx:193-216)
  But score.tsx and weekly.tsx's well-written empty states can never actually be reached, because the mock functions never return null (mock/reports.ts:150-156)
  → PARTIAL — good defensive design on Home, undermined by mock data that can't exercise it
```

---

## Cross-Cutting: Documentation vs. Reality

A few findings don't belong to one feature — they're gaps between what the project's own docs
claim and what's actually in the code:

- **Category requests were documented as a shipped, backend-wired feature**
  (formerly `docs/integration-status.md:34`, since deleted; also `context/architecture.md`)
  but never existed anywhere in this codebase — no service module, no hook, no screen.
  Resolved (2026-08-08): the docs
  were corrected to reflect that this feature was deliberately removed months ago and should
  not be reintroduced — this was never a build gap.
- **SePay bank-linking bypasses `USE_MOCK` entirely**, unlike every other domain in the
  service barrel. A developer testing "in mock mode" would reasonably assume every feature is
  offline-safe; SePay quietly isn't, and fails with an unhelpful generic error instead of a
  clear "this feature needs the real backend" message.
- **Stale in-code comments** (`useCustomerCategories.ts:4`) still describe the removed
  savings-bucket lock, and a dead `canMove` flag (`CategoryBucketCard.tsx:32`) is a vestige of
  it — low risk today, but exactly the kind of stale doc that causes a future dev to "fix" a
  non-bug or miss a real one.
- **Onboarding's step data (`src/data/onboardingData.ts`) describes a step that was replaced**
  (category customization → persona form) but was never deleted — dead weight that misleads
  anyone reading the onboarding code cold.

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
   `src/services/mock/rules.ts:46-61`).
5. **A budgeting model that respects the calendar** — budget-allocation changes lock the
   current month and only take effect next month, with proportional slider redistribution so
   percentages always sum to 100 (`app/settings/budget-allocation.tsx:161-183`).
6. **A deterministic test harness for every auth error path** — magic emails
   (`taken@…`, `weak@…`, wrong-password) make every failure state reproducible without a real
   backend (`src/services/mock/auth.ts:1-18`).
7. **Bucket-level budget pacing genuinely reflects the user's real allocation settings**,
   not a hardcoded 50/30/20 split, for the screen users actually see
   (`app/(tabs)/budgets/index.tsx:159-166`, `src/services/mock/incomeAllocation.ts`).
8. **Well-copywritten Vietnamese throughout**, including honest disclaimers like the weekly
   report's "Nội dung có thể chưa hoàn toàn chính xác" footnote
   (`app/(tabs)/home/weekly.tsx:97-99`).
9. **Confidence-driven "please double check this" UI** for photo/SMS extraction is a clean,
   reusable pattern (`src/constants/extraction.ts:4`), even though today's mock data never
   triggers it.

## ❌ What's Missing / Broken

**Data-loss / correctness bugs (highest priority):**
1. **Deleting a savings goal does not refund the wallet or remove its transactions**, because
   the refund logic requires `goal.fundingWalletId`, but the goal-creation UI never lets a
   user set one — so for essentially every goal a real user creates, money silently vanishes
   from their balance on delete, contradicting the "cannot be undone" warning shown to them
   (`src/services/mock/goals.ts:242`, `app/(tabs)/budgets/goals/index.tsx:91-187`).
2. Several forms swallow save failures silently with no `try/catch`/Alert — wallet creation and
   wallet transfer both leave the user staring at an unresponsive form with zero feedback on
   error (`app/(tabs)/wallets/create.tsx:50-54`, `app/(tabs)/wallets/transfer.tsx:68-77`).
3. `SetLimitSheet`'s per-wallet budget scope picker collects a selection that is discarded
   before saving — a control that visibly does nothing (`SetLimitSheet.tsx:99-102`).

**Features that look finished but are fully static or non-functional today:**
4. The entire "AI" layer (Spending Score, Weekly Report, Finance Advisor chat) is static,
   canned content disconnected from the user's actual transactions under mock mode — including
   a chatbot reply that literally tells the user to "connect the backend"
   (`src/services/mock/reports.ts`, full file).
5. SMS-paste and photo/receipt OCR extraction ignore their actual input and always return the
   same hardcoded result ("Grab Food 125.000đ" / "Circle K 85.000đ") — five different receipts
   produce five identical, mutually-flagged "duplicate" rows
   (`src/services/mock/extraction.ts:3-44`).
6. CSV import never reads a real file — there's no file picker in the screen at all, and the
   "download sample CSV" button has no handler (`app/(tabs)/entry/csv-import.tsx:74-84,143,240-243`).
7. Data export shows a fake "exporting..." alert and produces no file
   (`src/components/settings/DataExportScreen.tsx:87-93`).
8. Subscription "upgrade" flips a flag with zero payment integration, yet shows a "secure
   payment" trust badge to the user (`src/components/settings/SubscriptionScreen.tsx:180-183`).
9. ~~Category requests are advertised in the project's own docs as backend-wired but don't
   exist anywhere in this codebase~~ — **resolved 2026-08-08**: the docs were corrected: this
   is a deliberately-removed feature, not a gap to build.
10. Category deactivation has a working data-layer function with **no UI entry point at all**;
    reactivation doesn't exist at any layer (`src/services/mock/customerCategories.ts:88-95`).
11. SePay bank-linking silently bypasses the mock/real switch that every other feature
    respects, so it fails with a generic, unhelpful error in mock/offline dev
    (`src/hooks/useWallets.ts:17,126-136`).

**Smaller rough edges:**
12. Theme (light/dark) switching is only half-wired — notifications, onboarding, and the auth
    screen ignore the user's preference and stay dark-only, and the preference itself isn't
    persisted across logout (`app/notifications.tsx:12`, `src/hooks/useCustomer.ts:88-114`).
13. Category override only "teaches" the app (creates a merchant rule) from the post-save edit
    screen — the same correction made during initial manual/SMS/CSV/photo entry does not.
14. Onboarding step 1 (income) has no validation gate, and its `onboardingDone` state can
    diverge between the local session store and the mock backend if skipped
    (`app/onboarding.tsx:66`, `src/stores/authStore.ts:43-48`).
15. The score detail screen ignores the weekly/monthly toggle set on Home and always shows the
    weekly score (`app/(tabs)/home/score.tsx:60`).
16. The weekly report's "Ask the AI advisor" button routes to a screen that doesn't exist
    (`app/(tabs)/home/weekly.tsx:84`).
17. **Test coverage gap:** only 6 Jest suites exist, covering formatters/token-storage/API
    interceptors/auth — none of wallets, transactions, budgets, goals, categories, or the
    score/report/chat logic audited above have any automated test coverage, so every bug in
    this report could regress silently.

---

_Compiled from a 5-part parallel code audit covering Auth/Onboarding/Settings/Notifications,
Wallets/Transfers/SePay, Transaction Entry/AI Categorization, Categories/Budgets/Savings
Goals, and the AI Score/Report/Chatbot layer, plus a live `type-check`/`lint`/`test` run._
