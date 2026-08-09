# Current Feature

<!-- Feature name and short description -->
Fix: `DraggableSheet` bottom sheet doesn't pull up — only the drag handle sliver renders, no content. Reported by user with screenshots from the Budget tab's "Set Limit" sheet and Transaction History's wallet-picker sheet.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Root cause: `MAX_SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.85)` in `DraggableSheet.tsx` was computed once at module-import time, outside any component/hook — a known Expo/RN timing hazard where `Dimensions.get('window')` can resolve to a stale/too-small value before the native window is measured. Combined with `overflow: 'hidden'` on the same sheet box, a bad read hard-clipped every sheet (for the whole app session) down to just its handle + padding.
- Fix: replaced the module-scope constant with `useWindowDimensions()` called inside the `DraggableSheet` component, matching the pattern already used correctly in `src/components/charts/WeeklySpendingSwiper.tsx`. No consumer files changed — `DraggableSheet` is the shared component behind nearly every sheet in the app.
- Second bug found while verifying the above on-device: `WalletPickerSheet.tsx`'s `styles.content` had a redundant `maxHeight: '60%'` on top of `DraggableSheet`'s own cap — percentage-against-an-indefinite-parent, a classic RN/Yoga ambiguous case since the ancestor's height is content-driven, not definite, until it actually hits `DraggableSheet`'s cap. This truncated the wallet list with dead space below instead of showing it in full. Fix: removed the redundant line; `SetLimitSheet.tsx` never had this second cap and works fine relying solely on `DraggableSheet`'s own cap.
- Out of scope (user decision): `AIChatbotSheet.tsx`/`ChangePasswordSheet.tsx` use an independent `<Modal>` implementation with a real `height: '90%'`, not proven to share this bug — left untouched. `CategoryDragOverlay.tsx` has the same `Dimensions.get()`-at-module-scope anti-pattern but no evidence of a current bug — left untouched per minimal-change guidance.

## Notes

<!-- Any extra notes -->
Both fixes verified working on the user's device.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-27 — Started (category drag-and-drop; see git history for that completed feature's notes).
- 2026-08-09 — Started: DraggableSheet max-height fix.
- 2026-08-09 — User confirmed DraggableSheet fix works on-device. Found + fixed a second, related bug in `WalletPickerSheet.tsx` (redundant `maxHeight: '60%'` truncating the wallet list).
- 2026-08-09 — User confirmed both fixes on-device. Completed.
