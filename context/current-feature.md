# Current Feature

<!-- Feature name and short description -->
Remove Finverse bank-linking entirely. SePay becomes the only wallet-linking provider. See item 3 of `context/fe-plan-2026-07-revamp.md` for full rationale.

## Status

<!-- Not Started | In Progress | Completed -->
Completed

## Goals

<!-- Goals and requirements -->
- Delete the Finverse WebView link flow (`app/link-bank.tsx`) and its sole service module (`src/services/real/finverse.ts`).
- Remove `useSyncFinverseWallet` and all references to it.
- Remove the Finverse option from the add-wallet sheet (`app/(tabs)/wallets/index.tsx`) — SePay + basic only.
- Simplify the wallet-detail sync button (`app/(tabs)/wallets/[id].tsx`) to a single SePay-only code path.
- Remove the Finverse "coming soon" bank-link option from onboarding step 4 (no working bank-link path remains for onboarding once Finverse is gone; user can link SePay later from the Wallets tab).
- Update `docs/integration-status.md` and `CLAUDE.md` to stop describing Finverse as wired.
- No backend changes here — BE is removing its own Finverse integration in a parallel, independent cycle (see `context/fe-plan-2026-07-revamp.md` reconciliation section).

## Notes

<!-- Any extra notes -->
`app/link-sepay.tsx` (unused OAuth2 SePay screen, reserved for future multi-user linking) is left untouched — only Finverse is in scope.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-07-26 — Started.
- 2026-07-26 — Implemented: deleted `app/link-bank.tsx` + `src/services/real/finverse.ts`, removed `useSyncFinverseWallet` (hook + barrel export), simplified wallet-detail sync to SePay-only, removed the Finverse option from the add-wallet sheet, removed the dead `link-bank` route registration from `app/_layout.tsx`, removed the "linked" wallet-type option from onboarding (no working bank-link path remains there), updated `docs/integration-status.md`/`CLAUDE.md`/`context/project-spec.md` to stop describing Finverse as wired. `type-check`/`lint`/`test` all pass. Completed.
