# FinViet — Integration Status

_Last updated: 2026-07-04_

Tracks how the mobile app (`finviet-mobile`) is wired to the .NET backend
(`finviet-be`), the goal for today's demo, and what still needs integrating.

---

## 1. App state

### Architecture
- **Mobile:** Expo / React Native. Service layer swaps mock ⇄ real on a single flag
  (`EXPO_PUBLIC_USE_MOCK`) via the barrel [`src/services/index.ts`](../src/services/index.ts).
  Screens/hooks import from the barrel only.
- **Backend:** .NET 8, Clean Architecture, PostgreSQL (+pgvector). Bank-linking supports
  **SePay OAuth2** (active, in-app integration) — the only linking provider; Finverse
  was removed 2026-07 (it never went live, blocked on BankHub approval).
- **Current runtime:** `EXPO_PUBLIC_USE_MOCK=false` → the app hits the live backend
  (`.env.local` → `http://<LAN-IP>:5122/api`).

### Wired to the real backend ✅
| Domain | Endpoints | FE module |
|---|---|---|
| Auth | `/auth/*` (login, register, verify, resend, forgot, reset, logout, refresh) | `real/auth.ts` |
| Profile | `GET/PUT /profile`, `POST /profile/avatar` | `real/auth.ts` |
| Account | `DELETE /account` | `real/auth.ts` |
| Wallets | `GET/POST/PATCH/DELETE /wallets`, `/transfer`, `/withdraw` | `real/wallets.ts` |
| Wallet ledger | `GET /wallets/{id}/transactions` | `real/wallets.ts` |
| Transactions | `GET/POST/PUT/DELETE /transactions`, `/summary`, `/{id}/classify` | `real/transactions.ts` |
| Budgets | `GET/POST/PATCH/DELETE /budgets`, `/buckets` | `real/budgets.ts` |
| Saving goals | `GET/POST/PATCH/DELETE /saving-goals`, `/contribute` | `real/goals.ts` |
| Categories | `GET /categories` | `real/categories.ts` |
| Category requests | `POST /category-requests`, `/mine` | `real/categoryRequests.ts` |
| Reports / AI | `GET /ai/score`, `/ai/reports`, `/ai/chat/history`, `POST /ai/chat`, `/ai/reports/generate` | `real/reports.ts` |
| AI categorization | `POST /ai/categorize/preview`, `/categorize/{id}`, `/transactions/{id}/override` | `real/reports.ts` |
| Notifications | `GET /notifications`, `/{id}/read`, `/read-all` | `real/notifications.ts` |
| Rules | `GET/POST/DELETE /rules` | `real/rules.ts` |
| Extraction (SMS) | `POST /extract/sms` | `real/extraction.ts` |
| **SePay OAuth2** | `/wallets/sepay/link`, `/sepay/bank-accounts`, `/{id}/sepay-sync` | `real/sepay.ts` + `app/link-sepay.tsx` |

### Still mock (by necessity)
- **Subscriptions** — no backend counterpart.
- **Photo / receipt OCR extraction** — backend only parses SMS text + CSV/XLSX, no
  image OCR endpoint. (SMS extraction is real; photo stays mock.)

### Known issues / debt
- **Finverse removed (2026-07).** It never went live (blocked on BankHub approval for
  personal accounts) — the FE code path (`app/link-bank.tsx`, `real/finverse.ts`,
  `useSyncFinverseWallet`) was deleted; BE removal is a separate, parallel cycle on
  that repo (see `context/fe-plan-2026-07-revamp.md` reconciliation section).

---

## 2. SePay OAuth2 integration (NEW)

Full in-app bank-linking and transaction sync via SePay OAuth2. No scripts needed.

