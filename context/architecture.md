# Architecture Decisions

## Service layer barrel (no mock layer — removed 2026-08-18)

`src/services/index.ts` is a barrel that re-exports every domain function from
`src/services/real/*`. Screens and hooks import **only from `@/services`**,
never from `src/services/real/*` directly — that keeps the barrel as the
single import surface (and lets a future domain swap happen with zero
call-site changes, same reasoning as before, just without a live second
implementation today). Input/return types are re-exported from `@/types`,
which is where every domain's request/response contract now lives (moved out
of the old `mock/*` modules when they were deleted).

Every domain hits the real .NET backend: auth, wallets, transactions,
budgets, saving goals, categories, reports/AI, notifications, rules, SMS/CSV/
photo extraction, and bank-linking (SePay OAuth2 — the only linking provider;
Finverse was removed 2026-07). One exception has its entry point hidden
client-side rather than wired against nothing:
- **Subscriptions** — the backend has a real `POST /api/subscriptions/subscribe`
  (VNPay) endpoint, but no customer-facing plan-catalog or
  current-subscription-status endpoint (only `Admin`-role CRUD exists). The
  Settings → "Gói dịch vụ" entry is removed until those two land — see
  `finviet-be/docs/subscriptions-customer-endpoints-todo.md`.

**Correction (2026-08-18):** Photo/receipt OCR extraction was previously documented here as
permanently 503ing (`IReceiptOcrService` as an intentional placeholder). That's stale —
`finviet-be` commit `aff76cc` wired it to a real Gemini-backed OCR provider, and
`real/extraction.ts`'s `extractFromPhoto` now gets genuine extracted fields back. At the time
this correction was first written, the photo path also didn't yet call the shared
categorization service the way SMS/CSV did — that gap has since been closed (see the
`fix/ai-categorization-suggestions` work below, `ExtractController.ExtractPhoto` now calls
`CategorizeItemAsync`) and confirmed live on-device 2026-09-05 (a photo-extracted transaction
came back with a real, non-null `categoryId`, no client-side fallback involved). Separately,
note that `AiCategorizationService.CategorizeTransactionAsync` (used by SMS, CSV, and SePay
sync) silently falls back to `categoryId: null` on any Gemini provider failure, logged only as
a warning — if AI categorization stops working across all of SMS/CSV/SePay/photo at once, check
that backend log path and the configured Gemini model/API key before assuming a code bug.

There is no category-request feature (never had an admin-approval UI, removed
as a concept months ago) — don't reintroduce it.

## Data flow: screen → hook → services barrel → real backend

- All entity data goes through TanStack Query hooks in `src/hooks/` (`useWallets`,
  `useTransactions`, etc.) — never call `@/services` functions directly from a
  component.
- Every cache key is centralized in `src/lib/queryKeys.ts` (`queryKeys.*`) with named
  `STALE_TIME` buckets (`short`/`medium`/`long`/`reference`). Add new keys there
  rather than inlining query key arrays — invalidation is prefix-matched on
  `queryKeys.X.all()`, so mutations must invalidate through the same builders queries
  use.
- Zustand (`src/stores/`) is for UI/session state only (`authStore`,
  `preferencesStore`) — not server data.

## Auth & networking

- `src/lib/api.ts` is the Axios instance for the .NET API. Request interceptor
  attaches the JWT from secure storage (`src/lib/mmkv.ts` — backed by
  `expo-secure-store`, not MMKV; the filename is legacy); response interceptor does
  single-flight refresh-token rotation on 401 and retries, clearing the session via
  `authStore` if refresh fails.
- Backend responses are enveloped (`{ success, message, data }`); use `unwrap()` from
  `src/lib/api.ts` to pull the typed payload out.
- `app/index.tsx` is the auth gate: redirects to `(auth)`, `onboarding`, or
  `(tabs)/home` based on `authStore` state. `app/_layout.tsx` blocks render until
  fonts are loaded and the session is rehydrated (`useBootstrapSession`).
- `app/_layout.tsx` also exports an `ErrorBoundary` (Expo Router convention) that
  catches render errors app-wide, and `app/+not-found.tsx` handles unmatched routes.

## Routing

Expo Router v6, file-based — `app/` IS the navigation tree. Route groups:
`(auth)` (login/register/password flows), `(tabs)` (home, transactions, wallets,
budgets, entry — the main authenticated app), plus top-level modal-style routes
(`onboarding.tsx`, `link-bank.tsx`, `link-sepay*.tsx`, `notifications.tsx`,
`settings/`).

## Design tokens & icons

- All colors/spacing/radius/font come from `src/theme/` (`COLORS`, `SPACING`,
  `BORDER_RADIUS`, `FONT_SIZE`, `FONT_WEIGHT`, `SHADOW`, `withAlpha`) — always
  imported from the `@/theme` barrel (`src/theme/index.ts`), never from the
  individual `colors.ts`/`spacing.ts`/`typography.ts`/`shadows.ts` files
  directly. No hardcoded hex or raw numbers in component styles. Styling is
  plain RN `StyleSheet`, not Tailwind/NativeWind or styled-components.
- Light mode exists (`LIGHT_COLORS` in `src/theme/colors.ts`, resolved via
  `useThemeColors()`/`ThemeProvider`) and is a live, user-facing feature — see
  the theme picker in `app/settings/index.tsx`. Migration is complete: every
  screen/component reads colors via `useThemeColors()`. The one exception is
  `app/_layout.tsx`'s root `ErrorBoundary`, which imports the theme-invariant
  `COLORS` (a fixed alias for `DARK_COLORS`) directly, since it can render
  before `ThemeProvider` mounts — that's the only legitimate use of `COLORS`
  in new code.
- Icons are Material Symbols only, via `<MaterialIcon name="..." />`
  (`src/components/common/MaterialIcon.tsx`), rendered as ligature text in the
  `Material Symbols Outlined` font loaded in `app/_layout.tsx`. `ICON_MAP` in that
  file maps legacy Lucide-style names to Material Symbol names — prefer the Material
  Symbol name directly for new code.

## Component file structure

House style (not the generic "component → subcomponents → helpers → static →
types" ordering some style guides suggest) is: imports → types/interfaces →
exported component → local helpers/subcomponents → `StyleSheet.create` last.
Types are hoisted above the component, not below it. Follow this ordering for
new component files rather than the generic convention.

## Path alias

`@/*` → `src/*` (set in both `tsconfig.json` and Jest's `moduleNameMapper`).

## Repo-specific conventions

- `TouchableOpacity activeOpacity={0.7}` or `Pressable` for tappable elements.
- Vietnamese UI strings live as named constants in data files (`src/data/`,
  `src/constants/`), not inlined in JSX.
- `.fallowrc.jsonc` disables the `duplicate-exports` dead-code rule because the
  services barrel (`src/services/index.ts`) intentionally re-exports every
  `real/*` function under the same name — don't "fix" that pattern.
- `eslint.config.js` intentionally downgrades several `react-hooks` v6
  compiler-readiness rules (`refs`, `set-state-in-effect`, `immutability`,
  `purity`) to warnings — the React Compiler is not enabled in this project
  (`babel.config.js` only runs the Reanimated plugin), so those diagnostics flag
  intentional, runtime-safe idioms.
- Charts use `react-native-gifted-charts`; there is no Victory Native dependency in
  this repo.
- Stitch is the visual-design source of truth (screens/layout/colors); it's
  referenced via `scripts/fetch-stitch.sh` and the `mcp__stitch__*` tools, not
  checked into a single spec file in this repo.
