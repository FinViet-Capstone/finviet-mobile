# FE Plan: Category System, Settings, Bank-Linking & Budget Revamp

**Status:** Reconciled with BE 2026-07-26 (see "Reconciliation with BE" section at the end) — implementation not started. Each item below will get its own `context/current-feature.md` cycle + feature branch when work begins, per `context/ai-interaction.md`.

## Context

The team just committed a stricter workflow (`context/ai-interaction.md`, `context/current-feature.md` template, `context/project-spec.md`). Before starting BE work on a companion repo, we need FE-side agreement on five changes surfaced during review of the current mobile app and two Stitch reference screenshots (a YNAB-style per-category "Target" panel with Weekly/Monthly/Yearly/Custom cadence and a "Next month I want to..." rollover choice):

1. Category requests are pointless (no user will ask an admin to approve an icon/color/name) — replace with admin-seeded system defaults + a device-local custom-icon flow.
2. Settings is mostly non-functional ("ghost" rows) and needs a real refactor.
3. Finverse never went live (blocked on BankHub approval) and SePay is the only working sync provider — remove Finverse entirely.
4. Income and budget-allocation (%) currently have no update rules, causing two failure modes: (a) effectively locked forever in practice, or (b) frequent edits silently reshuffle the budget-adherence score, making it meaningless.
5. Category management has a decorative drag handle but no working drag-and-drop to reassign a category's bucket.

**Correction (post-BE-review):** this was originally written as "FE-only, nothing touches the backend." After BE audited it against the real backend code, that held for only 1 of 5 items (drag-and-drop, item 5) — items 1, 2, and 4 each need a small-to-medium new backend piece, and item 3 (Finverse removal) needs its own full backend removal cycle, not just an FE change. See "Reconciliation with BE" at the end for the item-by-item breakdown and the confirmed BE build order.

Decisions made:
- Income/allocation updates: **snapshot + next-month-effective** (not immediate, not a raw cooldown).
- Category drag-and-drop: **full 3-bucket mobility**, including Savings (this reverses the currently-documented "Savings is immutable" invariant in `src/constants/categories.ts` and `src/services/mock/customerCategories.ts` — those comments/guards will be removed as part of item 5).

---

## 1. Remove Category Requests → Admin-Seeded Defaults + Local Custom Icons

**Current state:**
- `src/types/category.ts:40-58` defines `CategoryRequest`/`CategoryRequestStatus` (pending/approved/rejected) with no approval UI — it's write-only from the client.
- Mock/real services: `src/services/mock/categoryRequests.ts`, `src/services/real/categoryRequests.ts`, wired in the barrel at `src/services/index.ts:32-33,135-139`.
- Hook `src/hooks/useCategoryRequests.ts`, query key at `src/lib/queryKeys.ts:69-70`.
- UI: `app/settings/category-requests.tsx` (list + submit), `src/components/categories/CategoryRequestSheet.tsx` (the submit form — name/type/suggested-bucket/notes, **no icon or color fields exist today**), `src/components/settings/CategoryRequestListScreen.tsx`.
- `app/settings/categories.tsx:11,64-72,98-103` also reuses `CategoryRequestSheet` as its "add category" affordance.
- Categories today are a hardcoded array (`src/constants/categories.ts`) with a Lucide icon *slug* per category, translated at render time to a Material Symbols ligature via `src/constants/categoryIcons.ts` `ICON_MAP`. No SVG rendering path exists for category icons despite `react-native-svg@15.12.1` already being a dependency (used elsewhere, e.g. charts).
- No on-device file storage exists (`expo-file-system` is not installed); `expo-image-picker` is already used for receipt OCR (`app/(tabs)/entry/photo.tsx`) and can be reused for icon picking.

**Planned FE changes:**

a) **Delete the request flow outright**: `CategoryRequest*` type, both service modules, the hook, the query key, barrel wiring, the `/settings/category-requests` route, `CategoryRequestSheet`, `CategoryRequestListScreen`, and the "Yêu cầu danh mục" row in `settings/index.tsx:234-236`.

