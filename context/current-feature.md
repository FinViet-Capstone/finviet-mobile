# Current Feature

<!-- Feature name and short description -->
Fix: SePay OAuth bank-linking. `app/link-sepay.tsx` never calls the backend's
`GET /wallets/sepay/authorize-url` endpoint — it hand-builds the authorize URL, `client_id`,
`redirect_uri`, and a throwaway `state` client-side, and targets a callback endpoint
(`/api/wallets/sepay/callback`) that doesn't exist anywhere in the backend's route table. Last
of the branches from the FE↔BE API reconciliation pass (see Notes).

## Status

<!-- Not Started | In Progress | Completed -->
Completed (this branch's scope — not yet verified on-device; needs a real/sandboxed SePay
OAuth app to exercise end-to-end)

## Goals

<!-- Goals and requirements -->
- Add `getSepayAuthorizeUrl()` to `real/sepay.ts` (`GET /wallets/sepay/authorize-url` →
  `{ authorizeUrl, state, expiresAt }`) and thread the returned `state` through to
  `linkSepayAccount()` and `getSepayBankAccounts()` (both now accept an optional `state` param
  per the backend's `LinkSepayAccountRequest`/`SepayBankAccountsRequest`).
- Rework `app/link-sepay.tsx`: remove `SEPAY_AUTHORIZE_URL`, `EXPO_PUBLIC_SEPAY_CLIENT_ID`,
  `getSepayRedirectUri()`, `buildAuthorizeUrl()`, and the random `state` — fetch the real URL
  from the backend before showing the WebView (new loading phase), open that URL, and pass the
  backend-issued `state` through on code capture.
- Add `getSepayLinks()` (`GET /wallets/sepay/links`) and `unlinkSepayAccount()`
  (`DELETE /wallets/{id}/sepay-link`) — real usability gaps flagged in the original
  reconciliation: there's currently no way to detect an expired OAuth token before a sync
  silently fails, and no way to disconnect a linked wallet short of deleting it outright.
- Wire both into the wallet detail screen (`app/(tabs)/wallets/[id].tsx`): a relink-required
  banner for a linked wallet whose token has expired, and an "Ngắt kết nối" action.
- Out of scope: `sync-all` and webhook-registration endpoints (lower priority per the original
  plan — sync-all is a convenience over the existing per-wallet sync, and webhook
  registration is already best-effort automatic during link). Bank-account picker UI for
  `getSepayBankAccounts()` (not currently wired to any hook/screen — linking already defaults
  to the first active account server-side; out of scope to add a picker here).

## Notes

<!-- Any extra notes -->
Full FE↔BE reconciliation findings and branch grouping are in
`C:\Users\Lenovo\.claude\plans\here-s-what-backend-has-woolly-barto.md`. This was flagged as
the single highest-confidence, most concrete bug in that reconciliation (§1, "Critical —
likely-broken feature") — verified against `finviet-be`'s actual controller/DTO source
(`WalletsController.cs`, `SepayWalletDtos.cs`), not just the doc summary.

## History

<!-- Keep this updated. Earliest to latest -->
- 2026-08-10 — Previous two branches (shipped-endpoint wiring; transaction-edit + goal-ledger
  wiring) merged to `dev`. Started this feature — confirmed exact DTO shapes against the
  backend's actual C# source (`SepayWalletDtos.cs`, `WalletsController.cs`) since the
  markdown reference summarizes rather than repeating full field lists for SePay.
- 2026-08-10 — Implemented: `getSepayAuthorizeUrl()`/`getSepayLinks()`/`unlinkSepayAccount()`
  added to `real/sepay.ts`; `linkSepayAccount()`/`getSepayBankAccounts()` now accept an
  optional `state`; matching hooks (`useSepayLinks`, `useUnlinkSepayAccount`) added to
  `useWallets.ts`. Reworked `app/link-sepay.tsx`: removed the hand-built authorize URL/
  `client_id`/`redirect_uri`/random `state`/guessed callback endpoint entirely, replaced with
  a `loading` phase that fetches the real authorize URL from the backend first. Added a
  relink-required banner and "Ngắt kết nối" unlink action to the wallet detail screen.
  Deferred sync-all and webhook-registration endpoints (lower priority, not part of the core
  bug). type-check/lint/64 tests all pass. Not yet verified on-device — needs a real or
  sandboxed SePay OAuth app to exercise the full flow, which wasn't available in this
  environment.
