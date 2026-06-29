/**
 * real/linkedWallets.ts — real SePay integration via the .NET backend.
 *
 * Mirrors the surface the barrel re-exports from src/services/linkedWalletSync.ts
 * (getInstitutions / getLinkedAccounts / syncLinkedWalletTransactions /
 * createConnectToken / exchangeConnection) so the barrel can swap mock ⇄ real.
 *
 * The original linkedWalletSync.ts talks to SePay DIRECTLY from the device with a
 * client-side token. This module instead routes through the backend proxy
 * (api/linked-wallets/*, ApiResponse<T> envelope) so the SePay token stays
 * server-side. Backend connect is a single step: POST /connect { sepayToken }
 * returns { accessToken, accounts }. The legacy two-step connect-token/exchange
 * handshake has no backend equivalent and is unused by any screen, so those two
 * functions are re-exported from the existing module untouched to keep the
 * barrel whole.
 *
 * Mapped onto the FE SePay types (src/services/sepay/types.ts) so existing hooks
 * (useInstitutions / useLinkedAccounts / useSyncLinkedWallet) need no changes.
 */

import { api, unwrap } from '@/lib/api';
import type {
  SePayBank,
  SePayAccount,
  SePayConnection,
} from '@/services/sepay';
import type { SyncResult } from '@/services/linkedWalletSync';

// The connect-token handshake has no backend counterpart; keep the legacy impl.
export { createConnectToken, exchangeConnection } from '@/services/linkedWalletSync';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface InstitutionDto {
  id: string;
  name: string;
  bankCode: string;
  country: string;
  logo: string | null;
}

interface LinkedAccountDto {
  sepayAccountId: string;
  accountNumber: string | null;
  holderName: string | null;
  bankCode: string | null;
  bankName: string | null;
}

interface ConnectDto {
  accessToken: string;
  accounts: LinkedAccountDto[];
}

interface LinkWalletDto {
  walletId: string;
  sepayAccountId: string | null;
  bankName: string | null;
  accountMask: string | null;
}

interface SyncResultDto {
  walletId: string;
  imported: number;
  skipped: number;
  lastSyncedAt: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toBank(dto: InstitutionDto): SePayBank {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.bankCode,
    logo: dto.logo ?? undefined,
  };
}

function toAccount(dto: LinkedAccountDto): SePayAccount {
  return {
    id: dto.sepayAccountId,
    bankId: dto.bankCode ?? '',
    accountNumber: dto.accountNumber ?? '',
    accountHolder: dto.holderName ?? undefined,
    mask: dto.accountNumber ? dto.accountNumber.slice(-4) : undefined,
    // The backend account listing does not return balances.
    balance: { current: 0, currency: 'VND' },
  };
}

// ─── Service functions (barrel-compatible signatures) ─────────────────────────

export async function getInstitutions(country: string = 'VN'): Promise<SePayBank[]> {
  const res = await api.get('/linked-wallets/institutions', { params: { country } });
  return unwrap<InstitutionDto[]>(res).map(toBank);
}

export async function getLinkedAccounts(
  accessToken?: string,
): Promise<SePayAccount[]> {
  if (!accessToken) return [];
  const res = await api.get('/linked-wallets/accounts', { params: { accessToken } });
  return unwrap<LinkedAccountDto[]>(res).map(toAccount);
}

/**
 * Pull SePay transactions into a linked wallet. The backend syncs by walletId
 * (it already holds the SePay token bound at link time), so the extra mock
 * params are accepted for signature parity but unused here.
 */
export async function syncLinkedWalletTransactions(
  walletId: string,
  _customerId: string,
  _accessToken: string,
  _accountId: string,
  _startDate?: string,
): Promise<SyncResult> {
  try {
    const res = await api.post(`/linked-wallets/${walletId}/sync`);
    const data = unwrap<SyncResultDto>(res);
    return { synced: data.imported, skipped: data.skipped, errors: [] };
  } catch (err) {
    return { synced: 0, skipped: 0, errors: [`Sync failed: ${String(err)}`] };
  }
}

// ─── Backend-aligned connect/link (for the upcoming link UI) ──────────────────

/** Validate the customer's SePay token and start a link session. */
export async function connectSepay(
  sepayToken: string,
): Promise<{ accessToken: string; accounts: SePayAccount[] }> {
  const res = await api.post('/linked-wallets/connect', { sepayToken });
  const data = unwrap<ConnectDto>(res);
  return { accessToken: data.accessToken, accounts: data.accounts.map(toAccount) };
}

/** Bind a wallet to the SePay token resolved by the access token. */
export async function linkWallet(
  walletId: string,
  accessToken: string,
): Promise<SePayConnection> {
  const res = await api.post(`/linked-wallets/${walletId}/link`, { accessToken });
  const data = unwrap<LinkWalletDto>(res);
  return { connection_id: data.walletId, account_id: data.sepayAccountId ?? '' };
}

interface LinkedWalletDto {
  walletId: string;
  walletName: string;
}

/**
 * One-step: create a sepay_linked wallet for the chosen account and bind the token.
 * Returns the new wallet id so the caller can sync it immediately.
 */
export async function linkAccount(
  accessToken: string,
  sepayAccountId?: string,
): Promise<{ walletId: string; walletName: string }> {
  const res = await api.post('/linked-wallets/link-account', {
    accessToken,
    sepayAccountId: sepayAccountId ?? null,
  });
  const data = unwrap<LinkedWalletDto>(res);
  return { walletId: data.walletId, walletName: data.walletName };
}
