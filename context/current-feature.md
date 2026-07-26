# Current Feature

<!-- Feature name and short description -->
Remove the category-request feature entirely. See item 1 of `context/fe-plan-2026-07-revamp.md` (first half — the local custom-icon replacement flow is a separate follow-up feature).

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Delete `CategoryRequest`/`CategoryRequestStatus` types, both mock/real service modules, the hook, the query key, and the barrel wiring.
- Delete the `/settings/category-requests` route, `CategoryRequestSheet`, and `CategoryRequestListScreen`.
- Remove the "Yêu cầu danh mục" row from `app/settings/index.tsx`.
- `app/settings/categories.tsx` currently reuses `CategoryRequestSheet` as its "add category" affordance — remove that entry point for now (the real replacement, a local custom-icon creation flow, is a separate follow-up feature per the plan; not adding a stub in its place).
- No backend changes needed here — BE confirmed the category-request table/flow is already gone server-side.

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-26 — Started.
- 2026-07-27 — Implemented: deleted `CategoryRequest`/`CategoryRequestStatus` types, both mock/real service modules, the hook, the query key, barrel wiring, the `/settings/category-requests` route, `CategoryRequestSheet`, and `CategoryRequestListScreen`. Removed the "Yêu cầu danh mục" row from `app/settings/index.tsx`. `app/settings/categories.tsx` no longer has an "add category" entry point (removed the header add button and the sheet); `CategoryBucketCard`'s "Add Sub-category" row now only renders when a handler is actually passed, so it can never become a ghost tappable no-op again. `type-check`/`lint`/`test` all pass. Completed.
