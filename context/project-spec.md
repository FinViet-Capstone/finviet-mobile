# FinViet Mobile Project Specifications
---
## Problem (Core Idea)
---
Vietnamese Gen Z and young earners find existing personal-finance tools too complex, in
English, or built around foreign banking norms — manually logging every transaction is
tedious, so people stop tracking within days, and a flat "spent vs. budget" number doesn't
tell them whether they're actually on pace or doing well.

FinViet is a mobile-first personal finance tracker for Vietnamese Gen Z that removes entry
friction (manual entry, photo/receipt scan, bank SMS paste, CSV import, and bank-linked
auto-sync wallets) and layers an "AI Spending Score," AI-labeled weekly reports, and a
chatbot advisor on top — all in Vietnamese. **Current implementation status:** the app's UI,
navigation, wallets/transactions/budgets/goals/categories data layer, and entry flows are
real, working logic against an in-memory mock service layer (swappable to a real REST API per
domain via a `USE_MOCK` flag). The "AI" layer (spending score, weekly report, chatbot) has a
**mock fallback** (two hardcoded score objects and canned report/chat text, used when
`USE_MOCK=true`) but is also **fully wired to the real backend** (`src/services/real/reports.ts`
→ `/ai/score`, `/ai/reports`, `/ai/chat`, backed by an LLM/RAG pipeline) — set
`EXPO_PUBLIC_USE_MOCK=false` and it computes real scores/reports/chat replies from the
customer's actual data, matching the "AI-Powered Personal Finance Tracker and Spending Advisor"
tagline. The mock objects remain the dev-mode fallback, not the shipped behavior.

## Users
---
- **Gen Z Student / Young Earner:** first real income or allowance-level money, low financial
  literacy, wants a frictionless way to see where money goes without spreadsheets.
- **Budget-Conscious Saver:** wants to work toward savings goals and stay within a
  needs/wants/savings allocation, wants pacing feedback rather than just a month-end total.
- **Bank-Linked Convenience User:** wants transactions to log themselves via a linked bank
  wallet with minimal manual categorization, reconciling cash/unlinked spend via photo/SMS/CSV.

## Features
---
Here is a list of features for FinViet Mobile, as actually implemented in this codebase.

A. Wallets & Multi-Method Transaction Entry
- Every transaction belongs to exactly one wallet. `WalletType` is `'basic'` (manual) or
  `'linked'` (bank-synced — SePay OAuth2/token linking is the only provider; Finverse
  was removed 2026-07, it never went live; `LinkedWalletMetadata` tracks
  `institutionId/Name`, `accountId`, `syncStatus: 'active'|'error'|'pending'`).
- Four entry methods behind a single "+" tab chooser, matching the real `EntryMethod` union
  (`'manual' | 'photo' | 'csv_import' | 'linked' | 'sms_paste'`): **Manual** (no AI assist),
  **SMS paste** (extraction preview), **Photo/receipt scan** (batch up to 5, review-list UX),
  **CSV import** (bank export, multi-row review-list UX). SMS and CSV extraction both call a
  real backend endpoint (`POST /extract/sms`, `POST /extract/csv`) with genuine AI
  categorization when `USE_MOCK=false`. Photo-based OCR extraction stays mock-only in this
  codebase — a backend endpoint exists (`POST /extract/photo`) but has no real OCR provider
  wired in yet, so it always responds 503.
