# Current Feature

<!-- Feature name and short description -->
Fix: remove NumericKeypad's dead ÷ × − + arithmetic keys.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- `src/components/common/NumericKeypad.tsx` defined `onOperatorPress`/`activeOperator` props and rendered 4 `OpKey` buttons (÷, ×, −, +), but none of the 8 screens using this component ever passed those props — pressing them was always a no-op across the entire app.
- Removed the `Operator` type, `OpKey` component, `isOpActive` helper, and the two dead props entirely. The hand-laid-out grid collapses cleanly from 5 columns to 4 (digits + C / ⌫ / Done), with `KEY_W` and the `rowsDoubleLeft` flex ratio updated to match.
- `NUMPAD_HEIGHT` (used by 6 screens for bottom-padding reservation) keeps the same export shape and formula structure — it just picks up the new, larger `KEY_W` automatically. No consumer screens needed changes.

## Notes

<!-- Any extra notes -->
Verified on the user's device — keypad now shows a clean 4-column layout with no arithmetic keys.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Started, implemented, and verified on-device. Completed.
