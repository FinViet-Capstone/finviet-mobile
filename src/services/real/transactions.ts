/**
 * real/transactions.ts — real .NET transaction service.
 *
 * Backend: api/transactions/* (TransactionsController). Like every other
 * controller, these endpoints are wrapped in ApiResponse<T> — read via unwrap().
 *
 * Backend limitations folded in here so the UI contract is unchanged:
 *   - PUT /transactions/{id} accepts { categoryId?, amount?, merchant?,
 *     transactionDate? } as a partial update — but rejects amount/merchant/date
 *     (422 synced_transaction_fields_locked) when the transaction's wallet is
 *     sepay_linked, since those values come from provider sync. Category is
 *     always editable regardless of wallet type. walletId/description have no
 *     backend field at all and are silently dropped either way.
 *   - The server filter vocabulary is coarse (INCOME/EXPENSE/TRANSFER), so the
 *     finer mock filters (uncategorizedOnly transfer-exclusion, hideGoalContributions,
 *     transfer_in/out subtype) are re-applied client-side after fetching every
 *     server page to keep behaviour identical to the mock.
 */

import { api, unwrap } from '@/lib/api';
import { idempotentConfig } from '@/lib/idempotency';
import type {
  Transaction,
  TransactionType,
  EntryMethod,
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateTransferInput,
  CreateTransferResult,
  TransactionSummary,
  SplitPartInput,
} from '@/types';

// Maximum page size accepted by the backend. Calendar queries may span multiple
// pages; fetch all of them before applying the mock-compatible refinements.
const PAGE_SIZE = 100;

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
  splitGroupId?: string | null;
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
    splitGroupId: dto.splitGroupId ?? null,
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
  const baseParams: Record<string, unknown> = { pageSize: PAGE_SIZE };
  if (filters?.walletId !== undefined) baseParams.walletId = filters.walletId;
  if (filters?.startDate !== undefined) baseParams.from = filters.startDate;
  if (filters?.endDate !== undefined) baseParams.to = filters.endDate;
  if (filters?.uncategorizedOnly === true) baseParams.uncategorizedOnly = true;
  else if (filters?.categoryId !== undefined) baseParams.categoryId = filters.categoryId;
  const serverType = toServerType(filters?.type);
  if (serverType) baseParams.type = serverType;

  const firstResponse = await api.get('/transactions', {
    params: { ...baseParams, page: 1 },
  });
  const firstPage = unwrap<PagedDto<TransactionDto>>(firstResponse);
  const totalPages = Math.max(1, firstPage.totalPages ?? 1);
  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, async (_, index) => {
      const response = await api.get('/transactions', {
        params: { ...baseParams, page: index + 2 },
      });
      return unwrap<PagedDto<TransactionDto>>(response);
    }),
  );

  let rows = [firstPage, ...remainingPages].flatMap((page) =>
    (page.items ?? []).map(toTransaction),
  );

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
  return toTransaction(unwrap<TransactionDto>(res));
}

/**
 * GET /transactions/summary?year&month — monthly income/expense/net plus category,
 * day and beneficiary breakdowns.
 */
export async function getTransactionSummary(
  year: number,
  month: number,
): Promise<TransactionSummary> {
  const res = await api.get('/transactions/summary', { params: { year, month } });
  const d = unwrap<{
    income: number;
    expense: number;
    net: number;
    byCategory?: { categoryId?: string | null; categoryName?: string | null; total: number }[];
    byDay?: { date: string; income: number; expense: number; net: number }[];
    topBeneficiaries?: { beneficiary: string; total: number }[];
  }>(res);
  return {
    income: d.income ?? 0,
    expense: d.expense ?? 0,
    net: d.net ?? 0,
    byCategory: (d.byCategory ?? []).map((c) => ({
      categoryId: c.categoryId ?? null,
      categoryName: c.categoryName ?? null,
      total: c.total,
    })),
    byDay: (d.byDay ?? []).map((x) => ({
      date: String(x.date).slice(0, 10),
      income: x.income,
      expense: x.expense,
      net: x.net,
    })),
    topBeneficiaries: d.topBeneficiaries ?? [],
  };
}

export async function getRecentTransactions(n: number = 10): Promise<Transaction[]> {
  const res = await api.get('/transactions', { params: { page: 1, pageSize: n } });
  const paged = unwrap<PagedDto<TransactionDto>>(res);
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
    aiSource: input.aiSource ?? null,
    aiConfidence: input.aiConfidence ?? null,
  }, idempotentConfig());
  return toTransaction(unwrap<TransactionDto>(res));
}

export async function updateTransaction(
  id: string,
  patch: UpdateTransactionInput,
): Promise<Transaction> {
  // Partial update: only include fields actually present in the patch.
  // walletId/description have no backend field and are silently dropped —
  // the backend itself enforces category-only edits for sepay_linked-wallet
  // transactions (422 synced_transaction_fields_locked) if amount/merchant/
  // transactionDate are sent for one; transfers reject any field change at
  // all (422 transfer_managed).
  const res = await api.put(`/transactions/${id}`, {
    ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.merchant !== undefined ? { merchant: patch.merchant } : {}),
    ...(patch.transactionDate !== undefined ? { transactionDate: patch.transactionDate } : {}),
  });
  return toTransaction(unwrap<TransactionDto>(res));
}

/**
 * PUT /transactions/{id}/classify — recategorize a transaction. Distinct from
 * PUT /transactions/{id} (which the backend also limits to categoryId);
 * classify is the intent-named endpoint used by the recategorize UX. Called
 * via PUT rather than PATCH (its original verb) — React Native's on-device
 * networking layer has a known history of dropping the request body
 * specifically on PATCH requests; the backend route accepts both verbs.
 */
export async function classifyTransaction(
  id: string,
  categoryId: string | null,
): Promise<Transaction> {
  const res = await api.put(`/transactions/${id}/classify`, {
    categoryId: categoryId ?? null,
  });
  return toTransaction(unwrap<TransactionDto>(res));
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`);
}

/**
 * POST /transactions/{id}/split — replace one transaction with several parts across
 * categories.
 *
 * The backend deletes the original row and writes the parts as siblings sharing a
 * `splitGroupId`, so this returns a list rather than a single transaction and the caller must
 * refetch: the id passed in no longer exists afterwards. Parts must sum to the original amount
 * exactly, or the backend rejects with `split_total_mismatch` — it will not adjust anything to
 * make them fit, because that would move the wallet balance.
 */
export async function splitTransaction(
  id: string,
  parts: SplitPartInput[],
): Promise<Transaction[]> {
  const res = await api.post(`/transactions/${id}/split`, {
    parts: parts.map((p) => ({
      categoryId: p.categoryId ?? null,
      amount: p.amount,
      note: p.note ?? null,
    })),
  }, idempotentConfig());

  // The split endpoint was introduced returning the list directly, while older/mobile-facing
  // controllers use ApiResponse<T>. Accept both shapes so the app works during a rolling deploy
  // and does not try to call `.map` on undefined after a successful split.
  const body = res.data as TransactionDto[] | { data?: TransactionDto[] };
  const rows = Array.isArray(body) ? body : body.data ?? [];
  return rows.map(toTransaction);
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
  }, idempotentConfig());
  const data = unwrap<TransferDto>(res);
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
