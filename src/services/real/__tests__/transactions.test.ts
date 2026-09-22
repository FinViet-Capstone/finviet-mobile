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
});
