/**
 * real/wallets.ts — real .NET wallet service.
 *
 * Reads are async here (HTTP), driven through TanStack Query's queryFn.
 *
 * Backend: api/wallets/* (WalletsController). Responses use the ApiResponse<T>
 * envelope; unwrap() peels off `.data`.
 */

import { api, unwrap } from '@/lib/api';
import { idempotentConfig } from '@/lib/idempotency';
import type {
  Wallet,
  WalletSummary,
  WalletType,
  CreateWalletInput,
  UpdateWalletInput,
  WithdrawInput,
  WithdrawResult,
  WalletLedgerQuery,
  WalletLedgerPage,
} from '@/types';

// ─── Backend DTO shapes (camelCase over the wire) ─────────────────────────────

interface WalletDto {
  walletId: string;
  customerId: string;
  walletName: string;
  walletType: string;
  balance: number;
}

interface WalletListDto {
  totalBalance: number;
  wallets: WalletDto[];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/** Backend walletType is a free string; collapse it onto the FE union. */
function toWalletType(raw: string): WalletType {
  const v = (raw ?? '').toLowerCase();
  return v.includes('link') || v.includes('sepay') ? 'linked' : 'basic';
}

function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.walletId,
    customerId: dto.customerId,
    name: dto.walletName,
    type: toWalletType(dto.walletType),
    balance: dto.balance,
    isDeleted: false,
    // The backend response carries no timestamps; the UI never renders them for
    // wallets, so empty strings keep the type honest without inventing data.
    createdAt: '',
    updatedAt: '',
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getWallets(): Promise<WalletSummary> {
  const res = await api.get('/wallets');
  const data = unwrap<WalletListDto>(res);
  return {
    wallets: data.wallets.map(toWallet),
    totalBalance: data.totalBalance,
  };
}

export async function getWalletById(id: string): Promise<Wallet | undefined> {
  const res = await api.get(`/wallets/${id}`);
  return toWallet(unwrap<WalletDto>(res));
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const res = await api.post('/wallets', {
    walletName: input.name.trim(),
    walletType: input.type,
    initialBalance: input.balance,
  });
  return toWallet(unwrap<WalletDto>(res));
}

export async function updateWallet(
  id: string,
  patch: UpdateWalletInput,
): Promise<Wallet> {
  const res = await api.patch(`/wallets/${id}`, {
    ...(patch.name !== undefined ? { walletName: patch.name.trim() } : {}),
    ...(patch.type !== undefined ? { walletType: patch.type } : {}),
  });
  return toWallet(unwrap<WalletDto>(res));
}

export async function deleteWallet(id: string): Promise<void> {
  await api.delete(`/wallets/${id}`);
}

// ─── Withdraw ────────────────────────────────────────────────────────────────

interface WithdrawWalletResponse {
  fromWalletId: string;
  fromWalletBalance: number;
  toWalletId?: string;
  toWalletBalance?: number;
}

export async function withdrawFromWallet(
  input: WithdrawInput,
): Promise<WithdrawResult> {
  const res = await api.post('/wallets/withdraw', {
    fromWalletId: input.fromWalletId,
    toWalletId: input.toWalletId ?? null,
    amount: input.amount,
    description: input.description ?? null,
  }, idempotentConfig());
  return unwrap<WithdrawWalletResponse>(res);
}

// ─── Per-wallet ledger ───────────────────────────────────────────────────────

interface WalletTransactionDto {
  transactionId: string;
  walletId: string;
  categoryId: string | null;
  transactionType: string;
  amount: number;
  transactionDate: string;
  note: string | null;
}

interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export async function getWalletTransactions(
  walletId: string,
  query?: WalletLedgerQuery,
): Promise<WalletLedgerPage> {
  const params: Record<string, string | number> = {};
  if (query?.page) params.page = query.page;
  if (query?.pageSize) params.pageSize = query.pageSize;
  if (query?.fromDate) params.fromDate = query.fromDate;
  if (query?.toDate) params.toDate = query.toDate;
  if (query?.categoryId) params.categoryId = query.categoryId;
  if (query?.transactionType) params.transactionType = query.transactionType;
  if (query?.sortOrder) params.sortOrder = query.sortOrder;

  const res = await api.get(`/wallets/${walletId}/transactions`, { params });
  const data = unwrap<PagedResult<WalletTransactionDto>>(res);

  return {
    items: data.items.map((t) => ({
      transactionId: t.transactionId,
      walletId: t.walletId,
      categoryId: t.categoryId,
      transactionType: t.transactionType,
      amount: t.amount,
      transactionDate: t.transactionDate,
      note: t.note,
    })),
    page: data.page,
    pageSize: data.pageSize,
    totalItems: data.totalItems,
    totalPages: data.totalPages,
  };
}
