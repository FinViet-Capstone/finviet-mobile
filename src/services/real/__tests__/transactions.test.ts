import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getTransactions } from '@/services/real/transactions';

function transactionDto(id: string, createdAt: string) {
  return {
    transactionId: id,
    customerId: 'customer',
    walletId: 'wallet',
    categoryId: 'cat_savings_goal',
    transactionType: id === 'withdrawal' ? 'income' : 'expense',
    entryMethod: 'manual',
    amount: 5_000_000,
    transactionDate: '2026-08-14T00:00:00Z',
    description:
      id === 'withdrawal'
        ? 'Rút mục tiêu: Mua airpod'
        : 'Nạp mục tiêu: Mua airpod',
    createdAt,
  };
}

function successPage(page: number, totalPages: number, items: object[]) {
  return {
    success: true,
    data: {
      page,
      pageSize: 100,
      totalItems: 2,
      totalPages,
      items,
    },
  };
}

describe('real transactions service', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('fetches every backend page with the supported page size', async () => {
    mock.onGet('/transactions').reply((config) => {
      expect(config.params).toMatchObject({
        pageSize: 100,
        from: '2026-08-01',
        to: '2026-08-31',
      });

      if (config.params.page === 1) {
        return [
          200,
          successPage(1, 2, [
            transactionDto('contribution', '2026-08-14T01:00:00Z'),
          ]),
        ];
      }

      expect(config.params.page).toBe(2);
      return [
        200,
        successPage(2, 2, [
          transactionDto('withdrawal', '2026-08-14T02:00:00Z'),
        ]),
      ];
    });

    const rows = await getTransactions({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });

    expect(rows.map((row) => row.id)).toEqual([
      'withdrawal',
      'contribution',
    ]);
    expect(mock.history.get).toHaveLength(2);
  });

  it('maps sepay_sync to the linked entry method and carries the AI fields', async () => {
    mock.onGet('/transactions').reply(200, successPage(1, 1, [
      {
        ...transactionDto('sepay', '2026-08-14T01:00:00Z'),
        entryMethod: 'sepay_sync',
        categoryId: null,
        categorizationStatus: 'suggested',
        aiSuggestedCategoryId: 'cat_food',
        aiSuggestedCategoryName: 'Ăn uống',
        aiConfidence: 0.82,
        aiSource: 'ai_suggestion',
      },
    ]));

    const [row] = await getTransactions();

    expect(row).toMatchObject({
      entryMethod: 'linked',
      categorizationStatus: 'suggested',
      aiSuggestedCategoryId: 'cat_food',
      aiSuggestedCategoryName: 'Ăn uống',
      aiConfidence: 0.82,
      aiSource: 'ai_suggestion',
    });
  });

  it('treats a missing categorizationStatus as none (older backend)', async () => {
    mock.onGet('/transactions').reply(200, successPage(1, 1, [
      transactionDto('legacy', '2026-08-14T01:00:00Z'),
    ]));

    const [row] = await getTransactions();

    expect(row.categorizationStatus).toBe('none');
    expect(row.aiSuggestedCategoryId).toBeNull();
    expect(row.aiSuggestedCategoryName).toBeNull();
    expect(row.aiConfidence).toBeNull();
    expect(row.aiSource).toBeNull();
  });

  it('falls back to none for an unknown categorizationStatus', async () => {
    mock.onGet('/transactions').reply(200, successPage(1, 1, [
      { ...transactionDto('odd', '2026-08-14T01:00:00Z'), categorizationStatus: 'bogus' },
    ]));

    const [row] = await getTransactions();

    expect(row.categorizationStatus).toBe('none');
  });

  it('sends categorizationStatus (comma-separated) and entryMethod filters', async () => {
    mock.onGet('/transactions').reply(200, successPage(1, 1, []));

    await getTransactions({
      categorizationStatus: ['pending', 'suggested'],
      entryMethod: 'linked',
    });

    expect(mock.history.get[0].params).toMatchObject({
      categorizationStatus: 'pending,suggested',
      entryMethod: 'sepay_sync',
    });
  });

  it('omits the new filters when not provided', async () => {
    mock.onGet('/transactions').reply(200, successPage(1, 1, []));

    await getTransactions({ walletId: 'w1' });

    expect(mock.history.get[0].params).not.toHaveProperty('categorizationStatus');
    expect(mock.history.get[0].params).not.toHaveProperty('entryMethod');
  });
});