b) **New local custom-category flow**, replacing the "add category" entry point in `app/settings/categories.tsx`:
   - A new sheet: pick bucket → pick an image (svg or png only, via `expo-image-picker`, restricted to those two mime types) → name it → pick a color swatch.
   - New dependency: **`expo-file-system`**, used to copy the picked image out of the picker's cache URI into a persistent app-local directory (`FileSystem.documentDirectory + 'category-icons/'`) so the icon survives app restarts.
   - Per instructions, the icon file itself never leaves the device — no upload to R2 or the backend. Only the category's *metadata* (id, name, bucket, color, type) is a normal syncable record; the local icon file path is stored client-side only (a new MMKV-backed map, alongside the existing JWT storage in `src/lib/mmkv.ts`), keyed by category id, and is never included in API payloads.
   - New service module `customCategories.ts` (mock + real, barrel-wired like every other domain) exposing `createCustomCategory`, `getCustomCategories`, `deleteCustomCategory` — modeled after `CustomerCategory` but for categories that have no global `categoryId` (custom IDs will need a distinguishable prefix, e.g. `custom_<uuid>`, since `getCategoryById()` and friends only know the static system catalog).

c) **Icon rendering overhaul**: introduce a `resolveCategoryVisual(categoryId)` helper (system catalog first, then the new custom-category store) returning a normalized `{ nameVi, color, bucket, iconKind: 'material' | 'svg-remote' | 'local-file', iconRef }`. A new `<CategoryIcon>` component branches on `iconKind`:
   - `material` — today's `<MaterialIcon>` ligature path (kept as the fallback for the existing static system categories until the backend ships admin-managed SVGs).
   - `svg-remote` — renders an SVG URL from the backend catalog via `react-native-svg`'s `SvgUri`/`SvgXml` (this is the FE side of Flow 1's admin-seeded defaults).
   - `local-file` — renders the on-device file (SVG via `SvgUri`, PNG via `<Image>`), for user-picked custom icons.
   - This replaces direct `<MaterialIcon name={cat.icon}>` calls at every category-icon render site: transaction rows, category pickers, `SetLimitSheet`, `CategoryBucketCard`, budget cards. This is the one genuinely cross-cutting piece of this item — flagging it clearly rather than understating it as a one-file change.

**Key files:** delete the 7 files/routes listed in (a); add `customCategories.ts` (mock+real), `CategoryIcon.tsx`, an icon-picker sheet, `resolveCategoryVisual()`; touch `app/settings/categories.tsx`, `CategoryBucketCard.tsx`, and every existing `<MaterialIcon name={cat.icon}>` call site.

**BE dependency (confirmed 2026-07-26):** custom categories are meant to categorize real transactions/budgets, not just exist as decoration — BE is building a new customer-scoped `POST /api/categories/custom` endpoint (server-generated `custom_<uuid>` id) for this. `customCategories.ts`'s real implementation targets that endpoint once it ships; build against the mock in the meantime. The icon file itself still never leaves the device — only name/bucket/color/type sync, unchanged from the original plan.

---

## 2. Settings Screens Refactor

**Current state of `app/settings/index.tsx`** — confirmed ghost rows (no working `onPress`/mutation):
- "Thu nhập hàng tháng" (income, L222-224) — no-op.
- "Cảnh báo ngân sách" (L252-253) — hardcoded "80% và 100%" text, no-op.
- "Ngôn ngữ" / "Đơn vị tiền tệ" / "Giao diện" / "Bảo mật (Face ID)" (L269-280) — all no-op.
- "Đổi mật khẩu" (L292), avatar edit + "Chỉnh sửa hồ sơ" (L207-215) — no-op.
- Confirmed working today (leave as-is): budget-allocation, categories, notification toggles, subscription, export, delete-account, logout.

