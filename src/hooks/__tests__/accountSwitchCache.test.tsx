/**
 * Regression test for one account's data showing up in another account.
 *
 * Signing out of account A and into account B on the same device used to show
 * B the wallets (and transactions, budgets, goals...) that were cached for A.
 * Those query keys carry no account id, and logout only dropped the
 * notification queries, so B's screens found A's still-fresh cache entries and
 * never refetched.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useWallets } from '@/hooks/useWallets';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/lib/queryClient';
import type { Customer } from '@/types';

// The backend answers for whoever the session belongs to.
jest.mock('@/services', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore: store } = require('@/stores/authStore');
  return {
    getWallets: jest.fn(async () => [
      { id: `wallet-of-${store.getState().customer?.email}` },
    ]),
    logout: jest.fn(async () => undefined),
    unregisterNotificationDevice: jest.fn(async () => undefined),
  };
});
jest.mock('@/lib/notificationStorage', () => ({
  getNotificationInstallationId: jest.fn(async () => 'install-1'),
}));

const A = { id: 'a', email: 'khoikiet130@gmail.com', onboardingDone: true } as unknown as Customer;
const B = { id: 'b', email: 'khoicongviec@gmail.com', onboardingDone: true } as unknown as Customer;

describe('switching accounts on one device', () => {
  // The app's own client, so a fix that clears the app's cache is exercised.
  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  afterEach(() => {
    queryClient.clear();
  });

  it("shows the new account's wallets, not the previous account's", async () => {
    useAuthStore.getState().setSession(A);
    const asA = renderHook(() => useWallets(), { wrapper });
    await waitFor(() => expect(asA.result.current.data).toEqual([{ id: 'wallet-of-khoikiet130@gmail.com' }]));
    asA.unmount();

    const logout = renderHook(() => useLogout(), { wrapper });
    await act(() => logout.result.current.mutateAsync());
    logout.unmount();

    useAuthStore.getState().setSession(B);
    const asB = renderHook(() => useWallets(), { wrapper });
    await waitFor(() => expect(asB.result.current.isFetching).toBe(false));
    expect(asB.result.current.data).toEqual([{ id: 'wallet-of-khoicongviec@gmail.com' }]);
  });

  it("drops the previous account's data when a different account signs in without a logout", async () => {
    useAuthStore.getState().setSession(A);
    const asA = renderHook(() => useWallets(), { wrapper });
    await waitFor(() => expect(asA.result.current.data).toEqual([{ id: 'wallet-of-khoikiet130@gmail.com' }]));
    asA.unmount();

    useAuthStore.getState().setSession(B);
    const asB = renderHook(() => useWallets(), { wrapper });
    await waitFor(() => expect(asB.result.current.isFetching).toBe(false));
    expect(asB.result.current.data).toEqual([{ id: 'wallet-of-khoicongviec@gmail.com' }]);
  });
});
