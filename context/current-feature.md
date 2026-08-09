# Current Feature

<!-- Feature name and short description -->
Fix: SetLimitSheet's "over remaining budget" warning was silently suppressed exactly when it mattered most.

## Status

<!-- Not Started | In Progress | Completed -->
In Progress

## Goals

<!-- Goals and requirements -->
- `SetLimitSheet.tsx`'s `isOverRemaining = sliderValue > remainingCap && remainingCap >= 0` suppressed the warning/confirm-dialog/orange-button whenever `remainingCap` (bucket cap − sum of the *other* categories' limits) was negative — i.e. exactly when the bucket's other categories alone already exceed the cap. That's the worst case, yet it silently showed no warning at all, while categories with a still-positive `remainingCap` correctly warned. User found this by comparing 3 categories in the same over-allocated "Thiết yếu" bucket.
- Fix: drop the `&& remainingCap >= 0` clause — `isOverRemaining = sliderValue > remainingCap` — so the warning fires whenever the proposed limit doesn't fit in what's actually left, negative or not.
- This is a single shared component used for every bucket's category-limit sheet, so the fix applies uniformly to Needs/Wants/Savings, not just the bucket where it was noticed.
- Out of scope: the "Còn lại trong nhóm" label still just hides itself (rather than showing e.g. "Đã vượt 1.3Mđ") when remaining is negative — not asked for, not touched.
- Follow-up (verified fix, then requested next): precise numeric entry for the monthly limit amount, matching the pattern already established on the Budget Allocation screen. Made the amount text in `SetLimitSheet` tappable (+ pencil icon), opening the shared `NumericKeypad` (new local `amountFocused`/`amountRaw` state) to type an exact VND amount instead of only dragging the slider. On Done, the typed value is clamped to `[0, sliderMax]` and committed via the same `setSliderValue` the slider itself uses, so `isOverRemaining`/warning/button-color react identically whether the value came from a drag or from typing.
- The keypad had to be mounted as a sibling to `<DraggableSheet>` (return wrapped in a Fragment), not nested inside it — nesting would confine the keypad's own `StyleSheet.absoluteFill` to `DraggableSheet`'s own capped box instead of the full screen, the same class of bug fixed earlier this session for `DraggableSheet` itself. Added conditional `NUMPAD_HEIGHT` bottom padding to the ScrollView (matching the app-wide convention) since the amount field sits near the top of a short sheet — no active scroll-to-focus needed here, unlike the Budget Allocation screen's deeper bucket cards.

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-09 — Started.
- 2026-08-09 — isOverRemaining fix verified on-device.
- 2026-08-09 — Added precise numeric entry for the monthly limit amount (SetLimitSheet).
