# Current Feature

<!-- Feature name and short description -->
Fix: bottom sheet + numeric keypad bugs found during modal QA pass.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- DraggableSheet: `MAX_SHEET_HEIGHT` was computed once at module-import time via `Dimensions.get('window')` — a stale-value hazard that hard-clipped every sheet to just its handle. Fixed with `useWindowDimensions()` inside the component (matches `WeeklySpendingSwiper.tsx`'s existing pattern).
- WalletPickerSheet: a redundant `maxHeight: '60%'` on `styles.content` resolved ambiguously against `DraggableSheet`'s own indefinite-height box, truncating the wallet list with dead space below. Removed; `SetLimitSheet` never had this second cap and works fine without it.
- NumericKeypad: removed the dead ÷ × − + operator keys (`onOperatorPress`/`activeOperator` were never wired up by any of the 8 consumer screens). Grid collapsed from 5 columns to 4; `NUMPAD_HEIGHT` keeps the same export shape.

## Notes

<!-- Any extra notes -->
Both verified working on the user's device.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — DraggableSheet + WalletPickerSheet fixes implemented and verified on-device.
- 2026-08-09 — NumericKeypad arithmetic-key removal implemented and verified on-device.
- 2026-08-09 — Both merged into dev.
