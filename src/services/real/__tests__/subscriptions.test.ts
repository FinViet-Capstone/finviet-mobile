import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import {
  createPaymentOrder,
  getPaymentStatus,
  getSubscriptionPlans,
  getCurrentSubscription,
} from '../subscriptions';

jest.mock('@/lib/mmkv', () => ({
  getAccessToken: jest.fn(() => null), getRefreshToken: jest.fn(() => null),
  clearAuthTokens: jest.fn(), setAuthTokens: jest.fn(),
}));

function success<T>(data: T) {
  return { success: true, data };
}

describe('real subscriptions service - PayOS', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('getSubscriptionPlans fetches from /subscriptions/plans', async () => {
    const plans = [{ planId: 'plan-monthly', name: 'Premium thang', price: 29000, billingIntervalMonths: 1, features: ['AI'], isActive: true }];
    mock.onGet('/subscriptions/plans').reply(200, success(plans));
    expect(await getSubscriptionPlans()).toEqual(plans);
  });

  it('getCurrentSubscription returns null when no subscription exists', async () => {
    mock.onGet('/subscriptions/current').reply(200, success(null));
    expect(await getCurrentSubscription()).toBeNull();
  });

  it('createPaymentOrder posts planId and sends idempotency header', async () => {
    const order = { orderCode: 123456, qrCode: '00020101...', amount: 29000, description: 'Premium thang', expiresAt: '2026-09-21T12:15:00Z' };
    mock.onPost('/subscriptions/create-payment').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.planId).toBe('plan-monthly');
      expect(config.headers?.['Idempotency-Key']).toBe('key-abc');
      return [200, success(order)];
    });
    const result = await createPaymentOrder('plan-monthly', 'key-abc');
    expect(result.orderCode).toBe(123456);
    expect(result.qrCode).toBe('00020101...');
  });

  it('retries with same idempotency key after a timeout', async () => {
    mock.onPost('/subscriptions/create-payment').timeoutOnce();
    await expect(createPaymentOrder('plan-1', 'retry-key')).rejects.toThrow();
    const order = { orderCode: 789, qrCode: 'qr-data', amount: 29000, description: 'test', expiresAt: '2026-09-21T12:15:00Z' };
    mock.onPost('/subscriptions/create-payment').reply(200, success(order));
    await expect(createPaymentOrder('plan-1', 'retry-key')).resolves.toEqual(order);
    expect(mock.history.post).toHaveLength(2);
    for (const call of mock.history.post) {
      expect(call.headers?.['Idempotency-Key']).toBe('retry-key');
    }
  });

  it('getPaymentStatus fetches from /subscriptions/payment-status/{orderCode}', async () => {
    const status = { orderCode: 123456, status: 'succeeded', amount: 29000, subscriptionId: 'sub-1' };
    mock.onGet('/subscriptions/payment-status/123456').reply(200, success(status));
    const result = await getPaymentStatus(123456);
    expect(result.status).toBe('succeeded');
    expect(result.subscriptionId).toBe('sub-1');
  });
});
