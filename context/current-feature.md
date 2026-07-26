# Current Feature

<!-- Feature name and short description -->
Custom-category creation with a device-local user-picked icon (svg/png), plus the icon-rendering overhaul needed to display it. Second half of item 1 in `context/fe-plan-2026-07-revamp.md` (category-request removal was the first half, already committed as a separate commit on this same branch — see note below).

## Status

<!-- Not Started | In Progress | Completed -->
Completed (contained first pass — see Notes)

## Goals

<!-- Goals and requirements -->
- New `CustomCategory` type + mock/real service (real forwards to mock — no BE endpoint yet) + hooks.
- New on-device-only icon storage (`lib/categoryIconStorage.ts`) using `expo-file-system`'s new sync File/Directory API — the icon file never syncs anywhere, only the category's name/bucket/color does.
- New `expo-document-picker` dependency for picking the icon (not `expo-image-picker` — that only surfaces camera-roll photos, and SVGs generally aren't photo-library assets).
- New `resolveCategoryVisual()` / `useCategoryVisual()` / `<CategoryIcon>` — resolves a category id (system or customer-created) to a renderable icon, replacing raw `<MaterialIcon name={cat.icon}>` at the point of use.
- Wired end-to-end into `app/settings/categories.tsx`: the header "+" button opens `CustomCategorySheet` (name, bucket, color, icon picker), and custom categories now appear in their bucket's list with their own icon.

## Notes

<!-- Any extra notes -->
**Deliberately scoped down from the plan doc's literal wording** ("this replaces `<MaterialIcon>` calls at every category-icon render site"). Audited all ~10 call sites of `getCategoryIcon()` across 9 files (transaction detail/picker, CSV import preview, budgets `CategoryRow`, `CategoryBadge`, `RecentTransactionsList`, `transactionCardVisuals.ts`) — every one resolves the category via `getCategoryById()`/`CATEGORIES.find()`, which only searches the static system catalog. Making custom categories show up correctly there needs real category-*lookup* changes at each site, not just an icon-rendering swap, and I have no simulator/browser to visually verify any of it in this environment. Confirmed with the user to do a contained first pass instead: full working creation flow + icon storage + rendering, wired into the one screen where categories are created/managed (Settings > Categories). The other 9 call sites are an explicit, separate follow-up — flag before touching them, since it's real behavior change in transaction/budget/import screens that deserves a visual check first.

**Process note:** this was implemented as a second commit on the `feature/remove-category-requests` branch rather than a fresh branch — I continued directly after the previous commit without branching first. Not a data problem, just means these two commits (category-request removal, custom-category creation) will land together rather than via two separate branches.

**Also deferred:** bucket reassignment for custom categories (`canMove: false` in `CategoryBucketCard`) — lands with item 5's drag-and-drop, which needs to handle system and custom categories uniformly anyway.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-27 — Started (as a continuation on feature/remove-category-requests, not a new branch).
- 2026-07-27 — Implemented per Goals above. Installed `expo-file-system` + `expo-document-picker`. `type-check`/`lint`/`test` all pass — no lint warnings in any new/touched file. UI rendering itself (SVG/PNG display, picker flow) could not be visually verified — no RN simulator/browser available in this environment. Completed (contained scope).
