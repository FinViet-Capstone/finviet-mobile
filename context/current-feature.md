# Current Feature

<!-- Feature name and short description -->
Feat: footnote on bank-linked wallets explaining that their balance mirrors the bank
(`Số dư đồng bộ từ ngân hàng`), so a synced transaction that leaves the balance unchanged
no longer reads as a bug.

## Status

<!-- Not Started | In Progress | Completed -->
Completed — merged into `dev` together with `feature/real-chat-sessions`

## Goals

<!-- Goals and requirements -->
- Observed on a real SePay-linked wallet: it holds a synced `+10.000đ` income transaction yet
  shows `0đ`, and the wallets total does not move either. Not a bug — `TotalBalance` is a plain
  `wallets.Sum(x => x.Balance)` (`WalletService.cs:62`), and a linked wallet's balance is
  assigned from what SePay reports (`link.Wallet.Balance = latestBalance ?? …`), never derived
  from the imported rows. The bank is the source of truth for balance; importing transactions
  and updating balance are two separate paths.
- The same money therefore reads two ways: the Wallets screen shows no change, while Reports
  and Budgets — which sum the `transactions` table — do count it. Nothing in the UI explains
  the discrepancy, so it looks broken.
- Add a footnote under the balance on `app/(tabs)/wallets/[id].tsx`, rendered only when
  `wallet.type === 'linked'`: **"Số dư đồng bộ từ ngân hàng"**. Styled dimmer than the existing
  type row (`COLORS.outline`) so it reads as a footnote rather than a second status line.
- Out of scope, deliberately: the deeper half of this problem is that
  `Balance = latestBalance ?? 0m` makes "SePay reported no balance" and "the balance really is
  zero" indistinguishable. Showing `—` instead of `0đ` for the unknown case is the better fix
  but needs a backend change to signal the difference, so it stays a separate task.
- Also out of scope: the wallets list screen. The footnote goes on the detail screen only,
  where a user who notices the discrepancy actually goes to investigate.

## Notes

<!-- Any extra notes -->
Verified against live data on 2026-08-14: wallets `SePay - Vietcombank` 8.175.000đ + `Tinder`
1.000.000đ + `SePay - Sacombank` 0đ = total 9.175.000đ, with the `+10.000đ` (`sepay:73531578`)
sitting on the Sacombank wallet contributing exactly 0 to that total, while August income across
the `transactions` table totals 5.210.000đ including it.

Branched from `dev`, independent of `feature/real-chat-sessions` — the two touch no common source
files. Both are now merged into `dev`; the only merge conflicts were in this document and in the
`src/services/index.ts` header comment, where the CSV-extraction work landed on `dev` in parallel.

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
