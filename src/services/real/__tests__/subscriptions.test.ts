import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getSubscriptionPayment, isVNPayUrl, subscribeToPlan } from '../subscriptions';

jest.mock('@/lib/mmkv', () => ({
  getAccessToken: jest.fn(() => null), getRefreshToken: jest.fn(() => null),
  clearAuthTokens: jest.fn(), setAuthTokens: jest.fn(),
}));

const mock = new AxiosMockAdapter(api);
afterEach(() => mock.reset());
afterAll(() => mock.restore());

it('retries a timed-out checkout with the same key and server-priced payload', async () => {
  const attempt = { planId: 'plan-1', key: 'retry-key', returnUrl: 'https://example.com/return' };
  mock.onPost('/subscriptions/subscribe').timeoutOnce();
  await expect(subscribeToPlan(attempt)).rejects.toThrow();
  const result = { paymentId: 'payment-1', redirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', amount: 49000, expiresAt: '2026-09-18T10:00:00Z' };
  mock.onPost('/subscriptions/subscribe').reply(200, { success: true, data: result });
  await expect(subscribeToPlan(attempt)).resolves.toEqual(result);
  expect(mock.history.post).toHaveLength(2);
  for (const call of mock.history.post) {
    expect(call.headers?.['Idempotency-Key']).toBe('retry-key');
    expect(JSON.parse(call.data)).toEqual({ planId: 'plan-1', returnUrl: attempt.returnUrl });
  }
});

it('keeps a payment pending until the backend confirms success', async () => {
  mock.onGet('/subscriptions/payments/payment-1').reply(200, { success: true, data: { paymentId: 'payment-1', status: 'pending', amount: 49000, subscriptionId: null } });
  expect((await getSubscriptionPayment('payment-1')).status).toBe('pending');
});

it.each([
  ['https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', true],
  ['https://pay.vnpay.vn/vpcpay.html', true],
  ['https://sandbox.vnpayment.vn.evil.example/pay', false],
  ['http://pay.vnpay.vn/pay', false],
  ['javascript:alert(1)', false],
])('validates payment destination %s', (url, valid) => {
  expect(isVNPayUrl(url)).toBe(valid);
});