**Plan — split ghost rows into "wire up for real", "blocked on a new BE endpoint", "remove until it's a real feature", and "build for real" (theme):**
- **Wire up now** (backing already exists in the codebase, just not connected):
  - Income row → navigate into the budget-allocation screen (which item 4 below reworks).
  - Avatar + "Chỉnh sửa hồ sơ" → wire to `expo-image-picker` + the existing `uploadAvatar()` real-service function (`src/services/real/auth.ts:164-179`) and `useUpdateProfile()` for the display name.
- **Blocked on new BE endpoints (correction post-BE-review):** two rows originally filed under "wire up" turned out to have no real backend behind them at all today:
  - "Đổi mật khẩu" → `ChangePasswordSheet` (`src/components/auth/ChangePasswordSheet.tsx`) is fully built and already calls `useChangePassword()` with `{currentPassword, newPassword}` — but `real/auth.ts:27-28` explicitly force-routes it to the **mock** regardless of `USE_MOCK` ("changePassword has no .NET endpoint yet"). BE is building `POST /api/auth/change-password`; once it ships, `real/auth.ts` needs its two-line mock-forward removed and pointed at the real endpoint. FE UI work (surfacing the row) can proceed now against the mock; the real fix is a 1-line service swap once BE ships.
  - "Cảnh báo ngân sách" (moved out of "remove", see below) and "Giao diện" (theme) both need a new settings endpoint from BE (`Theme`/`NotifBudgetThresholds` columns exist in the DB but nothing reads/writes them yet) before they can persist for real.
- **Remove for now** (no supporting system exists anywhere in the app — leaving them would just be new vaporware):
  - "Ngôn ngữ" — app is Vietnamese-only, no i18n system.
  - "Đơn vị tiền tệ" — VND is hardcoded app-wide (`formatVND` everywhere), no multi-currency support.
  - "Bảo mật (Face ID)" — `expo-local-authentication` isn't installed; no biometric-lock feature exists.
- **Correction — keep and wire up, don't remove:** "Cảnh báo ngân sách" (budget alert threshold) was originally slated for removal on the assumption that no configurable-threshold concept exists. BE corrected this: real 80%/100% budget-alert notifications already fire server-side, and an unused `NotifBudgetThresholds` column already exists on customer settings for exactly this row. Since most of the pieces already exist, wire it up (read/write via the new settings endpoint, BE's alert logic switches from hardcoded 80/100 to reading the column) instead of deleting a real, working feature's only user control.
- `src/stores/preferencesStore.ts` is a Zustand store for `language/theme/defaultWalletId/defaultCurrency`, **not persisted**, and disconnected from `Customer.language/theme/defaultCurrency` — two parallel, half-wired sources of truth. Since language/currency rows are being removed above, trim this store down to just `defaultWalletId` (the one thing actually used) rather than carry dead state. `theme` moves fully to the new system below.

**Build for real — light/dark theme system ("Giao diện" row):**

This is bigger than the other Settings fixes, worth sizing honestly: `src/constants/theme.ts:4` today defines exactly **one** static `COLORS` palette (explicitly commented "Purple/Dark Theme" — there is no light palette at all yet), and it's imported directly in **80 files**, almost always to build a module-scope `StyleSheet.create({...})`. RN's `StyleSheet.create` bakes in values at creation time — it doesn't re-evaluate when a color object mutates — so real theme-switching isn't a flag flip, it requires making every consumer reactive to the active theme.

