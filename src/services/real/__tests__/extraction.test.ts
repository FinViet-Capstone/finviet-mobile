/* eslint-disable import/first -- network/token mocks must exist before service import */

const mockExpoFetch = jest.fn();

jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockExpoFetch(...args),
}));
jest.mock('@/lib/mmkv', () => ({ getAccessToken: () => 'access-token' }));
jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
  refreshAccessToken: jest.fn(),
  unwrap: jest.fn(),
}));

import { extractFromPhoto } from '@/services/real/extraction';

function reply(rows: object[]) {
  mockExpoFetch.mockResolvedValueOnce({
    status: 200,
    text: async () => JSON.stringify({
      success: true,
      data: { rows, totalScanned: 1, skipped: 0, errors: [] },
    }),
  });
}

const PHOTO = {
  uri: 'content://picker/receipt',
  fileName: 'receipt.jpg',
  mimeType: 'image/jpeg',
  base64: 'AQID',
};

afterEach(() => mockExpoFetch.mockReset());

describe('real receipt extraction service', () => {
  it('uploads the ImagePicker bytes as the backend File multipart field', async () => {
    reply([{
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
    }]);

    const result = await extractFromPhoto(PHOTO);

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
    const [url, options] = mockExpoFetch.mock.calls[0];
    expect(url).toContain('/extract/photo');
    expect(options.headers.Authorization).toBe('Bearer access-token');
    expect(options.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
    const body = options.body as Uint8Array;
    const bodyText = new TextDecoder().decode(body);
    expect(bodyText).toContain('name="File"; filename="receipt.jpg"');
    expect(Array.from(body).some((value, index) =>
      value === 1 && body[index + 1] === 2 && body[index + 2] === 3,
    )).toBe(true);
  });

  it('keeps backward-compatible confidence for an older backend response', async () => {
    reply([{
      amount: 50000,
      type: 'EXPENSE',
      merchant: 'Quán cũ',
      description: null,
      transactionDate: '2026-09-04T00:00:00',
      categoryId: null,
      categoryName: null,
      confidence: null,
    }]);

    const result = await extractFromPhoto(PHOTO);

    expect(result.confidence).toEqual({
      amount: 0.95,
      merchant: 0.85,
      transactionDate: 0.95,
      categoryId: 0,
    });
  });

  it('clamps malformed backend confidence into the supported range', async () => {
    reply([{
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
    }]);

    const result = await extractFromPhoto(PHOTO);

    expect(result.confidence.amount).toBe(1);
    expect(result.confidence.merchant).toBe(0);
    expect(result.confidence.transactionDate).toBe(0.95);
  });

  it('fails before the network when no picker payload is available', async () => {
    await expect(extractFromPhoto('file:///expired-picker-uri.jpg')).rejects.toThrow(
      'Ảnh không còn dữ liệu',
    );
    expect(mockExpoFetch).not.toHaveBeenCalled();
  });
});
