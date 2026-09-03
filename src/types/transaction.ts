/**
 * transaction.ts - FinViet type definitions for the Transaction domain
 *
 * Monetary amounts: number = whole Vietnamese Dong (VND).
 *
 * Date fields:
 *   transactionDate : "YYYY-MM-DD"
 *   createdAt / updatedAt : full ISO 8601 timestamp string
 *
 * Transfer accounting (resolved -- ARCHITECTURE.md section 5):
 *   Transfers create two records linked by transferPairId.
 *   All spend aggregations must filter out transfer_out and transfer_in.
 */

export type TransactionType = 'expense' | 'income' | 'transfer_out' | 'transfer_in';
export type EntryMethod = 'manual' | 'photo' | 'csv_import' | 'linked' | 'sms_paste';

export interface Transaction {
  id: string;
  customerId: string;
  walletId: string;
  /**
   * null = uncategorized (task-specified: string | null, not optional).
   * The UI must handle uncategorized entries explicitly (orange badge, Fix shortcut).
   */
  categoryId: string | null;
  /** Whole VND amount -- always positive; type determines direction */
  amount: number;
  type: TransactionType;
  description: string | null;
  merchant: string | null;
  /** ISO 8601 date string "YYYY-MM-DD" */
  transactionDate: string;
  entryMethod: EntryMethod;
  /**
   * null = not a transfer leg; non-null = UUID linking the paired transfer_out / transfer_in.
   * (task-specified: string | null, not optional)
   */
  transferPairId: string | null;
  /** External transaction ID from linked wallet provider (SePay, etc.) */
  externalId: string | null;
  /**
   * Shared by every transaction produced from one split, so the UI can show that they came
   * from a single payment. null = never part of a split.
   *
   * Optional rather than required: a backend that predates the field omits it, and the
   * transfer legs this client synthesizes locally have no split group either. Read it as
   * `?? null` rather than assuming presence.
   */
  splitGroupId?: string | null;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

/** One part of a split: which category it belongs to and how much of the original it takes. */
export interface SplitPartInput {
  categoryId: string | null;
  amount: number;
  note?: string | null;
}

// -------------------------------------------------------------------------
// UI-enriched transaction (joined with category and wallet display data)
// -------------------------------------------------------------------------

export interface TransactionWithDetails extends Transaction {
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  walletName: string | null;
}

// -------------------------------------------------------------------------
// Aggregation shapes used by the Report and Calendar screens
// -------------------------------------------------------------------------

export interface DailySpend {
  /** ISO 8601 date string "YYYY-MM-DD" */
  date: string;
  /** Total expense spend for the day (whole VND) */
  total: number;
  /** true when daily spend exceeds the user's daily average for the month */
  isAboveAverage: boolean;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  /** Total expense spend for the category (whole VND) */
  total: number;
  /** Proportion of total monthly spend, 0-100 */
  percentage: number;
}

export interface MerchantSpend {
  merchant: string;
  /** Total spend at this merchant (whole VND) */
  total: number;
  /** Number of transactions */
  count: number;
}

export interface MonthlyAggregate {
  /** "YYYY-MM" */
  month: string;
  totalExpense: number;
  totalIncome: number;
  byCategory: CategorySpend[];
  byDay: DailySpend[];
  /** Top 5 merchants by total spend */
  topMerchants: MerchantSpend[];
}

// -------------------------------------------------------------------------
// Transaction service input/return contracts (services/real/transactions.ts)
// -------------------------------------------------------------------------

export interface TransactionFilters {
  walletId?: string;
  /** Filter to a specific category. Ignored when uncategorizedOnly is true. */
  categoryId?: string;
  type?: TransactionType;
  /** ISO date string YYYY-MM-DD — inclusive lower bound */
  startDate?: string;
  /** ISO date string YYYY-MM-DD — inclusive upper bound */
  endDate?: string;
  /** When true, returns only transactions with categoryId === null */
  uncategorizedOnly?: boolean;
  /**
   * When true, filters out all cat_savings_goal transactions. Used by
   * getBudgetBuckets for the "pure category spend" side of the Savings
   * bucket — goal money is netted in separately there so it isn't
   * double-counted via defaultBucket resolution. Default false — goal
   * contributions appear in the full transaction history.
   */
  hideGoalContributions?: boolean;
}

export interface TransactionSummaryCategory {
  categoryId: string | null;
  categoryName: string | null;
  total: number;
}

export interface TransactionSummaryDay {
  /** 'YYYY-MM-DD' */
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface TransactionSummaryBeneficiary {
  beneficiary: string;
  total: number;
}

export interface TransactionSummary {
  income: number;
  expense: number;
  net: number;
  byCategory: TransactionSummaryCategory[];
  byDay: TransactionSummaryDay[];
  topBeneficiaries: TransactionSummaryBeneficiary[];
}

export interface CreateTransactionInput {
  walletId: string;
  categoryId: string | null;
  amount: number;
  type: 'expense' | 'income';
  description: string | null;
  merchant: string | null;
  transactionDate: string;
  entryMethod: EntryMethod;
  externalId?: string | null;
  /** Set only when categoryId came from an AI/rule suggestion at import time (e.g. an
   * unedited CSV/SMS/photo suggestion) — omitted for a manually chosen category. Backend uses
   * this to write a categorization-decision audit record. */
  aiSource?: string;
  aiConfidence?: number;
}

export interface UpdateTransactionInput {
  amount?: number;
  description?: string | null;
  merchant?: string | null;
  categoryId?: string | null;
  walletId?: string;
  transactionDate?: string;
}

export interface CreateTransferInput {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string | null;
  transactionDate?: string;
}

export interface CreateTransferResult {
  outTx: Transaction;
  inTx: Transaction;
}