Planned approach, in two waves so it stays reviewable per the branch-per-item workflow:
- **Wave 1 (in scope now):**
  1. Split `theme.ts`: rename the current palette to `DARK_COLORS`, author a matching `LIGHT_COLORS` with the same semantic keys (`primary`, `surface`, `onSurface`, etc.) — check Stitch for an existing light variant first since Stitch is the visual-design source of truth per CLAUDE.md; author to Material Design 3 light-scheme conventions if none exists.
  2. New `ThemeProvider` + `useThemeColors()` hook (React Context) resolving the active palette from `Customer.theme` ('light'/'dark'/'system') plus RN's `useColorScheme()` for the 'system' case. `SPACING`/`BORDER_RADIUS`/`FONT_SIZE`/`FONT_WEIGHT` stay theme-invariant, untouched.
  3. Wire the "Giao diện" row to a real light/dark/system picker calling `useUpdatePreferences({ theme })`. **Correction post-BE-review:** this is not just "surface an existing wire" — `useUpdatePreferences` today only reaches the mock; the DB has a `Theme` column but nothing reads or writes it server-side yet. Local device-only switching (no persistence) can ship immediately; persisting the choice depends on BE's new settings endpoint.
  4. Migrate the highest-leverage files first — `src/components/common/*` primitives (`Card`, `Button`, `Badge`, `ScreenHeader`, etc.) and the tab bar/app shell — from static `COLORS.x` to `const colors = useThemeColors()` + a `createStyles(colors)` factory called via `useMemo`. Migrating shared primitives makes every screen that uses them partially theme-aware for free.
- **Wave 2 (follow-up, separate branches, one at a time):** migrate the remaining ~65 domain-screen files (transactions, budgets, wallets, onboarding, charts, etc.) off static `COLORS` the same mechanical way, in small batches, each verified visually in both light and dark mode before merging — this is real effort, not a one-line change, and shouldn't be bundled into the same branch as Wave 1's infrastructure.

**Key files:** `app/settings/index.tsx` (row removals + wiring), `src/stores/preferencesStore.ts` (trim), `src/constants/theme.ts` (palette split), new `ThemeProvider`/`useThemeColors()`, `src/components/common/*` (Wave 1 migration), plus the "Yêu cầu danh mục" row removal from item 1.

---

## 3. Remove Finverse, Keep SePay Only

**Current state:** Finverse and SePay are two fully independent code paths — no shared `provider` type/enum exists; both are real-backend-only (no mock, bypass the `USE_MOCK` barrel entirely, imported directly from `@/services/real/*`). Provider identity today is inferred by string-matching (`walletName.includes('sepay')`), not a typed field.

- **Finverse (delete entirely):** `app/link-bank.tsx` (OAuth WebView screen), `src/services/real/finverse.ts` (sole module — `FinverseLink`, `createFinverseLink`, `completeFinverseLink`, `syncFinverseWallet`), `useSyncFinverseWallet` in `useWallets.ts:17,115-124` and its re-export in `hooks/index.ts:11`, the "Liên kết ngân hàng qua Finverse" coming-soon card in `OnboardingWallet.tsx:178-198`, the `optionFinverse: 'Finverse (BankHub)'` entry in `AddWalletSheet` (`app/(tabs)/wallets/index.tsx:37-38,78-106`), and the Finverse branch of the sync-button logic in `wallets/[id].tsx:56,79-89`.
- **Simplify SePay branching:** since Finverse goes away, the `walletName.includes('sepay')` string-check branch in `wallets/[id].tsx` collapses to a single code path (every linked wallet is SePay).
- **Onboarding:** update the step-4 "Liên kết ngân hàng" comment/copy in `onboarding.tsx:107-118` to stop referencing Finverse.
- **Docs:** update `docs/integration-status.md` to drop the Finverse rows (currently marked blocked/pending BankHub approval).
- **Flagged, not auto-removing:** `app/link-sepay.tsx` is a second, currently-*unused* SePay OAuth2 screen (the active path is `link-sepay-token.tsx`, a comment in `wallets/index.tsx` says the OAuth2 screen "stays available for future multi-user linking"). Only Finverse is being removed here — this file stays unless a separate decision is made to drop it too.

**Key files:** the ones listed above; nothing in `src/services/real/sepay.ts` needs to change beyond what the branching cleanup in `wallets/[id].tsx` touches.

