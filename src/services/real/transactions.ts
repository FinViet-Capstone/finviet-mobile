/**
 * real/transactions.ts — real .NET transaction service.
 *
 * Mirrors src/services/mock/transactions.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/transactions/* (TransactionsController). IMPORTANT: unlike every
 * other controller, these endpoints return the RAW dto / PagedResult — they are
 * NOT wrapped in ApiResponse<T>. So we read `res.data` directly (never unwrap()).
 *
 * Backend limitations folded in here so the UI contract is unchanged:
 *   - PUT /transactions/{id} only updates categoryId (UpdateTransactionDto). Edits
 *     to amount/merchant/date are dropped server-side; we forward categoryId.
 *   - The server filter vocabulary is coarse (INCOME/EXPENSE/TRANSFER), so the
 *     finer mock filters (uncategorizedOnly transfer-exclusion, hideGoalContributions,
 *     transfer_in/out subtype) are re-applied client-side on the fetched page to
 *     keep behaviour identical to the mock.
 */

import { api } from '@/lib/api';
import type { Transaction, TransactionType, EntryMethod } from '@/types';
import type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateTransferInput,
  CreateTransferResult,
} from '@/services/mock/transactions';

// A page big enough that the client-side refinements below see the full set the
// way the mock (which held everything in memory) did.
const MAX_PAGE_SIZE = 500;

// ─── Backend DTO shapes ───────────────────────────────────────────────────────

