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
export type EntryMethod = 'manual' | 'photo' | 'csv_import';

export interface Transaction {
  id: string;
  userId: string;
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
  /** AI-suggested category before user confirmation */
  aiSuggestedCategoryId: string | null;
  /** true when user overrode the AI suggestion */
  aiOverridden: boolean;
  entryMethod: EntryMethod;
  /**
   * null = not a transfer leg; non-null = UUID linking the paired transfer_out / transfer_in.
   * (task-specified: string | null, not optional)
   */
  transferPairId: string | null;
  /** Source image URL for Photo Entry; null for manual / CSV transactions */
  imageUrl: string | null;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
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
