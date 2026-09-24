/**
 * Regression test for a slow logout signing out whoever logged in next.
 *
 * The settings screen routes to the auth stack as soon as logout starts, but
 * the session used to be cleared only once the best-effort network calls
 * settled (up to the request timeout when offline). Anyone who signed in
 * during that wait was then signed straight back out by the stale logout.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/lib/queryClient';
import { logout, unregisterNotificationDevice } from '@/services';
import { getRefreshToken, setAuthTokens } from '@/lib/mmkv';
import type { Customer } from '@/types';

jest.mock('@/services', () => ({
  logout: jest.fn(async () => undefined),
  unregisterNotificationDevice: jest.fn(async () => undefined),
}));
jest.mock('@/lib/notificationStorage', () => ({
  getNotificationInstallationId: jest.fn(async () => 'install-1'),
}));

const A = { id: 'a', email: 'khoikiet130@gmail.com', onboardingDone: true } as unknown as Customer;
const B = { id: 'b', email: 'khoicongviec@gmail.com', onboardingDone: true } as unknown as Customer;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Holds one of logout's network calls open until the test releases it. */
function stall(call: jest.Mock) {
  let release: (() => void) | undefined;
  call.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  return {
    reached: () => expect(release).toBeDefined(),
    release: () => release?.(),
  };
}

let signIns = 0;

/** What a successful login does: store fresh tokens, then open the session. */
function signIn(customer: Customer) {
  signIns += 1;
  const refreshToken = `refresh-${customer.id}-${signIns}`;
  setAuthTokens({ accessToken: `access-${customer.id}-${signIns}`, refreshToken });
  useAuthStore.getState().setSession(customer);
  return refreshToken;
}

describe('a logout that settles after the next sign-in', () => {
  afterEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().clearSession();
  });

  it.each([
    ['a different account', 'device unregister', B, unregisterNotificationDevice],
    ['a different account', 'token revoke', B, logout],
    ['the same account again', 'device unregister', A, unregisterNotificationDevice],
    ['the same account again', 'token revoke', A, logout],
  ])('keeps %s signed in when it signs in during the %s', async (_who, _call, next, slowCall) => {
    const signedOutToken = signIn(A);
    const slow = stall(slowCall as jest.Mock);
    const { result } = renderHook(() => useLogout(), { wrapper });

    let pending!: Promise<void>;
    act(() => { pending = result.current.mutateAsync(); });
    await waitFor(slow.reached);
    let nextToken!: string;
    act(() => { nextToken = signIn(next); });
    slow.release();
    await act(() => pending);

    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, customer: next });
    expect(getRefreshToken()).toBe(nextToken);
    // Only the signed-out session's token is revoked server-side.
    expect(logout).toHaveBeenCalledWith(signedOutToken);
  });

  it('still signs out when nobody signed in meanwhile', async () => {
    signIn(A);
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, customer: null });
    expect(getRefreshToken()).toBeUndefined();
  });
});