- Internal wallet-to-wallet transfers create two linked `Transaction` records
  (`type: 'transfer_out'`/`'transfer_in'`) sharing a real `transferPairId`; deleting either leg
  deletes both and reverses both wallet balances. (There is no "pending cash-withdrawal
  resolution" mechanism in code — transfers are a single, immediate atomic operation.)

B. Categories & Bucket System (Needs/Wants/Savings)
- 19 system categories exist in `src/constants/categories.ts` today: 6 Needs (Ăn uống, Nhà ở,
  Di chuyển, Sức khỏe, Giáo dục, Gửi tiền gia đình), 4 Wants (Giải trí, Làm đẹp, Mua sắm, Ăn
  ngoài), 3 Savings (Tiết kiệm, Đầu tư, and an auto-only `cat_savings_goal` never shown in
  manual pickers), 5 Income categories (no bucket), plus `cat_uncategorized`.
- Onboarding seeds each customer's own category set with **every system expense category** at
  its default bucket — a uniform full-catalog seed, not a persona-derived subset. (Persona-based
  seeding — gender/age → one of 5 fixed category subsets — was removed; the team decided months
  ago to drop it, and gender/date-of-birth collection at onboarding is kept only for future
  analytics, no longer feeding category selection.)
- There is no category deactivation feature: a customer cannot hide a category from budgets
  or pickers. This existed as a data-layer function with no UI entry point and no reactivation
  path at any layer, and was removed entirely (2026-08-08) rather than finished.
- Categories can be dragged freely between all three buckets, **including Savings** — a
  category is not locked into Savings once assigned, nor barred from being moved into it.
  This was reversed from an earlier "Savings is locked" design (per
  `context/fe-plan-2026-07-revamp.md` item 5, confirmed with BE: savings was never actually
  locked server-side either).
- There is no category-request feature: a user cannot ask an admin to add a custom category.
  This was deliberately removed (decided months ago, per the team) — no admin-approval UI
  ever existed for it, and no trace of it remains in the codebase.

C. Budgets & Pacing
- Two distinct, both-implemented budgeting mechanisms:
  - **Per-category limits** (`BudgetWithSpend`): `monthlyLimit` vs. actual `spent`, with
    `status` = `safe` (<60%), `warning` (60–80%), `danger` (>80%). Note: `percentage` is *not*
    clamped to 100 in the actual calculation despite a stale comment in the type file claiming
    it is.
  - **Bucket-level pacing** (`getBudgetBuckets`): `allocationCap = monthly income × bucket
    share`, `expectedSpent = allocationCap × (elapsed fraction of month)`,
    `paceDeviation = spent − expectedSpent`, and a `paceStatus` of `ahead`/`on_track`/`behind`
    (±5% of allocationCap as the neutral band), plus an aggregate `budgetAdherenceScore` and an
    `uncategorizedWarning` when uncategorized spend exceeds 10%. **Known inconsistency:** the
    bucket share used here is a hardcoded 50/30/20 constant, not the customer's actual
    configurable `needsPct`/`wantsPct`/`savingsPct` fields — worth reconciling later.
- Savings-bucket rendering is genuinely different from Needs/Wants: its monthly progress is
  expense assigned to Savings minus `cat_savings_goal` withdrawal income, clamped at zero. The
  transaction history still keeps the gross contribution expense and withdrawal income as separate
  directional records. `BudgetOverviewCard` renders the Savings row green once the raw amount reaches
  its target and neutral gray (never red) below it; its displayed badge/bar are capped at 100%, while
  the amount remains truthful when the target is exceeded.

D. Savings Goals
- Named goals (`targetAmount`, `currentAmount`, optional `deadline`, optional
  `fundingWalletId`), with `SavingsGoalWithProgress` deriving `progressPercentage` (clamped to
  100), `remainingAmount`, `requiredMonthlySaving` (`ceil(remaining / monthsRemaining)`), and
  `monthsRemaining` (whole months, floored at 1).
- Contributing is real, guarded business logic (`addGoalContribution`): rejects
  amount ≤ 0, rejects amount exceeding the goal's remaining amount, and — when a funding
  wallet is set — rejects amount exceeding that wallet's balance. A successful contribution
  creates a real `Transaction` (`categoryId: 'cat_savings_goal'`, `type: 'expense'`) and debits
  the wallet through the same balance-adjustment path as any other transaction.
  `currentAmount` is always recomputed as the true sum of contributions minus withdrawals; the
  goal flips `isCompleted` once contributions reach the target. Archiving is allowed only after
  the customer explicitly withdraws the full balance to a selected basic wallet. It then
  soft-deletes the zero-balance goal while preserving every ledger row and generated transaction;
  archived goals remain readable in the app's read-only `Đã lưu trữ` section.

E. AI Spending Score, Weekly Report & Advisor Chat
- `SpendingScore` (`view: 'weekly'|'monthly'`, `score`, `color: 'green'|'amber'|'red'`,
  `verdictVi`, `reasonVi`, `commentaryVi`) is real end to end when `USE_MOCK=false`:
  `real/reports.ts` calls `GET /ai/score?period=WEEKLY|MONTHLY`, which computes a genuine score
  from the customer's transactions/budgets and returns a `colorBadge` + Vietnamese `comment`.
  The mock fallback (used only when `USE_MOCK=true`) still selects between two hardcoded literal
  objects (score 72/green for weekly, 54/amber for monthly) — that's a dev convenience, not the
  shipped behavior. Note the backend returns a single `comment` string, not separate
  verdict/reason/commentary fields — the FE derives a short verdict from the color band and
  reuses the comment for the rest; when the AI provider is unavailable the backend returns
  `comment: null`, which the FE shows as fallback text rather than a blank box.
- Weekly reports (`GET /ai/reports`, `POST /ai/reports/generate`) and the advisor chatbot
  (`POST /ai/chat`, `GET /ai/chat/history`) are likewise real — genuine LLM-backed Vietnamese
  narratives/replies, not canned text, once `USE_MOCK=false`. The backend keeps a single flat
  chat history per customer (no server-side "session" concept); the FE folds it into one
  synthetic session so the existing session-list UI keeps working. The mock versions (canned
  report text, templated echo reply) remain only the `USE_MOCK=true` dev fallback.
- UI-wise this is a real, built feature (score card with weekly/monthly toggle, a score-detail
  screen, and a bottom-sheet chat), and as of this doc's last update the computation/generation
  behind it is real too — the only thing gating it from "live" is the `USE_MOCK` flag and a
  running backend with an AI provider configured (the backend is mid-switch from local Ollama
  to Gemini/Google AI Studio as its provider — a backend-side config change, no FE impact).

F. Notifications
- `AppNotification` types: `budget_alert`, `weekly_report`, `goal_milestone`, `announcement`,
  each optionally linked to an entity (`budget`/`goal`/`report`/`wallet`/`system`) for deep
  linking. A dedicated Notification Center screen lists/marks-read/deep-links into them.

G. Settings & Utilities
- Real, routed screens under `app/settings/`: profile/preferences home, budget-allocation
  sliders (needs/wants/savings %), category bucket management, data export, account deletion,
  and subscription management.

## Data
---
Field lists below are taken directly from `src/types/*.ts` and the mock service layer that
implements them.

### Customer
- id, email, passwordHash/googleId, displayName, avatarUrl
- gender ('male'|'female'|'other'), dateOfBirth — collected and persisted at onboarding;
  reserved for future analytics, not currently consumed by any feature (persona-based category
  seeding that used to derive from these fields was removed)
- monthlyIncome, needsPct/wantsPct/savingsPct (default 50/30/20)
- defaultCurrency, language ('vi'|'en'), theme ('light'|'dark'|'system')
- isActive, emailVerified, onboardingDone, notifications settings, fcmToken

### Wallet
- id, customerId, name, type ('basic' | 'linked'), balance, isDeleted, createdAt, updatedAt
- linkedMetadata (linked wallets only): institutionId, institutionName, accountId,
  accountNumber?, lastSyncAt?, syncStatus ('active'|'error'|'pending'), syncError?

### Transaction
- id, customerId, walletId, categoryId (string | null — null = uncategorized), amount,
  type ('expense'|'income'|'transfer_out'|'transfer_in'), description, merchant,
  transactionDate, entryMethod ('manual'|'photo'|'csv_import'|'linked'|'sms_paste'),
  transferPairId (string | null), externalId, createdAt, updatedAt
- (No `pendingResolution` or similar field exists on this type.)

### Category (global) / CustomerCategory (per-customer)
- Category: id (slug, e.g. `cat_food`), nameVi, nameEn, icon, color, isSystem, sortOrder,
  type ('expense'|'income'), defaultBucket, autoOnly? (true only for `cat_savings_goal`)
- CustomerCategory: id, customerId, categoryId, bucketId, source, createdAt, updatedAt
  (no `isActive` field — category deactivation was removed; see Features §B.)
- (No `CategoryRequest` type exists — there is no category-request feature; see Features §B.)

### Budget
- id, customerId, categoryId, monthlyLimit, resetDay, createdAt, updatedAt
- BudgetWithSpend adds: categoryName/Color/Icon, spent, remaining, percentage (unclamped),
  status ('safe'|'warning'|'danger')
- Bucket-level (derived, not a stored entity): allocationCap, spent, expectedSpent,
  paceDeviation, percentage, paceStatus ('ahead'|'on_track'|'behind'), budgetAdherenceScore,
  uncategorizedRatio, uncategorizedWarning

### SavingsGoal
- id, customerId, name, iconEmoji?, targetAmount, currentAmount, deadline, fundingWalletId?,
  isCompleted, isDeleted, createdAt, updatedAt
- SavingsGoalWithProgress adds: progressPercentage, remainingAmount, requiredMonthlySaving,
  monthsRemaining
- GoalContribution: id, goalId, amount, contributedAt, note?, transactionId?

### AppNotification
- id, customerId, type ('budget_alert'|'weekly_report'|'goal_milestone'|'announcement'),
  title, body, entityType ('budget'|'goal'|'report'|'wallet'|'system'), entityId, isRead,
  sentAt

### Subscription
- SubscriptionPlan: planCode, nameVi, nameEn, monthlyPrice, annualPrice, featuresVi[],
  isPopular?
- CustomerSubscription: id, customerId, planCode, billingCycle ('monthly'|'annual'),
  status ('active'|'cancelled'|'expired'|'trial'), currentPeriodEnd, cancelAtPeriodEnd
- `PlanCode = 'free' | 'premium'`

### Rule (merchant → category)
- id, customerId, merchantKeyword, categoryId, createdAt, updatedAt

### AI (score/report/chat — currently mock-backed, see Features §E)
- SpendingScore, WeeklyReport, ChatMessage/ChatSession, AiClassificationResult,
  CategorizationOutcome (`source: 'RULE'|'AI'|'FALLBACK'`)

### Extraction
- PhotoExtractionResult: amount, type?, merchant, transactionDate, categoryId, confidence
  per-field

## Tech Stack
---
**Confirmed from `package.json` and the actual source tree — this repo only:**
- **Expo SDK 54 (`~54.0.0`) — locked, non-negotiable.** React Native 0.81.5, React 19.1.0.
- TypeScript, Expo Router v6 (file-based routing)
- TanStack Query v5 (`@tanstack/react-query`) for all data fetching — hooks centralized in
  `src/hooks/`
- Zustand for UI-only state (auth session, preferences)
- React Hook Form + Zod (`@hookform/resolvers`) for forms/validation
- `react-native-gifted-charts` for charts
- `react-native-reanimated` + `react-native-gesture-handler` for animation/gestures
- `@expo-google-fonts/material-symbols-outlined` for the icon font
- `expo-secure-store`, `expo-image-picker`, `expo-notifications`, `expo-router`,
  `expo-constants`, `expo-linking`
- Axios for HTTP
- A `USE_MOCK` toggle in `src/services/index.ts` swaps each domain between
  `src/services/mock/*` and `src/services/real/*` with identical function signatures — this
  swap is already implemented for wallets/transactions/budgets/goals/customer-categories/
  notifications/rules/SMS-extraction/CSV-extraction/AI score-report-chat and bank-linking
  (SePay only); photo-OCR extraction and subscriptions are the only domains that remain
  mock-only (no backend endpoint for subscriptions; a backend photo-OCR endpoint exists but has
  no real OCR provider wired in, so it always 503s).
- Backend is a separate repo not present in this codebase — this app only assumes a REST API
  reachable at `EXPO_PUBLIC_API_BASE_URL`; no specific backend technology is asserted here.

## Monetization
---
A real 3-tier catalog exists in the mock subscription service:
- **free** — 0đ
- **premium** — 59.000đ/month or 590.000đ/year (marked `isPopular`)

The mock customer defaults to `planCode: 'free'`, `status: 'active'`. A Settings →
Subscription screen exists for upgrade/cancel. No feature-gating logic tying `planCode` to
actual feature access was found in this codebase — this currently reads as a pricing
catalog/upgrade-flow scaffold rather than an enforced paywall.

## UI/UX
---
**General:**
- Vietnamese-first UI strings, centralized as constants rather than inlined in JSX
- Dark, tonal design-token system in `src/constants/theme.ts` (Material-3-flavored naming:
  primary/secondary/tertiary/surface variants, plus semantic success/warning/danger/info and
  domain-specific palettes for score/budget/calendar/chart contexts)
- Material Symbols Outlined as the icon font, via a custom `MaterialIcon` text-glyph wrapper

**Layout:**
- Bottom tabs: Home / Transactions / "+" (Entry) / Wallets / Budgets; Notifications and
  Settings are reached from within the app rather than being tabs themselves
- Home: balance summary, Spending Score card (weekly/monthly toggle), budget overview,
  savings goal card, recent transactions
- Budgets: bucket-level cards plus per-category rows grouped by bucket, with Savings Goals
  reachable from the same tab
- Entry: a method-chooser screen fanning out to manual/SMS/photo/CSV sub-screens

**Interaction conventions:**
- A custom in-app numeric keypad component for money fields (rather than the OS keyboard)
- Photo/CSV batch flows use a review-list UX for confirming AI-extracted rows before saving

**Responsive:**
- Mobile-only React Native app — single phone form factor, no tablet/desktop breakpoints