interface TransactionDto {
  transactionId: string;
  customerId: string;
  walletId: string;
  categoryId: string | null;
  transactionType: string;
  sourceChannel?: string;
  entryMethod?: string;
  amount: number;
  transactionDate: string; // ISO timestamp
  note?: string | null;
  description?: string | null;
  merchant?: string | null;
  transferPairId?: string | null;
  externalId?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

interface PagedDto<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

interface TransferDto {
  fromWalletId: string;
  toWalletId: string;
  fromWalletBalance: number;
  toWalletBalance: number;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

const TX_TYPES: TransactionType[] = ['expense', 'income', 'transfer_out', 'transfer_in'];

function toTransactionType(raw: string): TransactionType {
  const v = (raw ?? '').toLowerCase();
  if ((TX_TYPES as string[]).includes(v)) return v as TransactionType;
  // Backend may report a bare "transfer"; without a direction we cannot tell the
  // leg apart, so fall back to expense (rendered as an outflow).
  return 'expense';
}

const ENTRY_METHODS: EntryMethod[] = ['manual', 'photo', 'csv_import', 'linked', 'sms_paste'];

function toEntryMethod(raw?: string): EntryMethod {
  const v = (raw ?? '').toLowerCase();
  return (ENTRY_METHODS as string[]).includes(v) ? (v as EntryMethod) : 'manual';
}

function toTransaction(dto: TransactionDto): Transaction {
  return {
    id: dto.transactionId,
    customerId: dto.customerId,
    walletId: dto.walletId,
    categoryId: dto.categoryId ?? null,
    amount: dto.amount,
    type: toTransactionType(dto.transactionType),
    description: dto.description ?? dto.note ?? null,
    merchant: dto.merchant ?? null,
    transactionDate: (dto.transactionDate ?? '').slice(0, 10),
    entryMethod: toEntryMethod(dto.entryMethod),
    transferPairId: dto.transferPairId ?? null,
    externalId: dto.externalId ?? null,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? dto.createdAt ?? '',
  };
}

/** FE filter type → backend Type query value (only the cleanly-mappable ones). */
function toServerType(type?: TransactionType): string | undefined {
  if (type === 'income') return 'INCOME';
  if (type === 'expense') return 'EXPENSE';
  if (type === 'transfer_in' || type === 'transfer_out') return 'TRANSFER';
  return undefined;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getTransactions(
  filters?: TransactionFilters,
): Promise<Transaction[]> {
  const params: Record<string, unknown> = {
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  };
  if (filters?.walletId !== undefined) params.walletId = filters.walletId;
  if (filters?.startDate !== undefined) params.from = filters.startDate;
  if (filters?.endDate !== undefined) params.to = filters.endDate;
  if (filters?.uncategorizedOnly === true) params.uncategorizedOnly = true;
  else if (filters?.categoryId !== undefined) params.categoryId = filters.categoryId;
  const serverType = toServerType(filters?.type);
  if (serverType) params.type = serverType;

  const res = await api.get('/transactions', { params });
  const paged = res.data as PagedDto<TransactionDto>;
  let rows = (paged.items ?? []).map(toTransaction);

  // Re-apply the mock's finer semantics client-side so the swap is transparent.
  if (filters?.type !== undefined) {
    rows = rows.filter((t) => t.type === filters.type);
  }
  if (filters?.uncategorizedOnly === true) {
    rows = rows.filter(
      (t) =>
        t.categoryId === null &&
        t.type !== 'transfer_in' &&
        t.type !== 'transfer_out',
    );
  }
  if (filters?.hideGoalContributions === true) {
    rows = rows.filter((t) => t.categoryId !== 'cat_savings_goal');
  }

  return rows.sort((a, b) => {
    const dateDiff = b.transactionDate.localeCompare(a.transactionDate);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  const res = await api.get(`/transactions/${id}`);
  return toTransaction(res.data as TransactionDto);
}

export async function getRecentTransactions(n: number = 10): Promise<Transaction[]> {
  const res = await api.get('/transactions', { params: { page: 1, pageSize: n } });
  const paged = res.data as PagedDto<TransactionDto>;
  return (paged.items ?? [])
    .map(toTransaction)
    .sort((a, b) => {
      const dateDiff = b.transactionDate.localeCompare(a.transactionDate);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, n);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const res = await api.post('/transactions', {
    walletId: input.walletId,
    categoryId: input.categoryId ?? null,
    transactionType: input.type,
    amount: input.amount,
    transactionDate: input.transactionDate,
    note: input.description ?? null,
    description: input.description ?? null,
    merchant: input.merchant ?? null,
    entryMethod: input.entryMethod,
  });
  return toTransaction(res.data as TransactionDto);
}

export async function updateTransaction(
  id: string,
  patch: UpdateTransactionInput,
): Promise<Transaction> {
  // Backend only supports recategorization (PUT body = { categoryId }).
  const res = await api.put(`/transactions/${id}`, {
    categoryId: patch.categoryId ?? null,
  });
  return toTransaction(res.data as TransactionDto);
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`);
}

// ─── Transfer (api/wallets/transfer) ──────────────────────────────────────────

/**
 * The backend transfer endpoint returns updated balances, not the two ledger
 * legs the mock fabricated. We synthesize minimal leg objects so the
 * CreateTransferResult contract holds; the transfer screen only navigates on
 * success and the lists refetch from the server afterwards.
 */
export async function createTransfer(
  input: CreateTransferInput,
): Promise<CreateTransferResult> {
  const res = await api.post('/wallets/transfer', {
    fromWalletId: input.fromWalletId,
    toWalletId: input.toWalletId,
    amount: input.amount,
    description: input.note ?? null,
  });
  const data = unwrapEnvelope<TransferDto>(res.data);
  const date = (input.transactionDate ?? new Date().toISOString()).slice(0, 10);

  const leg = (
    walletId: string,
    type: 'transfer_out' | 'transfer_in',
  ): Transaction => ({
    id: '',
    customerId: '',
    walletId,
    categoryId: null,
    amount: input.amount,
    type,
    description: input.note ?? null,
    merchant: null,
    transactionDate: date,
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    outTx: leg(data.fromWalletId, 'transfer_out'),
    inTx: leg(data.toWalletId, 'transfer_in'),
  };
}

/** The transfer endpoint IS enveloped (it lives on WalletsController). */
function unwrapEnvelope<T>(body: unknown): T {
  return (body as { data: T }).data;
}
