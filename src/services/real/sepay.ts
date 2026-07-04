/**
 * real/sepay.ts — SePay OAuth2 bank-linking via the .NET backend.
 *
 * Backend (WalletsController, api/wallets/sepay/*):
 *   - POST /wallets/sepay/link         { code, bankAccountId? }  → SepayLinkResult
 *   - POST /wallets/sepay/bank-accounts{ code }                  → SepayBankAccount[]
 *   - POST /wallets/{id}/sepay-sync                               → SepayWalletSyncResponse
 *
 * Flow:
 *  1. Open SePay OAuth2 authorize URL in a WebView.
 *  2. User authorizes → redirect back with `code` query param.
 *  3. Frontend sends the code to POST /wallets/sepay/link.
 *  4. Backend exchanges code for tokens, creates wallet, syncs initial transactions.
 *  5. To re-sync later: POST /wallets/{id}/sepay-sync.
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

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Link a SePay bank account using an OAuth2 authorization code.
 * The backend exchanges the code for tokens, creates a sepay_linked wallet,
 * and performs the initial transaction sync.
 */
export async function linkSepayAccount(
  code: string,
  bankAccountId?: number,
): Promise<SepayLinkResult> {
  const res = await api.post(
    '/wallets/sepay/link',
    { code, bankAccountId: bankAccountId ?? null },
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
): Promise<SepayBankAccount[]> {
  const res = await api.post('/wallets/sepay/bank-accounts', { code });
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
