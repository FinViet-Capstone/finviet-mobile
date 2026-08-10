# Current Feature

<!-- Feature name and short description -->
Fix: `NumericKeypad` (the shared custom keypad overlay used across 12 screens) gets stuck
half-closed instead of fully sliding away when its checkmark ("Done") key is tapped — reported
on the "Thêm Giao Dịch" (Add Transaction) screen, the 5th recurrence of a "modal" bug in this
app.

## Status

<!-- Not Started | In Progress | Completed -->
Completed — verified on device

## Goals

<!-- Goals and requirements -->
- Root cause: `src/components/common/NumericKeypad.tsx` read `Dimensions.get('window')` once at
  module load to get `SCREEN_HEIGHT`, then used that stale value as the close animation's
  off-screen `translateY` target. When that value didn't match the real, current window height,
  the "closed" position never actually cleared the viewport, so the panel visually stopped
  partway down. This is the identical anti-pattern already fixed in the sibling
  `DraggableSheet.tsx` (commit `5b2566c`, switched to reactive `useWindowDimensions()`) — that
  fix was never ported to `NumericKeypad.tsx`, so the same bug kept resurfacing on whichever of
  the 12 consumer screens it was reported on next.
- Fix: replaced the hand-rolled `Dimensions`/`Animated.Value`/`translateY` open-close
  choreography in `NumericKeypad.tsx` with React Native's native `<Modal transparent
  animationType="slide" onRequestClose>`, mirroring the already-proven pattern used in
  `AIChatbotSheet.tsx` and `ChangePasswordSheet.tsx`. Native `Modal` animates against the OS's
  live window bounds, so there's no JS-held pixel value that can go stale — it can't get stuck
  by construction. Removed the `translateY`/`backdropOpacity`/`mounted` refs and the manual
  open/close `useEffect`; kept the `Keyboard.dismiss()`-on-open behavior. `NUMPAD_HEIGHT`
  export and all 12 call sites' props are unchanged.
- Out of scope: `SCREEN_WIDTH` (module-scope `Dimensions.get('window')`, used only for `KEY_W`
  sizing) has the same latent staleness pattern but isn't the reported bug — left untouched per
  minimal-change convention.

## Notes

<!-- Any extra notes -->
Diagnosed via full exploration of the modal/keypad code plus git history of past "sheet"-related
fixes (`5b2566c`, `b72363f`, `4abfef2`, `e6dfe0c`, `3a6243c`) — none of the prior fixes touched
`NumericKeypad.tsx`'s animation logic itself, only styling or the sibling `DraggableSheet.tsx`.
Branched `fix/numpad-stuck-close-modal` off `dev`. Plan file:
`C:\Users\Lenovo\.claude\plans\sau-khi-nh-n-n-t-warm-cerf.md`.

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
