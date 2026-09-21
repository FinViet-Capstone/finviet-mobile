import React from 'react';
import { AppState, Linking } from 'react-native';
import { configure, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import SubscriptionScreen from '../../../app/settings/subscription';
import { getCurrentSubscription, getSubscriptionPayment, getSubscriptionPlans, subscribeToPlan } from '@/services/real/subscriptions';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), Redirect: () => null, useIsFocused: () => true }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ customer: { id: 'customer-1' } }) }));
jest.mock('@/providers/ThemeProvider', () => ({ useThemeColors: () => jest.requireActual<typeof import('@/theme')>('@/theme').COLORS }));
jest.mock('@/components/common/MaterialIcon', () => ({ MaterialIcon: () => null }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@/services/real/subscriptions', () => ({
  getCurrentSubscription: jest.fn(), getSubscriptionPayment: jest.fn(), getSubscriptionPlans: jest.fn(), subscribeToPlan: jest.fn(),
  subscriptionReturnUrl: () => 'https://api.example.com/api/subscriptions/vnpay/return',
  isVNPayUrl: () => true,
}));

jest.setTimeout(60000);
configure({ asyncUtilTimeout: 15000 });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue();
  jest.mocked(getCurrentSubscription).mockResolvedValue(null);
  jest.mocked(getSubscriptionPlans).mockResolvedValue([{ planId: 'plan-1', name: 'Premium tháng', price: 49000, billingIntervalMonths: 1, features: ['Báo cáo chi tiết'], isActive: true }]);
  jest.mocked(getSubscriptionPayment).mockResolvedValue({ paymentId: 'payment-1', status: 'pending', amount: 49000, subscriptionId: null });
});
afterEach(() => jest.useRealTimers());

function screen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SubscriptionScreen /></QueryClientProvider>);
}
const checkout = () => ({ paymentId: 'payment-1', redirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', amount: 49000, expiresAt: new Date(Date.now() + 900000).toISOString() });

it('opens hosted VNPay checkout and waits for backend confirmation before showing success', async () => {
  jest.mocked(subscribeToPlan).mockResolvedValue(checkout());
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const view = screen();
  fireEvent.press(await view.findByText('Chọn gói · VNPay'));
  fireEvent.press(await view.findByText('Mở trang thanh toán VNPay'));
  expect(open).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
  expect(view.queryByText('Thanh toán thành công')).toBeNull();
  await waitFor(() => expect(view.getByText('Tôi đã thanh toán · Kiểm tra kết quả')).toBeTruthy());
  jest.mocked(getSubscriptionPayment).mockResolvedValue({ paymentId: 'payment-1', status: 'succeeded', amount: 49000, subscriptionId: 'subscription-1' });
  fireEvent.press(view.getByText('Tôi đã thanh toán · Kiểm tra kết quả'));
  expect(await view.findByText('Thanh toán thành công')).toBeTruthy();
  view.unmount();
  open.mockRestore();
});

it('persists the attempt before sending and reuses it after a network failure', async () => {
  jest.mocked(subscribeToPlan).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(checkout());
  const view = screen();
  fireEvent.press(await view.findByText('Chọn gói · VNPay'));
  await waitFor(() => expect(subscribeToPlan).toHaveBeenCalledTimes(1));
  fireEvent.press(await view.findByText('Tiếp tục giao dịch'));
  await view.findByText('Mở trang thanh toán VNPay');
  const calls = jest.mocked(subscribeToPlan).mock.calls;
  expect(calls[1][0].key).toBe(calls[0][0].key);
  expect(jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(subscribeToPlan).mock.invocationCallOrder[0]);
  view.unmount();
});
