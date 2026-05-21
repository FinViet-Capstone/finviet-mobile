export interface PhotoExtractionResult {
  amount: number | null;
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
