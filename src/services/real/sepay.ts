/**
 * real/sepay.ts — SePay OAuth2 bank-linking via the .NET backend.
 *
 * Backend (WalletsController, api/wallets/sepay/*):
 *   - GET  /wallets/sepay/authorize-url                          → SepayAuthorizeUrlResponse
 *   - POST /wallets/sepay/link         { code, state?, bankAccountId? } → SepayLinkResult
 *   - POST /wallets/sepay/bank-accounts{ code, state? }           → SepayBankAccount[]
 *   - GET  /wallets/sepay/links                                   → SepayLinkStatusResponse[]
 *   - POST /wallets/{id}/sepay-sync                               → SepayWalletSyncResponse
 *   - DELETE /wallets/{id}/sepay-link                             → SepayUnlinkResponse
 *
 * Flow:
 *  1. GET /wallets/sepay/authorize-url — the backend owns ClientId/RedirectUri
 *     config and issues a signed, single-customer, expiring `state` (CSRF)
 *     token; the client must never build the authorize URL itself.
 *  2. Open the returned authorizeUrl in a WebView.
 *  3. User authorizes → redirect back with `code` query param.
 *  4. Frontend sends `code` + the same `state` to POST /wallets/sepay/link.
 *  5. Backend validates `state`, exchanges `code` for tokens, creates wallet,
 *     syncs initial transactions.
 *  6. To re-sync later: POST /wallets/{id}/sepay-sync.
 */

import { api, unwrap } from '@/lib/api';
import type { Wallet, WalletType } from '@/types';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface WalletDto {
  walletId: string;
  customerId: string;
  walletName: string;
  walletType: string;
  balance: number;
  institutionName?: string | null;
  accountMask?: string | null;
  lastSyncedAt?: string | null;
}

interface SepayLinkResultDto {
  wallets: WalletDto[];
  transactionsSynced: number;
}

interface SepayBankAccountDto {
  id: number;
  label: string;
  accountNumber: string;
  accountHolderName: string;
  balance: number;
  bankShortName: string;
  bankCode: string;
  bankIconUrl?: string | null;
}

interface SepaySyncDto {
  walletId: string;
  balance: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  syncedAt: string;
}

interface SepayAuthorizeUrlDto {
  authorizeUrl: string;
  state: string;
  expiresAt: string;
}

interface SepayLinkStatusDto {
  walletId: string;
  walletName: string;
  balance: number;
  authMode: string;
  sepayBankAccountId?: number | null;
  bankShortName?: string | null;
  accountMask?: string | null;
  accountHolderName?: string | null;
  lastSyncedAt?: string | null;
  relinkRequired: boolean;
  webhookId?: number | null;
  webhookRegistered: boolean;
}

interface SepayUnlinkDto {
  walletId: string;
  walletType: string;
  transactionsRetained: number;
}

// ─── Exported types ────────────────────────────────────────────────────────────

export interface SepayBankAccount {
  id: number;
  label: string;
  accountNumber: string;
  accountHolderName: string;
  balance: number;
  bankShortName: string;
  bankCode: string;
  bankIconUrl?: string;
}

export interface SepayLinkResult {
  wallets: Wallet[];
  transactionsSynced: number;
}

export interface SepaySyncResult {
  walletId: string;
  balance: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  syncedAt: string;
}

export interface SepayAuthorizeUrl {
  authorizeUrl: string;
  /** Signed CSRF token — echo back to linkSepayAccount()/getSepayBankAccounts(). */
  state: string;
  expiresAt: string;
}

export interface SepayLinkStatus {
  walletId: string;
  walletName: string;
  balance: number;
  /** "oauth" or "static". */
  authMode: string;
  bankShortName?: string;
  accountMask?: string;
  lastSyncedAt?: string;
  /** True when the stored authorization can no longer be renewed — re-link required. */
  relinkRequired: boolean;
  webhookRegistered: boolean;
}

export interface SepayUnlinkResult {
  walletId: string;
  transactionsRetained: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toWalletType(raw: string): WalletType {
  return /link|sepay/i.test(raw ?? '') ? 'linked' : 'basic';
}

function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.walletId,
    customerId: dto.customerId,
    name: dto.walletName,
    type: toWalletType(dto.walletType),
    balance: dto.balance,
    isDeleted: false,
    createdAt: '',
    updatedAt: '',
    linkedMetadata: dto.institutionName
      ? {
          institutionId: '',
          institutionName: dto.institutionName ?? '',
          accountId: '',
          accountNumber: dto.accountMask ?? undefined,
          lastSyncAt: dto.lastSyncedAt ?? undefined,
          syncStatus: 'active',
        }
      : undefined,
  };
}