**Correction post-BE-review:** this is not FE-only. BE has a full Finverse integration (entity, external-service client, wallet-sync service, controller actions, DI registrations, config, docs) to remove as its own cycle, plus a `WalletType.FinverseLinked` enum value (including a Postgres enum) that needs a migration — BE is confirming there are ~zero live `finverse_linked` wallet rows before writing it, since Finverse never went live. Structurally isolated from SePay on both sides, so FE and BE can each remove it independently without coordinating a shared cutover window.

---

## 4. Income / Budget-Allocation Update Rule (Snapshot + Next-Month-Effective)

**Current state (root cause of both errors described):**
- `Customer.monthlyIncome/needsPct/wantsPct/savingsPct` (`app/settings/budget-allocation.tsx`) are a single mutable record with no history — any edit is both immediate and retroactive.
- Worse, the mock bucket-summary calculator (`src/services/mock/budgets.ts:185-283`) doesn't even read those settings: `BUCKET_ALLOCATION` is a **hardcoded 50/30/20** (L185-189), and the "income" used for `allocationCap` is the **sum of that month's income transactions** (L200-203), not the customer's declared `monthlyIncome` at all. So today, changing the Settings allocation sliders doesn't even affect the adherence score — it's silently ignored, which is arguably worse than either error named.

**Planned rule:** a new versioned record, e.g.
```ts
interface IncomeAllocationSetting {
  id: string;
  customerId: string;
  effectiveMonth: string; // 'YYYY-MM'
  monthlyIncome: number;
  needsPct: number; wantsPct: number; savingsPct: number;
  createdAt: string;
}
```
- `scheduleIncomeAllocationChange(input)` always writes/overwrites the entry for **next calendar month** — editing again before rollover just revises the pending draft, it never touches the current or past month's entry. This directly satisfies "not locked forever" (a change can always be scheduled) and "no more score drift from frequent edits" (past and current-month scores are pinned to whatever was effective when that month started).
- `getEffectiveIncomeAllocation(month)` resolves the most recent entry with `effectiveMonth <= month` (carry-forward semantics; falls back to onboarding defaults for a first-time customer).
- `getBudgetBuckets(range)` in `mock/budgets.ts` switches from the hardcoded 50/30/20 + transaction-summed income to `getEffectiveIncomeAllocation(range.month)` — this is the one-line-of-intent, multi-line-of-code fix that makes the whole rule actually matter, and also fixes the pre-existing bug above as a side effect.
- `useBucketSpend.ts` needs no change — it only totals *spend*, not caps.
- **Settings UI:** `app/settings/budget-allocation.tsx` changes from "edit and save immediately" to a "current (locked, read-only for this month) vs. scheduled-for-next-month (editable)" layout — mirroring the "Next month I want to..." pattern from the reference screenshots. The ghost income row in `settings/index.tsx` (item 2) now has a real destination.
- This introduces a genuinely new backend contract (a history table, not a single mutable row) — worth flagging explicitly since it's the main thing the BE plan will need to design around.

**Key files:** `src/services/mock/budgets.ts` (+ its `real/budgets.ts` mirror), a new `incomeAllocation.ts` service module (mock+real, barrel-wired), `app/settings/budget-allocation.tsx`, `app/settings/index.tsx` (income row).

**Confirmed post-BE-review:** the exact same bug exists on the real backend — a single mutable income/allocation row, overwritten in place immediately, read live even for past-month bucket-summary requests. BE is building the matching history table + `scheduleIncomeAllocationChange`/`getEffectiveIncomeAllocation` semantics on their side, and switching their bucket-summary endpoint to resolve through it — this is confirmed as the correct target. **Also confirmed which score this is for:** the app has a second, unrelated "AI Spending Score" (`src/types/ai.ts` `SpendingScore` — a weekly, qualitative 0-100 AI-generated score with Vietnamese commentary, already snapshotted per week, surfaced at `app/(tabs)/home/score.tsx`). The Stitch reference screenshots' dollar-amount "Target" panel (cadence picker, "By [date]", "Next month I want to...") has nothing to do with that — it maps to this item's budget-bucket/allocation adherence system. BE's assumption was correct; no change needed on either side from this question.

