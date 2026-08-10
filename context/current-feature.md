# Current Feature

<!-- Feature name and short description -->
Fix: low-contrast text/icons on `COLORS.inversePrimary`-background buttons in the CSV-import
and SMS-paste entry flows (dark-on-dark, buttons read as disabled). Follow-up from the
Budgets/Goals toggle fix, where the same `inversePrimary` + `onPrimary` pairing bug was found
and fixed on the Savings Goals "+ Tạo mục tiêu" button.

## Status

<!-- Not Started | In Progress | Completed -->
Completed — verified on device

## Goals

<!-- Goals and requirements -->
- `app/(tabs)/entry/csv-import.tsx`: `confirmBtn`/`startBtn` use `backgroundColor:
  COLORS.inversePrimary` (`#6d3bd7`, medium purple) with `confirmText.color: COLORS.onPrimary`
  (`#3c0091`, dark purple) and matching `ActivityIndicator` spinner color — both dark, low
  contrast. Changed `confirmText.color` and both spinner colors to `COLORS.onBackground`
  (`#e7e0ed`, near-white in the app's only active dark theme) — verified in
  `src/constants/theme.ts` to stay high-contrast against `inversePrimary` in both
  `DARK_COLORS` and `LIGHT_COLORS`.
- `app/(tabs)/entry/sms.tsx`: `confirmBtn`/`processBtn` also use `inversePrimary`
  backgrounds, but their text (`confirmBtnText`/`processBtnText`) was already correctly
  `COLORS.onSurface` — only the `arrow_forward` icon inside each button used the mismatched
  `COLORS.onPrimary`. Changed both icons to `COLORS.onSurface` to match their sibling text.
- Out of scope: no other `inversePrimary` usages found beyond these two files plus the
  already-fixed Goals screen.

## Notes

<!-- Any extra notes -->
Flagged while fixing `app/(tabs)/budgets/goals/index.tsx` on branch
`fix/budgets-goals-toggle-format` (see that branch's commit + plan at
`C:\Users\Lenovo\.claude\plans\thay-v-toggle-gi-a-encapsulated-wolf.md` for the original
diagnosis). Branched separately (`fix/entry-inverseprimary-contrast`, off `dev`) since it
touches unrelated screens.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Documented and branched off `dev`. Implemented: `csv-import.tsx`'s
  `confirmText` color + both `ActivityIndicator` spinner colors changed `onPrimary` →
  `onBackground`; `sms.tsx`'s two `arrow_forward` icon colors changed `onPrimary` →
  `onSurface` (matching their already-correct sibling text color). type-check clean, lint 0
  errors (95 pre-existing warnings, unrelated), 72/72 tests pass. Pending device
  verification before commit.
- 2026-08-10 — User verified on device: CSV-import and SMS-paste buttons are now legible.
  Committing.