function toBankAccount(dto: SepayBankAccountDto): SepayBankAccount {
  return {
    id: dto.id,
    label: dto.label,
    accountNumber: dto.accountNumber,
    accountHolderName: dto.accountHolderName,
    balance: dto.balance,
    bankShortName: dto.bankShortName,
    bankCode: dto.bankCode,
    bankIconUrl: dto.bankIconUrl ?? undefined,
  };
}

function toLinkStatus(dto: SepayLinkStatusDto): SepayLinkStatus {
  return {
    walletId: dto.walletId,
    walletName: dto.walletName,
    balance: dto.balance,
    authMode: dto.authMode,
    bankShortName: dto.bankShortName ?? undefined,
    accountMask: dto.accountMask ?? undefined,
    lastSyncedAt: dto.lastSyncedAt ?? undefined,
    relinkRequired: dto.relinkRequired,
    webhookRegistered: dto.webhookRegistered,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * GET /wallets/sepay/authorize-url — the only correct source for the OAuth2
 * authorize URL. The backend owns ClientId/RedirectUri config and issues a
 * signed, single-customer, expiring `state` token (1–30 min lifetime); the
 * client must never construct this URL or a `state` value itself.
 */
export async function getSepayAuthorizeUrl(): Promise<SepayAuthorizeUrl> {
  const res = await api.get('/wallets/sepay/authorize-url');
  return unwrap<SepayAuthorizeUrlDto>(res);
}

/**
 * Link a SePay bank account using an OAuth2 authorization code. `state` should
 * be the value returned by getSepayAuthorizeUrl() — the backend validates it
 * belongs to the caller when present.
 * The backend exchanges the code for tokens, creates a sepay_linked wallet,
 * and performs the initial transaction sync.
 */
export async function linkSepayAccount(
  code: string,
  bankAccountId?: number,
  state?: string,
): Promise<SepayLinkResult> {
  const res = await api.post(
    '/wallets/sepay/link',
    { code, state: state ?? null, bankAccountId: bankAccountId ?? null },
    { timeout: 120_000 },
  );
  const dto = unwrap<SepayLinkResultDto>(res);
  return {
    wallets: dto.wallets.map(toWallet),
    transactionsSynced: dto.transactionsSynced,
  };
}

/**
 * Link a bank account using a personal SePay User API token (my.sepay.vn → API Access).
 * No OAuth flow — the backend validates the token, creates the wallet, and imports history.
 */
export async function linkSepayWithToken(
  apiToken: string,
  accountNumber?: string,
): Promise<SepayLinkResult> {
  const res = await api.post(
    '/wallets/sepay/link-token',
    { apiToken, accountNumber: accountNumber ?? null },
    { timeout: 120_000 },
  );
  const dto = unwrap<SepayLinkResultDto>(res);
  return {
    wallets: dto.wallets.map(toWallet),
    transactionsSynced: dto.transactionsSynced,
  };
}

/**
 * Fetch the user's SePay bank accounts to let them pick which one to link.
 * Uses a temporary OAuth code that's exchanged server-side.
 */
export async function getSepayBankAccounts(
  code: string,
  state?: string,
): Promise<SepayBankAccount[]> {
  const res = await api.post('/wallets/sepay/bank-accounts', { code, state: state ?? null });
  return unwrap<SepayBankAccountDto[]>(res).map(toBankAccount);
}

/** Sync transactions for one SePay-linked wallet. */
export async function syncSepayWallet(
  walletId: string,
): Promise<SepaySyncResult> {
  const res = await api.post(`/wallets/${walletId}/sepay-sync`, undefined, {
    timeout: 120_000,
  });
  return unwrap<SepaySyncDto>(res);
}

/** GET /wallets/sepay/links — connection status for every SePay-linked wallet. */
export async function getSepayLinks(): Promise<SepayLinkStatus[]> {
  const res = await api.get('/wallets/sepay/links');
  return unwrap<SepayLinkStatusDto[]>(res).map(toLinkStatus);
}

/**
 * DELETE /wallets/{id}/sepay-link — disconnect a bank-linked wallet. Converts
 * it back to a basic wallet; transaction history is never deleted, only the
 * link/authorization record.
 */
export async function unlinkSepayAccount(walletId: string): Promise<SepayUnlinkResult> {
  const res = await api.delete(`/wallets/${walletId}/sepay-link`);
  const dto = unwrap<SepayUnlinkDto>(res);
  return { walletId: dto.walletId, transactionsRetained: dto.transactionsRetained };
}
