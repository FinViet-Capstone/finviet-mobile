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
