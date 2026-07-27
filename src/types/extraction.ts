export interface PhotoExtractionResult {
  amount: number | null;
  /** Direction parsed from the source (SMS credit/debit). Undefined = unknown → caller keeps its default. */
  type?: 'income' | 'expense';
  merchant: string | null;
  transactionDate: string;
  categoryId: string | null;
  confidence: {
    amount: number;
    merchant: number;
    transactionDate: number;
    categoryId: number;
  };
}
