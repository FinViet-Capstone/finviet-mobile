# Current Feature

<!-- Feature name and short description -->
Light/dark theme system, Wave 1: infrastructure + shared-primitive migration. Second (larger) half of item 2 in `context/fe-plan-2026-07-revamp.md`.

## Status

<!-- Not Started | In Progress | Completed -->
Completed (Wave 1 — see Notes for what's deferred to Wave 2)

## Goals

<!-- Goals and requirements -->
- Split `constants/theme.ts`'s `COLORS` into `DARK_COLORS` (unchanged, byte-identical to the old `COLORS`) and a new `LIGHT_COLORS`, authored from scratch using Material Design 3 tonal-role conventions hue-matched to the existing purple/orange/green brand identity — checked both FinViet Stitch design-system assets first; neither has a light mode, so there was no existing design to extract.
- `COLORS` stays exported as an alias for `DARK_COLORS` — every one of the ~75 still-unmigrated files that import it directly keeps working exactly as before.
- New `src/providers/ThemeProvider.tsx` (`ThemeProvider` + `useThemeColors()`) resolving the active palette from `Customer.theme` ('light'/'dark'/'system') + `useColorScheme()` for the system case. Mounted in `app/_layout.tsx` inside `QueryClientProvider` (needs `useCustomer()`).
- Wired the "Giao diện" row in Settings to a real light/dark/system picker (a modal, matching the existing logout-confirm pattern) calling `useUpdatePreferences({ theme })`.
- Migrated the files that actually use theme-*varying* colors (audited all 14 `src/components/common/*` files that import `COLORS` — only 5 use role-based keys; the other 9 only use theme-invariant `gray`/`brand`/semantic colors and needed no change): `Button`, `DraggableSheet`, `ErrorState`, `NumericKeypad`, `TextInput`; plus the tab bar shell (`app/(tabs)/_layout.tsx`) and `app/settings/index.tsx` itself (for immediate visual feedback when picking a theme).

## Notes

<!-- Any extra notes -->
**Wave 2 (separate follow-up, not this pass):** the remaining ~65 domain-screen files still import the theme-invariant `COLORS` directly and render in dark mode regardless of the customer's preference — switching them to `useThemeColors()` is real, screen-by-screen effort, explicitly deferred per the plan doc (`context/fe-plan-2026-07-revamp.md` item 2) so it doesn't get bundled into this infrastructure branch.

Migration pattern used throughout (for whoever picks up Wave 2): replace the module-scope `const styles = StyleSheet.create({...COLORS.x...})` with a `function createStyles(colors: ThemeColors) { return StyleSheet.create({...colors.x...}); }` factory, then inside the component call `const colors = useThemeColors(); const styles = useMemo(() => createStyles(colors), [colors]);`. For small sub-components defined outside the main component (e.g. `NumericKeypad`'s `NumKey`/`OpKey`), thread `styles` down as a prop rather than having each one call `useThemeColors()` independently.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-27 — Started.
- 2026-07-27 — Implemented per Goals above. `type-check`/`lint`/`test` all pass — no new lint warnings in any touched file. UI rendering itself (does light mode actually look right, does the toggle visibly work) could not be verified — no RN simulator/browser available in this environment; only compile-time and lint-time correctness confirmed. Completed (Wave 1 scope).
