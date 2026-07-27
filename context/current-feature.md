# Current Feature

<!-- Feature name and short description -->
Settings hub ghost-row cleanup: wire up what has real backing, remove what has none. First (smaller) half of item 2 in `context/fe-plan-2026-07-revamp.md` — the light/dark theme system (Wave 1) is a separate, larger follow-up.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Wire up: income row → navigate to `/settings/budget-allocation` (already real, via the income-allocation feature).
- Wire up: avatar + "Chỉnh sửa hồ sơ" → `expo-image-picker` + existing `uploadAvatar()` service function + `useUpdateProfile()`.
- Wire up: "Đổi mật khẩu" → open the existing `ChangePasswordSheet` (already fully built, just never surfaced from Settings). Its mutation still forwards to the mock under the hood (`real/auth.ts` has no BE endpoint yet) — that's unchanged by this feature, just surfacing the UI.
- Remove: "Ngôn ngữ", "Đơn vị tiền tệ", "Bảo mật (Face ID)" rows — no supporting system exists anywhere in the app for any of them.
- Leave alone (out of scope for this pass): "Giao diện" (theme) and "Cảnh báo ngân sách" (budget alert) — both need the larger theme-system work / a new BE settings endpoint respectively; not touching them here.

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-27 — Started.
- 2026-07-27 — Implemented: income row now navigates to `/settings/budget-allocation`; avatar edit button opens `expo-image-picker` and uploads via the existing `uploadAvatar()`/`useUploadAvatar()` (avatar now actually renders once uploaded, previously only ever showed the placeholder icon); new `EditProfileSheet` wired to "Chỉnh sửa hồ sơ" for the display name; new `ChangePasswordSheet` surfaced from "Đổi mật khẩu" (its mutation still forwards to the mock — no BE endpoint yet, unchanged); removed "Ngôn ngữ"/"Đơn vị tiền tệ"/"Bảo mật (Face ID)" rows and their now-dead strings. Left "Giao diện" (theme) and "Cảnh báo ngân sách" untouched, out of scope for this pass. `type-check`/`lint`/`test` all pass. Completed.
