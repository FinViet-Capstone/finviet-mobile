import type { CsvExtractionResult, PhotoExtractionResult } from '@/types/extraction';

export function extractFromPhoto(_uri: string): Promise<PhotoExtractionResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        amount: 85_000,
        merchant: 'Circle K',
        transactionDate: new Date().toISOString().split('T')[0],
        categoryId: null,
        confidence: {
          amount: 0.95,
          merchant: 0.88,
          transactionDate: 0.92,
          categoryId: 0.4,
        },
      });
    }, 1500);
  });
}

/**
 * Mock SMS extraction. Real version posts the SMS body to a backend endpoint that
 * runs an LLM with regex pre-extraction. Shape mirrors PhotoExtractionResult so
 * the screen's confidence-driven uncertain highlighting works identically.
 */
export function extractFromSMS(_text: string): Promise<PhotoExtractionResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        amount: 125_000,
        merchant: 'Grab Food',
        transactionDate: new Date().toISOString().split('T')[0],
        categoryId: 'cat_food',
        confidence: {
          amount: 0.99,
          merchant: 0.85,
          transactionDate: 0.98,
          categoryId: 0.78,
        },
      });
    }, 900);
  });
}

/**
 * Mock CSV extraction. Real version posts the file to a backend endpoint that
 * parses rows and runs AI categorization per row. Ignores the input file and
 * returns a fixed sample so the review-list UX can be exercised without a
 * real bank export on hand.
 */
export function extractFromCsv(
  _fileUri: string,
  _fileName: string,
  _maxRows?: number,
): Promise<CsvExtractionResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        rows: [
          {
            amount: 45_000,
            type: 'expense',
            merchant: 'Cà phê Highlands',
            transactionDate: new Date().toISOString().split('T')[0],
            categoryId: 'cat_food',
            categoryName: 'Ăn uống',
            confidence: 0.86,
          },
          {
            amount: 12_000_000,
            type: 'income',
            merchant: 'Lương tháng',
            transactionDate: new Date().toISOString().split('T')[0],
            categoryId: null,
            categoryName: null,
            confidence: null,
          },
        ],
        totalScanned: 2,
        skipped: 0,
        errors: [],
      });
    }, 1200);
  });
}
