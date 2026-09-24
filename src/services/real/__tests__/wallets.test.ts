import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getWallets } from '@/services/real/wallets';

describe('real wallets service', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('fills linkedMetadata for a linked wallet', async () => {
    mock.onGet('/wallets').reply(200, {
      success: true,
      data: {
        totalBalance: 100,
        wallets: [
          {
            walletId: 'w1',
            customerId: 'c',
            walletName: 'MB Bank',
            walletType: 'sepay_linked',
            balance: 100,
            institutionName: 'MB',
            accountMask: '****1234',
            lastSyncedAt: '2026-09-01T00:00:00Z',
          },
        ],
      },
    });

    const { wallets } = await getWallets();

    expect(wallets[0].type).toBe('linked');
    expect(wallets[0].linkedMetadata).toMatchObject({
      institutionName: 'MB',
      accountNumber: '****1234',
      lastSyncAt: '2026-09-01T00:00:00Z',
      syncStatus: 'active',
    });
  });

  it('leaves linkedMetadata undefined for a basic wallet', async () => {
    mock.onGet('/wallets').reply(200, {
      success: true,
      data: {
        totalBalance: 0,
        wallets: [
          { walletId: 'w2', customerId: 'c', walletName: 'Cash', walletType: 'basic', balance: 0 },
        ],
      },
    });

    const { wallets } = await getWallets();

    expect(wallets[0].linkedMetadata).toBeUndefined();
  });
});
