# Current Feature

<!-- Feature name and short description -->

Wire CSV import (`app/(tabs)/entry/csv-import.tsx`) to the backend's real
`POST /extract/csv` endpoint instead of parsing files entirely client-side,
and correct stale "AI is mock-only" framing in `context/project-spec.md` (the
real AI wiring — spending score, weekly report, chat — already exists in
`src/services/real/reports.ts` and is fully functional once
`EXPO_PUBLIC_USE_MOCK=false`; nothing to build there). Companion backend work
in `finviet-be`: documented two previously-undocumented health/status
endpoints and removed a resolved TODO doc. This session also sets up local
device testing against the backend over LAN.

Google OAuth wiring (`googleOAuth()` → Firebase → `POST /auth/google-login`)
is part of the same planning round but is a separate, larger effort — needs
Firebase project files (`google-services.json` /
`GoogleService-Info.plist`) and a custom dev-client rebuild, so it is tracked
here but sequenced after CSV/docs land.

## Status

<!-- Not Started | In Progress | Completed -->

Completed — awaiting commit approval (Google OAuth remains out of scope for
this branch, blocked on Firebase project files from the user)

## Goals

<!-- Goals and requirements -->

- `src/services/mock/extraction.ts` / `src/services/real/extraction.ts`: add
  `extractFromCsv`, mirroring the existing SMS/photo pattern but returning
  multiple rows (the backend's `POST /extract/csv` returns
  `ExtractResponse.rows[]`, not a single result).
- `src/services/index.ts`: export `extractFromCsv` through the `USE_MOCK`
  branch; update the header comment to list CSV as wired-real.
- New `src/hooks/useExtractFromCsv.ts` mirroring `useExtractFromSMS.ts`.
- `app/(tabs)/entry/csv-import.tsx`: replace the local
  `parseCsvContent`/`parseCsvLine`/header-matching logic with a call to the
  new hook; map backend rows to the existing `ParsedRow[]` UI state; keep
  client-side duplicate detection (UI-only concern) and keep
  `suggestCategoryFromMerchant` only as a fallback when the backend returns
  no `categoryId`.
- `context/project-spec.md` Features §E: correct the claim that AI is
  "currently static mock content" — the real backend-wired path already
  exists and works once `USE_MOCK=false`.
- `.env.local`: point at the local backend over LAN for this session's
  device testing (gitignored, no commit needed).
- Out of scope for this branch: Google OAuth (separate, larger effort — see
  above), photo/receipt OCR (backend endpoint exists but always 503s, no FE
  work unblocked), subscriptions (no backend).

## Notes

<!-- Any extra notes -->

- Full investigation (comparing `finviet-be` controllers/docs against
  `finviet-mobile`'s `src/services/{mock,real}` mock⇄real swap) found almost
  the entire backend surface already wired to real — wallets, transactions,
  budgets, goals, categories, notifications, rules, SePay, and reports/AI are
  all real. CSV extraction was the one genuine unwired-but-working endpoint.
- Backend AI provider is switching from local Ollama to Gemini (Google AI
  Studio key, user pasting it in directly on the backend side) — no FE
  impact, the mobile app only ever talks to `/ai/*`, never the model
  provider. Just means `finviet-be/docs/ollama-setup.md` won't be what's used
  for this session's AI verification.
- Testing this session: physical device over LAN. Machine's LAN IP at the
  time of writing: `10.3.73.232` (re-check with `ipconfig` if it changes,
  matching this repo's existing `.env.local` convention).
- No commit or push without explicit user permission.

## History

<!-- Keep this updated. Earliest to latest -->

- 2026-08-13 — Started. Branch `feature/csv-extraction-wiring` created from
  `dev` (pre-existing uncommitted `app.json`/`eas.json`/`package.json`
  EAS-build-config WIP on `dev` carried over untouched — it's needed for this
  same session's LAN `http://` testing via `expo-build-properties`'
  `usesCleartextTraffic`).
- 2026-08-13 — Implemented CSV wiring: `CsvExtractionRow`/`CsvExtractionResult`
  types added to `src/types/extraction.ts`; `extractFromCsv` added to
  `mock/extraction.ts` (canned 2-row sample) and `real/extraction.ts`
  (multipart `POST /extract/csv`, reusing the existing `ExtractedRowDto`
  mapper pattern extended to a full array); exported through
  `src/services/index.ts` (also fixed a stale header-comment claim that
  custom-category creation was mock-only — `real/customCategories.ts` already
  implements it against a real endpoint); new `src/hooks/useExtractFromCsv.ts`
  added to the hooks barrel; `app/(tabs)/entry/csv-import.tsx` reworked to
  call the new hook instead of its former ~150-line client-side CSV parser
  (`parseCsvContent`/`parseCsvLine`/header-matching/`normalizeDate`/
  `normalizeAmount` all removed), keeping only client-side duplicate
  detection and the merchant-rule fallback for rows the backend's AI
  couldn't categorize; updated the `aiBadge` copy since categorization is now
  real AI, not just saved-rule matching.
- 2026-08-13 — Corrected stale "AI is mock-only" claims in
  `context/project-spec.md` (intro paragraph, Features §A extraction-methods
  bullet, Features §E, Tech Stack `USE_MOCK` bullet) — the real AI/reports
  path (`src/services/real/reports.ts`) and CSV extraction are both fully
  wired to the backend already; only photo-OCR (backend endpoint exists but
  no real OCR provider, always 503) and subscriptions (no backend) remain
  mock-only.
- 2026-08-13 — Set `.env.local` for this session's physical-device-over-LAN
  testing: `EXPO_PUBLIC_USE_MOCK=false`,
  `EXPO_PUBLIC_API_BASE_URL=http://10.3.73.232:5122/api` (gitignored, no
  commit). `npm run type-check` clean, `npm run lint` 0 errors / 84
  pre-existing warnings (none newly introduced — verified none touch the
  changed files beyond one pre-existing warning on an untouched effect in
  `csv-import.tsx`). Awaiting commit approval; on-device verification is the
  user's to do (no device access in this environment).
