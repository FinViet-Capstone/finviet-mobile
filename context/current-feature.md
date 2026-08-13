# Current Feature

<!-- Feature name and short description -->
Feat: footnote on bank-linked wallets explaining that their balance mirrors the bank
(`Số dư đồng bộ từ ngân hàng`), so a synced transaction that leaves the balance unchanged
no longer reads as a bug.

## Status

<!-- Not Started | In Progress | Completed -->
In Progress

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

Branched from `dev`, independent of `feature/real-chat-sessions` (commit `bedd624`, not yet
merged) — the two touch no common files and can merge in either order. Local `dev` was 16 commits
behind `origin/dev` when this branch was cut.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Previous three branches (shipped-endpoint wiring; transaction-edit + goal-ledger
  wiring; SePay OAuth fix) merged to `dev`. Started this feature — verified the complete error
  code list against `finviet-be` source directly rather than trusting the markdown reference
  alone, since it was already found to be incomplete for this exact list.
- 2026-08-10 — Implemented: `BUSINESS_RULE_MESSAGES_VI` (38 codes) added to
  `src/utils/errors.ts`; `getApiErrorMessage()` now checks `code` first, ahead of the raw
  `message`; consolidated `app/(tabs)/wallets/[id].tsx`'s local `WALLET_DELETE_ERROR_MESSAGES`
  duplicate into the shared map and upgraded its sync/unlink error handlers to the same
  utility. Added `src/utils/__tests__/errors.test.ts` (8 tests: code-priority-over-message,
  the dynamic `sepay_error_{status}` catch-all, FluentValidation field-error fallback,
  non-axios-error safety, and a completeness check that every mapped code has a non-empty
  message). type-check/lint/72 tests all pass (64 prior + 8 new). This closes out every item
  from the FE↔BE reconciliation plan.
- 2026-08-14 — Multi-session AI chat wired to the real backend on `feature/real-chat-sessions`
  (commit `bedd624`, 8 files, awaiting merge): `real/reports.ts` moved off its synthetic
  single-session fallback onto `/ai/chat/sessions` + per-session history, plus a client-side
  role tiebreak working around the backend stamping both halves of an exchange with the same
  `CreatedAt`. Verified with 18 assertions against a live API.
- 2026-08-14 — Started this branch. Diagnosed the linked-wallet balance question against live
  data rather than assuming: confirmed by code and by DB query that a linked balance mirrors
  SePay and is never summed from transactions, so the footnote is the honest fix rather than
  "correcting" a balance that is behaving as designed.
