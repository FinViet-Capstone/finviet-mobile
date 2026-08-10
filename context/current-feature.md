# Current Feature

<!-- Feature name and short description -->
Fix: Ngân sách ↔ Mục tiêu tiết kiệm toggle feels like navigating to a new page (no transition
animation + mismatched header/toggle styling between the two routes).

## Status

<!-- Not Started | In Progress | Completed -->
Completed — verified on device (slide transition, matching header/toggle colors, back button,
aligned header heights, legible "+ Tạo mục tiêu" button)

## Goals

<!-- Goals and requirements -->
- The "Ngân sách" tab's two-pill toggle ("Ngân sách" / "Mục tiêu tiết kiệm") is real Expo
  Router navigation between two separate routes (`app/(tabs)/budgets/index.tsx` push/pop to
  `app/(tabs)/budgets/goals/index.tsx`), not a local in-screen toggle. Two concrete bugs make
  this read as "navigated to an unrelated page with no way back":
  1. No explicit transition `animation` configured on the shared `Stack` in
     `app/(tabs)/budgets/_layout.tsx` — the switch is an abrupt cut.
  2. The Goals screen's header/toggle styling doesn't match the Budgets screen's (confirmed
     diff: `headerTitle.color`, `toggle.backgroundColor`, `toggleOptionActive.backgroundColor`,
     `toggleTextActive.color`, `toggleWrap.marginBottom` all differ).
- Fix: add `animation: 'slide_from_right'` to the Budgets stack's `screenOptions`, and sync
  the 5 mismatched style values in `app/(tabs)/budgets/goals/index.tsx` to match
  `app/(tabs)/budgets/index.tsx` exactly (Ngân sách's values win, per user instruction).
- Out of scope (explicitly rejected by user during planning): merging the two routes/screens
  or their data-fetching hooks into one file, and any new shared/reusable toggle component —
  keep the existing two-route architecture, fix only the transition + style-value mismatch.

## Notes

<!-- Any extra notes -->
Plan written during planning session: `C:\Users\Lenovo\.claude\plans\thay-v-toggle-gi-a-encapsulated-wolf.md`.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Documented and branched (`fix/budgets-goals-toggle-format`) off `dev`. Prior
  feature (structured `BusinessRuleException.Code` messaging) shipped and merged to `dev`
  before this one started.
- 2026-08-10 — Implemented: added `animation: 'slide_from_right'` to
  `app/(tabs)/budgets/_layout.tsx`'s `Stack` `screenOptions`; synced the 5 mismatched style
  values in `app/(tabs)/budgets/goals/index.tsx` (`headerTitle.color`,
  `toggle.backgroundColor`, `toggleOptionActive.backgroundColor`, `toggleTextActive.color`,
  `toggleWrap.marginBottom`) to match `app/(tabs)/budgets/index.tsx`. type-check clean,
  lint 0 errors (95 pre-existing warnings, unrelated), 72/72 tests pass. Not yet manually
  verified on a simulator/device (no web target to check via the in-app browser) — pending
  that check before commit.
- 2026-08-10 — Round 2, after real-device test feedback: color sync confirmed working, but 3
  new issues found. Added a standard back-chevron button (`arrow_back`, top-left,
  `router.back()`) to the Goals header, matching the app's established back-button convention
  (`app/(tabs)/wallets/[id].tsx`, `app/settings/budget-allocation.tsx`, etc). Added a shared
  40×40 `headerBtn` sizing to both screens' right-side header controls so header row height
  (and title vertical position) is now identical between the two screens. Fixed a genuine
  contrast bug on "+ Tạo mục tiêu": it used `COLORS.onPrimary` (dark purple) text/icon on
  `COLORS.inversePrimary` (medium purple) background — both dark, unreadable, looked disabled;
  changed to `COLORS.onBackground` (verified high-contrast against `inversePrimary` in both
  `DARK_COLORS`/`LIGHT_COLORS`). Same `inversePrimary`+`onPrimary` bug also exists in
  `app/(tabs)/entry/csv-import.tsx` and `sms.tsx` — flagged as out-of-scope follow-up, not
  fixed here. type-check/lint (0 errors)/72 tests all pass again. Pending final device
  re-check before commit.
- 2026-08-10 — User verified round 2 on device: back button, aligned header heights, and the
  "+ Tạo mục tiêu" contrast fix all confirmed working. Committing.
