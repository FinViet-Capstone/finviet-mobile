import type { PhotoExtractionResult } from '@/types/extraction';

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
