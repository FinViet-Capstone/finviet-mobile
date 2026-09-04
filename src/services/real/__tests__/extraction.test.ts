import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { extractFromPhoto } from '@/services/real/extraction';

const mock = new AxiosMockAdapter(api);

afterEach(() => mock.reset());
afterAll(() => mock.restore());

describe('real receipt extraction service', () => {
  it('uses backend field confidence and allows a slow OCR response', async () => {
    mock.onPost('/extract/photo').reply(200, {
      success: true,
      data: {
        rows: [
          {
            amount: 87000,
            type: 'EXPENSE',
            merchant: 'MINIMART',
            description: 'Bánh AFC',
            transactionDate: '2018-03-12T00:00:00',
            amountConfidence: 0.81,
            merchantConfidence: 0.72,
            transactionDateConfidence: 0.63,
            categoryId: 'cat_food',
            categoryName: 'Ăn uống',
            confidence: 0.7,
          },
        ],
        totalScanned: 1,
        skipped: 0,
        errors: [],
      },
    });

    const result = await extractFromPhoto('file:///receipt.jpg');

    expect(result).toMatchObject({
      amount: 87000,
      merchant: 'MINIMART',
      transactionDate: '2018-03-12',
      categoryId: 'cat_food',
      confidence: {
        amount: 0.81,
        merchant: 0.72,
        transactionDate: 0.63,
        categoryId: 0.7,
      },
    });
    expect(mock.history.post[0].timeout).toBe(120_000);
  });

  it('keeps backward-compatible confidence for an older backend response', async () => {
    mock.onPost('/extract/photo').reply(200, {
      success: true,
      data: {
        rows: [
          {
            amount: 50000,
            type: 'EXPENSE',
            merchant: 'Quán cũ',
            description: null,
            transactionDate: '2026-09-04T00:00:00',
            categoryId: null,
            categoryName: null,
            confidence: null,
          },
        ],
        totalScanned: 1,
        skipped: 0,
        errors: [],
      },
    });

    const result = await extractFromPhoto('file:///receipt.jpg');

    expect(result.confidence).toEqual({
      amount: 0.95,
      merchant: 0.85,
      transactionDate: 0.95,
      categoryId: 0,
    });
  });

  it('clamps malformed backend confidence into the supported range', async () => {
    mock.onPost('/extract/photo').reply(200, {
      success: true,
      data: {
        rows: [
          {
            amount: 90000,
            type: 'EXPENSE',
            merchant: 'FinViet Mart',
            description: null,
            transactionDate: '2026-09-03T00:00:00',
            amountConfidence: 1.7,
            merchantConfidence: -0.5,
            transactionDateConfidence: Number.NaN,
            categoryId: null,
            categoryName: null,
            confidence: null,
          },
        ],
        totalScanned: 1,
        skipped: 0,
        errors: [],
      },
    });

    const result = await extractFromPhoto('file:///receipt.jpg');

    expect(result.confidence.amount).toBe(1);
    expect(result.confidence.merchant).toBe(0);
    expect(result.confidence.transactionDate).toBe(0.95);
  });
});