---

## 5. Category Drag-and-Drop (Move Between Buckets)

**Current state:** `CategoryBucketCard.tsx` renders a `drag_indicator` icon at three nesting levels (L76,110,142) that is purely decorative. The only working move mechanism is a tap-triggered `swap_horiz` button that toggles a category directly to the *other* bucket (`app/settings/categories.tsx:31-37`), and it's hard-restricted to Needs↔Wants — `moveBucket()` in `mock/customerCategories.ts:151-164` throws `'savings_locked'` on any move into or out of Savings, in both directions.
- No drag-and-drop library exists in the repo. `react-native-gesture-handler` (~2.28.0) and `react-native-reanimated` (~4.1.1) are already present and already power `DraggableSheet.tsx` (drag-to-dismiss), so this can be hand-rolled on the existing stack without a new dependency (cross-bucket dragging isn't well supported by off-the-shelf single-list reorder libraries like `react-native-draggable-flatlist` anyway).

**Plan:**
- Replace the decorative `drag_indicator` with a real `Gesture.Pan()` handle per category row. While dragging, track the finger's absolute Y position against the three `CategoryBucketCard` containers' measured bounds (`onLayout`) to determine the current drop-target bucket, with a visual highlight on the bucket being hovered.
- On release, call `moveBucket({ customerCategoryId, targetBucket })` — the same mutation used today, just reachable for all three buckets.
- Remove the `savings_locked` guard in `mock/customerCategories.ts` (both directions) and the corresponding "Savings bucket is immutable" doc comments in `constants/categories.ts` and `types/category.ts`, per the decision to unlock full mobility.
- The `swap_horiz` tap button can stay as a quick Needs↔Wants shortcut alongside the new drag gesture, or be removed in favor of drag-only — decide at implementation time.
- Sequencing note: this item touches the same `CategoryBucketCard`/`categories.tsx` files that item 1 reshapes (removing the request-sheet "add" affordance, adding the custom-icon flow), so it should be built *after* item 1 lands to avoid rework.

**Key files:** `CategoryBucketCard.tsx`, `app/settings/categories.tsx`, `mock/customerCategories.ts` (+ `real/categories.ts` bucket-override endpoint), `constants/categories.ts` doc comments.

**Correction post-BE-review:** Savings was never actually locked server-side — the buckets table has an `is_locked` flag but nothing reads it, and the real `PUT /api/categories/{id}/bucket` / `DELETE .../bucket` endpoints already support all three buckets today with no restriction. The `savings_locked` guard was an FE-mock-only invention, not a reflection of a real backend rule. So there's nothing to "reverse" on the backend — this item is fully compliant today; FE just needs to delete its own artificial restriction (the mock guard + the two doc comments) and build the drag gesture against the existing endpoint.

---

## Suggested Build Order

Each item still goes through the existing `context/current-feature.md` → branch → implement → test → commit cycle from `context/ai-interaction.md`, one at a time. FE and BE cycles run independently on their own repos — noting below where FE work is blocked waiting on a BE endpoint vs. free to proceed against the mock.

1. **Finverse removal (item 3)** — fully isolated on both sides, lowest risk. FE and BE can each remove their half independently, no coordinated cutover needed.
2. **Income/allocation rule (item 4)** — self-contained domain. FE can build the full mock-backed version immediately; switching `real/budgets.ts`/the new `incomeAllocation.ts` real implementation to live BE endpoints happens once BE ships its history table (BE lists this as their #2 priority too).
3. **Category system overhaul (item 1)** — remove requests, add local custom-icon flow, icon rendering overhaul. The custom-category *creation* flow can be built and demoed against the mock immediately; wiring `customCategories.ts`'s real implementation to `POST /api/categories/custom` is blocked on BE shipping it (BE lists this as their #4 priority, after Finverse/income-allocation/settings).
4. **Settings hub refactor (item 2), Wave 1** — ghost-row wiring/removal + the theme-system infrastructure and shared-primitive migration. Avatar/profile-edit and the income-row redirect can land immediately. "Đổi mật khẩu", "Giao diện" persistence, and "Cảnh báo ngân sách" persistence are blocked on BE's new settings + change-password endpoints (BE lists these as their #3 priority) — build the UI now against the mock, flip the 1-line service swap once BE ships.
5. **Category drag-and-drop (item 5)** — fully unblocked today (BE confirms the bucket-override endpoint already supports all 3 buckets); builds on the `categories.tsx`/`CategoryBucketCard` shape finalized in item 1.
6. **Theme system, Wave 2** — the remaining ~65-file screen-by-screen migration off static `COLORS`, done as its own follow-up sequence of small branches once Wave 1's infra has proven out.

## Reconciliation with BE (2026-07-26)

BE reviewed this plan against the real backend and sent back corrections + 4 open questions. All 4 are answered below from FE code evidence — no outstanding decisions blocking either side from starting:

1. **Do custom categories (item 1) need to attach to real transactions/budgets?** Yes — confirmed. That's the entire point of letting a user create one (to categorize transactions with their own icon); a custom category that couldn't be used on a transaction would be pointless. BE's new `POST /api/categories/custom` endpoint is needed.
2. **Does `ChangePasswordSheet` expect a real in-app old/new-password flow (not the email-reset flow)?** Yes — confirmed directly from code. `useChangePassword()` already calls a mutation with `{currentPassword, newPassword}`, and `src/services/real/auth.ts:27-28` explicitly says "changePassword has no .NET endpoint yet" and force-routes it to the mock. BE's proposed `POST /api/auth/change-password` (authenticated, current+new) matches exactly what the FE component already expects.
3. **Wire up "Cảnh báo ngân sách" instead of removing it?** Agreed — the plan's item 2 has been updated to move this row from "remove" to "wire up," since BE already has the real notification logic and just an unused column.
4. **Which score does the Stitch "Target" panel correspond to — budget-bucket adherence or the separate AI spending score?** Budget-bucket adherence (item 4) — confirmed. The AI Spending Score (`src/types/ai.ts`) is a weekly, qualitative 0-100 AI-generated score with narrative commentary; it has no dollar amounts, cadence, or "next month" concept and is unrelated to the Target panel's UI. BE's assumption was correct.

## Verification

No automated test suite covers UI interaction end-to-end in this app (per CLAUDE.md, `type-check`/`lint`/`test` is the standard loop, but feature correctness needs manual verification). For each item once implemented:
- `npm run type-check && npm run lint && npm test`
- Manual pass in Expo (`npm run android`/`ios`): custom-category creation end-to-end (pick image → persists across app restart); every Settings row either navigates correctly or is gone; wallet linking only ever offers SePay, no dangling Finverse imports/routes; budget-allocation screen shows current (locked) vs. next-month (editable) allocation and the adherence score for the current month doesn't move when a next-month change is scheduled; dragging a category into any of the 3 buckets (including Savings) persists after reload; switching the theme picker between light/dark/system actually re-colors the migrated screens with no leftover hardcoded-dark artifacts on the Wave-1 surfaces.

## History

- 2026-07-26 — Plan agreed. Implementation not started.
- 2026-07-26 — BE sent back a compliance review with corrections (Finverse removal, custom-category creation, and income-allocation history all need real backend work; Savings was never backend-locked; theme/change-password/budget-alert-threshold rows need new BE endpoints rather than being pure FE wiring) and 4 open questions. All 4 answered from FE code evidence; plan updated in place to reflect reconciled scope. No outstanding blockers to starting implementation on either side.
