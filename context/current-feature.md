# Current Feature

<!-- Feature name and short description -->
Fix: transaction-list search placeholder reads "Tìm theo tên merchant..." — an unexplained
English loanword dropped into otherwise Vietnamese-only UI copy. Reported by the user via a
screenshot of the Transactions tab search bar ("Merchant là gì? Người dùng Việt không hiểu").

## Status

<!-- Not Started | In Progress | Completed -->
In Progress — implemented, type-check/lint clean, awaiting device verification

## Goals

<!-- Goals and requirements -->
- Root cause: `app/(tabs)/transactions/index.tsx:275` hardcoded the English word "merchant"
  into the search placeholder. Every other screen that surfaces this same concept (transaction
  counterparty) already localizes it consistently as **"Người nhận"** —
  `src/data/transactionDetailData.ts:28` (`merchantLabel: "Người nhận"`),
  `app/(tabs)/entry/photo-confirm.tsx:43` (`merchantLabel: "Người nhận"`), and
  `app/(tabs)/entry/sms.tsx:64` (`fieldMerchant: "Người nhận / Mô tả"`). Only the
  transactions-list search bar was missed when those other screens were localized.
- Fix: changed the placeholder string to `"Tìm theo tên người nhận..."`, matching the
  established term. Single-line copy change — no logic touched; `searchQuery` still matches
  against the `transaction.merchant` data field, which is unrelated to the displayed label.
- Out of scope: not extracting this (or the file's other inline Vietnamese strings) into
  `src/data/`/`src/constants/` — that file has no existing local-strings pattern, so keeping
  the fix inline matches the file's current style and avoids an unrelated refactor.

## Notes

<!-- Any extra notes -->
Found via `Grep` for "merchant" across `app/` and `src/` — confirmed no other screen leaks the
English word into Vietnamese copy. Branched `fix/merchant-search-placeholder` off `dev`. Plan
file: `C:\Users\Lenovo\.claude\plans\merchant-l-g-ng-i-transient-pearl.md`.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Prior feature (`fix/budgets-goals-toggle-format`): fixed the Ngân sách ↔ Mục
  tiêu tiết kiệm toggle feeling like page navigation — added a slide transition, synced
  header/toggle styling between the two routes, added a back button, equalized header heights,
  and fixed the "+ Tạo mục tiêu" button's `onPrimary`-on-`inversePrimary` contrast bug. Verified
  on device across two rounds of feedback, merged to `dev`.
- 2026-08-10 — Documented and branched (`fix/entry-inverseprimary-contrast`) off `dev` to
  follow up on the same `inversePrimary`+`onPrimary` contrast bug found in two more screens.
  Implemented: `csv-import.tsx`'s `confirmText` color + both `ActivityIndicator` spinner
  colors changed `onPrimary` → `onBackground`; `sms.tsx`'s two `arrow_forward` icon colors
  changed `onPrimary` → `onSurface` (matching their already-correct sibling text color).
  type-check clean, lint 0 errors (95 pre-existing warnings, unrelated), 72/72 tests pass.
- 2026-08-10 — User verified on device: CSV-import and SMS-paste buttons are now legible.
  Both features merged to `dev`.
- 2026-08-10 — Documented and branched (`fix/numpad-stuck-close-modal`) off `dev` for the
  recurring "keypad stuck half-closed" bug. Diagnosed root cause (stale module-scope
  `Dimensions.get('window')` used as the close-animation target in `NumericKeypad.tsx`) and
  implemented the fix (native `<Modal animationType="slide">` replacing the custom
  `translateY`/`Dimensions` animation, matching the pattern already used by `AIChatbotSheet.tsx`
  / `ChangePasswordSheet.tsx`). type-check clean, lint 0 errors (84 pre-existing warnings,
  unrelated), 72/72 tests pass.
- 2026-08-10 — User verified on device: keypad now closes fully on checkmark tap, no more
  stuck half-open panel.