### Backend (finviet-be)
| File | Purpose |
|---|---|
| `V16__sepay_oauth_integration.sql` | Migration: `sepay_links` table |
| `ExternalServices/SePay/SepayClient.cs` | Typed HttpClient for SePay OAuth2 APIs |
| `ExternalServices/SePay/SepayApiModels.cs` | DTOs matching SePay API response shapes |
| `ExternalServices/SePay/SepayOptions.cs` | Configuration (BaseUrl, ClientId, ClientSecret, RedirectUri) |
| `ExternalServices/SePay/SepayTokenProtector.cs` | ASP.NET Data Protection wrapper for token encryption |
| `ExternalServices/SePay/ISepayClient.cs` | Client interface |
| `Persistence/Entities/SepayLink.cs` | Entity for `sepay_links` table |
| `Application/Interfaces/ISepayWalletService.cs` | Service interface |
| `Application/DTOs/Wallets/SepayWalletDtos.cs` | Request/response DTOs |
| `Services/SepayWalletService.cs` | Full implementation: link, sync, token refresh, transaction upsert |

**API endpoints** (in `WalletsController`):
- `POST /api/wallets/sepay/link` — Exchange OAuth code → create wallet → initial sync
- `POST /api/wallets/sepay/bank-accounts` — List user's SePay bank accounts
- `POST /api/wallets/{id}/sepay-sync` — Sync transactions for an existing SePay wallet

**Configuration** (appsettings or user-secrets):
```json
{
  "SePay": {
    "BaseUrl": "https://my.sepay.vn",
    "ClientId": "<from developer.sepay.vn>",
    "ClientSecret": "<from developer.sepay.vn>",
    "RedirectUri": "http://<your-api-host>/api/wallets/sepay/callback"
  }
}
```

### Frontend (finviet-mobile)
| File | Purpose |
|---|---|
| `src/services/real/sepay.ts` | Service module: `linkSepayAccount()`, `getSepayBankAccounts()`, `syncSepayWallet()` |
| `src/hooks/useWallets.ts` | Added `useLinkSepayAccount()`, `useSyncSepayWallet()` |
| `app/link-sepay.tsx` | WebView OAuth2 flow screen |
| `app/(tabs)/wallets/[id].tsx` | Added "Đồng bộ ngay" sync button for linked wallets |
| `app/(tabs)/wallets/index.tsx` | Add-wallet sheet: basic + SePay options |

### Flow
1. User taps "SePay" in the add-wallet sheet → `app/link-sepay.tsx` opens
2. WebView loads `my.sepay.vn/oauth/authorize` with `client_id`, `redirect_uri`, scopes
3. User logs in to SePay, authorizes the app
4. SePay redirects back with `?code=...`
5. Frontend captures the code, sends `POST /wallets/sepay/link { code }`
6. Backend exchanges code for tokens, creates `sepay_linked` wallet, fetches transactions
7. Transactions are upserted via `ON CONFLICT (external_id)`, AI categorization runs on new expenses
8. To re-sync: tap "Đồng bộ ngay" on the wallet detail screen → `POST /wallets/{id}/sepay-sync`

---

## 3. Remaining APIs to integrate

Backend endpoints that exist but have **no frontend wiring yet**:

| Priority | Endpoint | Purpose | Notes |
|---|---|---|---|
| N/A | `POST /ai/documents` (admin) | Ingest RAG PDF | Admin-only, not a mobile feature |
| N/A | `/auth/admin-login` (admin) | Admin login | Admin console, not mobile |
| Deferred | `/auth/google-login` | Google sign-in via Firebase ID token | Needs Firebase config + dev build (can't run in Expo Go) |

All other backend endpoints are now wired.

---

## 4. Setup for demo

### Prerequisites
1. Register a SePay developer app at `developer.sepay.vn` → get `client_id` / `client_secret`
2. Set `SePay:ClientId`, `SePay:ClientSecret`, `SePay:RedirectUri` in backend user-secrets
3. Set `EXPO_PUBLIC_SEPAY_CLIENT_ID` in `.env.local`
4. Run the V16 migration: `V16__sepay_oauth_integration.sql`
5. Start the backend, then the mobile app
6. In the app: Wallets → (+) → SePay → authorize → done

### Quick reference
- Toggle backend vs mock: `EXPO_PUBLIC_USE_MOCK` in `.env.local`.
- Backend API contracts: [`finviet-be/docs/api-reference.md`](../../finviet-be/docs/api-reference.md).
