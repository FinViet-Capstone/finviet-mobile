import React from 'react';
import { AppState } from 'react-native';
import { configure, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import SubscriptionScreen from '../../../app/settings/subscription';
import { createPaymentOrder, getCurrentSubscription, getPaymentStatus, getSubscriptionPlans } from '@/services/real/subscriptions';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), Redirect: () => null, useIsFocused: () => true }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ customer: { id: 'customer-1' } }) }));
jest.mock('@/providers/ThemeProvider', () => ({ useThemeColors: () => ({ ...jest.requireActual<typeof import('@/theme')>('@/theme').COLORS, success: '#4CAF50' }) }));
jest.mock('@/components/common/MaterialIcon', () => ({ MaterialIcon: () => null }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: (props: { value: string }) => <View testID="qr-code" accessibilityLabel={props.value} /> };
});
jest.mock('@/services/real/subscriptions', () => ({
  createPaymentOrder: jest.fn(),
  getCurrentSubscription: jest.fn(),
  getPaymentStatus: jest.fn(),
  getSubscriptionPlans: jest.fn(),
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
  jest.mocked(getSubscriptionPlans).mockResolvedValue([
    { planId: 'plan-1', name: 'Premium thang', price: 29000, billingIntervalMonths: 1, features: ['Bao cao AI'], isActive: true },
  ]);
  jest.mocked(getPaymentStatus).mockResolvedValue({ orderCode: 100001, status: 'pending', amount: 29000, subscriptionId: null });
});
afterEach(() => jest.useRealTimers());

function screen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SubscriptionScreen /></QueryClientProvider>);
}

const order = () => ({
  orderCode: 100001,
  qrCode: '00020101021138570010A00000072701270006970422011300001234567890208QRIBFTTA53037045405290005802VN62280824Premium thang FinViet6304ABCD',
  amount: 29000,
  description: 'Premium thang',
  expiresAt: new Date(Date.now() + 900_000).toISOString(),
});

it('shows in-app QR code and waits for backend confirmation before showing success', async () => {
  jest.mocked(createPaymentOrder).mockResolvedValue(order());
  const view = screen();
  fireEvent.press(await view.findByText('Dang ky'));
  const qr = await view.findByTestId('qr-code');
  expect(qr).toBeTruthy();
  expect(view.queryByText('Thanh toan thanh cong')).toBeNull();
  await waitFor(() => expect(view.getByText('Kiem tra thanh toan')).toBeTruthy());
  jest.mocked(getPaymentStatus).mockResolvedValue({ orderCode: 100001, status: 'succeeded', amount: 29000, subscriptionId: 'sub-1' });
  fireEvent.press(view.getByText('Kiem tra thanh toan'));
  expect(await view.findByText('Thanh toan thanh cong')).toBeTruthy();
  view.unmount();
});

it('persists the attempt before sending and reuses the idempotency key after a network failure', async () => {
  jest.mocked(createPaymentOrder).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(order());
  const view = screen();
  fireEvent.press(await view.findByText('Dang ky'));
  await waitFor(() => expect(createPaymentOrder).toHaveBeenCalledTimes(1));
  fireEvent.press(await view.findByText('Tiep tuc giao dich'));
  await view.findByTestId('qr-code');
  const calls = jest.mocked(createPaymentOrder).mock.calls;
  expect(calls[1][1]).toBe(calls[0][1]);
  expect(jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(createPaymentOrder).mock.invocationCallOrder[0]);
  view.unmount();
});

it('shows failure state and lets user try again', async () => {
  jest.mocked(createPaymentOrder).mockResolvedValue(order());
  jest.mocked(getPaymentStatus).mockResolvedValue({ orderCode: 100001, status: 'failed', amount: 29000, subscriptionId: null });
  const view = screen();
  fireEvent.press(await view.findByText('Dang ky'));
  expect(await view.findByText('Thanh toan khong thanh cong')).toBeTruthy();
  expect(view.getByText('Chon lai goi')).toBeTruthy();
  view.unmount();
});
