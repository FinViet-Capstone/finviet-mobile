import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { linkSepayWithToken, SepaySandboxUnavailableError } from '../sepay';

jest.mock('@/lib/mmkv', () => ({
  getAccessToken: jest.fn(() => null), getRefreshToken: jest.fn(() => null),
  clearAuthTokens: jest.fn(), setAuthTokens: jest.fn(),
}));

const mock = new AxiosMockAdapter(api);
afterEach(() => mock.reset());
afterAll(() => mock.restore());

it.each([404, 405])('reports an old server (%s) without retrying a Sandbox token in production', async (status) => {
  mock.onPost('/wallets/sepay/link-sandbox-token').reply(status);
  await expect(linkSepayWithToken('test-token', undefined, true))
    .rejects.toBeInstanceOf(SepaySandboxUnavailableError);
  expect(mock.history.post).toHaveLength(1);
  expect(mock.history.post[0].url).toBe('/wallets/sepay/link-sandbox-token');
});

it('can link an empty demo account without any real transactions', async () => {
  mock.onPost('/wallets/sepay/link-sandbox-token').reply(200, {
    success: true, data: { wallets: [], transactionsSynced: 0 },
  });
  await expect(linkSepayWithToken('test-token', '000000001', true))
    .resolves.toEqual({ wallets: [], transactionsSynced: 0 });
  expect(JSON.parse(mock.history.post[0].data)).toEqual({
    apiToken: 'test-token', accountNumber: '000000001', sandbox: true,
  });
});

it('preserves a real Sandbox validation error', async () => {
  mock.onPost('/wallets/sepay/link-sandbox-token').reply(400, {
    message: 'Token SePay Sandbox không hợp lệ hoặc đã hết hạn.',
  });
  await expect(linkSepayWithToken('test-token', undefined, true)).rejects.toMatchObject({
    response: { status: 400, data: { message: 'Token SePay Sandbox không hợp lệ hoặc đã hết hạn.' } },
  });
  expect(mock.history.post).toHaveLength(1);
});

it('keeps explicit production links on the production route', async () => {
  mock.onPost('/wallets/sepay/link-token').reply(200, {
    success: true, data: { wallets: [], transactionsSynced: 0 },
  });
  await linkSepayWithToken('production-token', undefined, false);
  expect(mock.history.post[0].url).toBe('/wallets/sepay/link-token');
  expect(JSON.parse(mock.history.post[0].data).sandbox).toBe(false);
});
