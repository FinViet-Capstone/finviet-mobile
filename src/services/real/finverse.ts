/**
 * real/finverse.ts — Finverse consumer bank-aggregation via the .NET backend.
 *
 * Backend (WalletsController, api/wallets/finverse/*), converged bank-linking:
 *   - POST /wallets/finverse/link-token   → { linkUrl, state, expiresAt }
 *   - POST /wallets/finverse/complete-link{ code, state, accounts? } → { loginIdentityId, wallets[] }
 *   - POST /wallets/finverse/callback     ← Finverse form-posts the auth code here
 *   - POST /wallets/{id}/finverse-sync    → refreshed balance + import counts
 *
 * Flow: createFinverseLink() returns the hosted Link UI url → open it in a WebView →
 * the user picks their bank and logs in on Finverse (we never see their bank password).
 *
 * The backend requests `response_mode=form_post` with its RedirectUri pointed at the
 * `/wallets/finverse/callback` endpoint, so on completion Finverse form-posts the auth
 * code straight to the backend, which creates the linked wallet(s) and imports data —
 * the WebView only has to detect the callback navigation (see FINVERSE_CALLBACK_PATH)
 * and read the returned envelope. `completeFinverseLink` covers the alternative flow
 * where a redirect delivers the `code` in the URL query and the client finishes the
 * link itself.
 */

import { api, unwrap } from '@/lib/api';
import type { Wallet, WalletType } from '@/types';

/**
 * Path the backend RedirectUri terminates in. Finverse form-posts the auth code to
 * this endpoint on completion; the WebView watches for a navigation whose path
 * contains this marker (host-agnostic, so it survives differing API hosts).
 */
export const FINVERSE_CALLBACK_PATH = '/wallets/finverse/callback';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface LinkTokenDto {
  linkUrl: string;
  state: string;
  expiresAt: string;
}

interface WalletDto {
  walletId: string;
  customerId: string;
  walletName: string;
  walletType: string;
  balance: number;
  finverseAccountId?: string | null;
  institutionName?: string | null;
  accountMask?: string | null;
  lastSyncedAt?: string | null;
}

interface FinverseLinkResultDto {
  loginIdentityId: string;
  wallets: WalletDto[];
}

interface FinverseSyncDto {
  walletId: string;
  balance: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  pendingTransactionsSkipped: number;
  syncedAt: string;
}

export interface FinverseLink {
  linkUrl: string;
  state: string;
  /** ISO timestamp after which the link session is no longer valid. */
  expiresAt: string;
}

export interface CreateFinverseLinkInput {
  /** Pre-select a bank so Finverse skips the institution picker. */
  institutionId?: string;
  /** Link UI language (Finverse-supported code); defaults to English. */
  language?: string;
  /** Finverse UI mode; 'redirect' form-posts the code to the backend callback. */
  uiMode?: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toWalletType(raw: string): WalletType {
  return /link|finverse|sepay/i.test(raw ?? '') ? 'linked' : 'basic';
}

function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.walletId,
    customerId: dto.customerId,
    name: dto.walletName,
    type: toWalletType(dto.walletType),
    balance: dto.balance,
    isDeleted: false,
    // The backend response carries no wallet timestamps; the UI never renders them.
    createdAt: '',
    updatedAt: '',
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/** Start a link session and get the hosted Link UI url + signed state to open. */
export async function createFinverseLink(
  input?: CreateFinverseLinkInput,
): Promise<FinverseLink> {
  const res = await api.post('/wallets/finverse/link-token', {
    institutionId: input?.institutionId ?? null,
    language: input?.language ?? 'en',
    uiMode: input?.uiMode ?? 'redirect',
  });
  const d = unwrap<LinkTokenDto>(res);
  return { linkUrl: d.linkUrl, state: d.state, expiresAt: d.expiresAt };
}

/**
 * Complete linking from a client-captured auth `code` (redirect flow where the code
 * arrives in the URL query). Returns the created/restored linked wallet(s).
 *
 * The backend polls Finverse for asynchronous data retrieval before returning, so
 * this can take ~30s+ — use a longer timeout than the 20s default.
 */
export async function completeFinverseLink(
  code: string,
  state: string,
  accounts?: string[],
): Promise<Wallet[]> {
  const res = await api.post(
    '/wallets/finverse/complete-link',
    { code, state, accounts: accounts ?? null },
    { timeout: 120_000 },
  );
  return unwrap<FinverseLinkResultDto>(res).wallets.map(toWallet);
}

/** Pull the latest balance + transactions for one Finverse-linked wallet. */
export async function syncFinverseWallet(walletId: string): Promise<FinverseSyncDto> {
  const res = await api.post(`/wallets/${walletId}/finverse-sync`, undefined, {
    timeout: 120_000,
  });
  return unwrap<FinverseSyncDto>(res);
}
