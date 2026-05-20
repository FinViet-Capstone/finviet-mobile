export type TransactionType = 'expense' | 'income' | 'transfer_out' | 'transfer_in';
export type EntryMethod = 'manual' | 'photo' | 'csv_import';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId?: string;
  amount: number;
  type: TransactionType;
  description?: string;
  merchant?: string;
  transactionDate: string; // ISO date string YYYY-MM-DD
  aiSuggestedCategoryId?: string;
  aiOverridden: boolean;
  entryMethod: EntryMethod;
  transferPairId?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWithDetails extends Transaction {
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  walletName?: string;
}

export interface DailySpend {
  date: string;
  total: number;
  isAboveAverage: boolean;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

export interface MerchantSpend {
  merchant: string;
  total: number;
  count: number;
}

export interface MonthlyAggregate {
  month: string; // YYYY-MM
  totalExpense: number;
  totalIncome: number;
  byCategory: CategorySpend[];
  byDay: DailySpend[];
  topMerchants: MerchantSpend[];
}
