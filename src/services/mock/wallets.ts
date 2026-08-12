import type { Wallet, WalletSummary, WalletType } from '../../types';
import {
  USER_ID,
  adjustWalletBalance,
  getAllWallets,
  setWallets,
} from './walletStore';

// Shared ID constants and the mutable WALLETS store live in ./walletStore so
// transactions.ts can reference them without importing this module (which would
// re-create the wallets ⇄ transactions cycle). Access the array via the
// getAllWallets()/setWallets() accessors below.

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genId(): string {
  return `wallet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getWallets(): WalletSummary {
  const visible = getAllWallets().filter((w) => !w.isDeleted);
  const totalBalance = visible.reduce((sum, w) => sum + w.balance, 0);
  return { wallets: visible, totalBalance };
}

export function getWalletById(id: string): Wallet | undefined {
  return getAllWallets().find((w) => w.id === id);
}

// ─── Writes ────────────────────────────────────────────────────────────────────

export interface CreateWalletInput {
  name: string;
  type: WalletType;
  balance: number;
  linkedMetadata?: {
    institutionId: string;
    institutionName: string;
    accountId: string;
    accountNumber?: string;
    lastSyncAt?: string;
    syncStatus: 'active' | 'error' | 'pending';
    syncError?: string;
  };
}

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  await delay();
  const trimmedName = input.name.trim();
  const isDuplicate = getAllWallets().some(
    (w) => !w.isDeleted && w.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );
  if (isDuplicate) throw new Error('duplicate_name');

  const wallet: Wallet = {
    id: genId(),
    customerId: USER_ID,
    name: trimmedName,
    type: input.type,
    balance: input.balance,
    isDeleted: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    linkedMetadata: input.linkedMetadata,
  };
  setWallets([...getAllWallets(), wallet]);
  return wallet;
}

export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
}

export async function updateWallet(
  id: string,
  patch: UpdateWalletInput,
): Promise<Wallet> {
  await delay();
  const target = getAllWallets().find((w) => w.id === id);
  if (!target) throw new Error('Wallet not found');

  const updated: Wallet = {
    ...target,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    updatedAt: nowIso(),
  };
  setWallets(getAllWallets().map((w) => (w.id === id ? updated : w)));
  return updated;
}

export async function deleteWallet(id: string): Promise<void> {
  await delay();

  // Mirror the real backend's "can't delete your only wallet" rule (see the
  // last_wallet mapping in wallets/[id].tsx). Deliberately NOT also guarding on
  // "has transactions": this app's soft-delete design intentionally allows
  // deleting a wallet with history (its past transactions keep working, showing
  // "Ví đã xóa" as the wallet name — see transactions/index.tsx) — blocking that
  // outright would contradict already-working, intended behavior.
  const visible = getAllWallets().filter((w) => !w.isDeleted);
  if (visible.length <= 1 && visible.some((w) => w.id === id)) {
    throw new Error('last_wallet');
  }

  // Soft-delete: flip the flag, preserve transactions linked to this wallet.
  setWallets(
    getAllWallets().map((w) =>
      w.id === id ? { ...w, isDeleted: true, updatedAt: nowIso() } : w,
    ),
  );
}

// ─── Withdraw (POST /wallets/withdraw) ──────────────────────────────────────────

export interface WithdrawInput {
  fromWalletId: string;
  /** Optional destination wallet (move the money instead of pure expense). */
  toWalletId?: string;
  amount: number;
  description?: string;
}

export interface WithdrawResult {
  fromWalletId: string;
  fromWalletBalance: number;
  toWalletId?: string;
  toWalletBalance?: number;
}

/** Withdraw from a wallet (as an expense, or moved into another wallet). */
export async function withdrawFromWallet(
  input: WithdrawInput,
): Promise<WithdrawResult> {
  await delay();
  const from = getAllWallets().find((w) => w.id === input.fromWalletId);
  if (!from) throw new Error('Wallet not found');
  if (input.amount <= 0) throw new Error('Amount must be positive');
  if (input.amount > from.balance) throw new Error('Insufficient balance');

  adjustWalletBalance(input.fromWalletId, -input.amount);
  if (input.toWalletId) adjustWalletBalance(input.toWalletId, input.amount);

  const readBalance = (id?: string) =>
    id ? getAllWallets().find((w) => w.id === id)?.balance : undefined;

  return {
    fromWalletId: input.fromWalletId,
    fromWalletBalance: readBalance(input.fromWalletId) ?? 0,
    toWalletId: input.toWalletId,
    toWalletBalance: readBalance(input.toWalletId),
  };
}

// ─── Per-wallet ledger (GET /wallets/{id}/transactions) ─────────────────────────

export interface WalletLedgerQuery {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  transactionType?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WalletLedgerEntry {
  transactionId: string;
  walletId: string;
  categoryId: string | null;
  transactionType: string;
  amount: number;
  transactionDate: string;
  note: string | null;
}

export interface WalletLedgerPage {
  items: WalletLedgerEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Paged ledger for one wallet, newest first by default. */
export async function getWalletTransactions(
  walletId: string,
  query?: WalletLedgerQuery,
): Promise<WalletLedgerPage> {
  await delay(200);
  // Lazy import to avoid a static wallets ⇄ transactions import cycle.
  const { getTransactions } = await import('./transactions');
  let rows = getTransactions({
    walletId,
    startDate: query?.fromDate,
    endDate: query?.toDate,
    categoryId: query?.categoryId,
  });
  if (query?.sortOrder === 'asc') rows = [...rows].reverse();

  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize).map((t) => ({
    transactionId: t.id,
    walletId: t.walletId,
    categoryId: t.categoryId,
    transactionType: t.type,
    amount: t.amount,
    transactionDate: t.transactionDate,
    note: t.description,
  }));

  return {
    items,
    page,
    pageSize,
    totalItems: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
}
