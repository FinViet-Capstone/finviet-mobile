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

/**
 * One parsed row from a CSV/XLSX bank-statement import. Unlike photo/SMS
 * extraction (single candidate), CSV extraction returns many rows at once.
 */
export interface CsvExtractionRow {
  amount: number;
  type: 'income' | 'expense';
  merchant: string | null;
  transactionDate: string;
  /** AI-suggested category — null when the model couldn't classify the row. */
  categoryId: string | null;
  categoryName: string | null;
  /** AI classification confidence for categoryId, 0–1. Null when categoryId is null. */
  confidence: number | null;
}

export interface CsvExtractionResult {
  rows: CsvExtractionRow[];
  totalScanned: number;
  skipped: number;
  errors: string[];
}
