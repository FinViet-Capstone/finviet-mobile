# Current Feature

<!-- Feature name and short description -->
Category drag-and-drop: move a category between all 3 buckets (Needs/Wants/Savings) by dragging, instead of the tap-to-swap button. Item 5 of `context/fe-plan-2026-07-revamp.md`.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Remove the `savings_locked` guard in `mock/customerCategories.ts` (both directions) and the "Savings bucket is immutable" doc comments in `constants/categories.ts`/`types/category.ts` — confirmed by BE that this was never actually enforced server-side either (an FE-only invention), per the user's decision to unlock full mobility.
- Replace the decorative `drag_indicator` with a real drag gesture (existing stack: `react-native-gesture-handler` + `react-native-reanimated`, same as `DraggableSheet.tsx` — no new dependency).
- Dragging a category and releasing it over any of the 3 bucket cards moves it there — for system categories via `moveBucket`, for customer-created categories via a new `updateCustomCategoryBucket` mutation (the `canMove: false` deferral from the category-request-removal feature ends here).
- No backend change needed — BE confirmed the bucket-override endpoint already supports all 3 buckets with no restriction.

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-27 — Started.
- 2026-07-27 — Implemented: removed the `savings_locked` guard from both `mock/customerCategories.ts` and `real/categories.ts` (it was duplicated in both, an FE-only invention never enforced server-side) plus the stale doc comments in `constants/categories.ts`/`types/category.ts`. Added `updateCustomCategoryBucket` (mock/real/barrel/hook) so customer-created categories can be reassigned too, not just system ones. Built the drag gesture in `CategoryBucketCard.tsx` (a `Gesture.Pan()` on the drag handle, reusing the existing `react-native-gesture-handler`/`reanimated` stack — no new dependency) and a new `CategoryDragOverlay` showing 3 fixed, screen-anchored drop zones + a floating chip that follows the finger. Deliberately used fixed zones (computed from `Dimensions.get('window')`) instead of measuring the actual scrolling bucket cards' live position, to avoid a `measure()`-based design I'd have no way to visually verify here. The existing tap-to-swap button is left as an independent Needs↔Wants-only shortcut, unrelated to the new drag gesture. `type-check`/`lint`/`test` all pass — no new warnings in any touched file. UI/gesture behavior itself (does the chip actually follow the finger smoothly, does the hover highlight look right, does the drop actually register) could not be visually verified — no RN simulator/browser available in this environment. Completed.
