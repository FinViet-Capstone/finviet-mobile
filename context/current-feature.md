# Current Feature

<!-- Feature name and short description -->
Fix: bottom tab bar is covered/clipped by the Android gesture-navigation home indicator on a
Xiaomi Pad 5 device (real APK deploy, not the Expo Go / browser preview). Reported by the user
via a screenshot of the "Chấm Điểm Ví" (Spending Score detail) screen showing the tab icons
sitting flush against — and partially obscured by — the system home-indicator pill.

**Note:** going forward, verification for fixes in this project happens by building/deploying
an APK to a physical Android device (per user instruction 2026-08-12), not just browser
preview — device-specific chrome like gesture-nav insets only reproduces on-device.

## Status

<!-- Not Started | In Progress | Completed -->
In progress — implemented, awaiting on-device verification (APK)

## Goals

<!-- Goals and requirements -->
- Root cause: `app/(tabs)/_layout.tsx:33-39` hardcodes `tabBarStyle.height: 64` and
  `paddingBottom: 10`. React Navigation's bottom-tabs normally auto-includes the bottom
  safe-area inset in the tab bar's height, but once you supply *any* custom `height` that
  auto-inclusion is bypassed — the bar is sized to exactly 64px regardless of the device's
  gesture-nav inset, so on a device with a tall inset (Xiaomi Pad 5) the system home-indicator
  overlaps the tab bar's bottom edge/icons.
- Fix: read `useSafeAreaInsets()` in `TabLayout` and add `insets.bottom` into both
  `tabBarStyle.height` and `paddingBottom`, matching the pattern already used elsewhere in this
  repo (`app/(tabs)/entry/photo.tsx`, `src/components/common/DraggableSheet.tsx`, etc.) instead
  of hardcoding a fixed pixel value.
- Out of scope: broader safe-area audit of other screens; the `EntryTabButton`'s `top: -20`
  offset (unaffected, relative to the now-taller bar).

## Notes

<!-- Any extra notes -->
Confirmed via `Grep` that `useSafeAreaInsets` is an established pattern in this codebase (6
existing usages), not a new dependency. Branched `fix/tabbar-safe-area-inset` off `dev` (khoi
and dev are at the same commit `6cd59b5`). Pre-existing uncommitted changes to
`app.json`/`package.json`/`package-lock.json` on the `khoi` branch (unrelated, in-progress EAS
build config work) were left untouched and not included in this fix's commit.

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
- 2026-08-10 — Documented and branched (`fix/merchant-search-placeholder`) off `dev` for the
  English "merchant" loanword leaking into the Transactions search placeholder. Fixed
  `app/(tabs)/transactions/index.tsx:275` to read "Tìm theo tên người nhận...", matching the
  "Người nhận" term already used on the transaction-detail, SMS-entry, and photo-entry screens.
  type-check clean, lint 0 errors (84 pre-existing warnings, unrelated).
- 2026-08-10 — User verified on device: search placeholder now shows the Vietnamese term.
  Merged to `dev`.
- 2026-08-12 — Documented and branched (`fix/tabbar-safe-area-inset`) off `dev` for the bottom
  tab bar being clipped by the Xiaomi Pad 5's Android gesture-navigation home indicator (reported
  via a screenshot of the Spending Score screen, real APK deploy). Fixed
  `app/(tabs)/_layout.tsx` to add `useSafeAreaInsets().bottom` into `tabBarStyle.height` and
  `paddingBottom` instead of hardcoding `64`/`10`, matching the existing safe-area-inset pattern
  used elsewhere in the repo.
