/**
 * Regression tests for useUpdatePreferences' notification-toggle merge.
 *
 * The mutation used to close over a render-time copy of the session customer,
 * so two toggles saved without a re-render in between both merged onto the same
 * pre-toggle snapshot and the later one reverted the earlier one.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useUpdatePreferences } from '@/hooks/useCustomer';
import { useAuthStore } from '@/stores/authStore';
import type { Customer } from '@/types';

jest.mock('@/services', () => ({
  updateProfile: jest.fn(async () => undefined),
  updateProfileSettings: jest.fn(async () => undefined),
}));

jest.mock('@/lib/notificationPrefsCache', () => ({
  setNotificationPrefs: jest.fn(async () => undefined),
}));

const { setNotificationPrefs } = jest.requireMock('@/lib/notificationPrefsCache');

const CUSTOMER = {
  id: 'customer-1',
  email: 'a@b.com',
  displayName: 'A',
  notifications: { budget: true, report: true, goals: true },
} as unknown as Customer;

describe('useUpdatePreferences — notification toggles', () => {
  let queryClient: QueryClient;

  // One client per test, both caches cleared afterwards so nothing carries
  // between cases. Jest still prints its "did not exit" notice for this suite:
  // running any TanStack mutation under renderHook does that in this jest-expo
  // setup (reproduced with a bare useMutation), and --detectOpenHandles finds
  // nothing — so it isn't something this suite can tear down.
  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.setState({ isAuthenticated: true, onboardingDone: true, customer: CUSTOMER });
  });

  afterEach(() => {
    queryClient.getMutationCache().clear();
    queryClient.clear();
  });

  it('turns every toggle off in a single patch', async () => {
    const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

    result.current.mutate({ notifications: { budget: false, report: false, goals: false } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().customer?.notifications).toEqual({
      budget: false,
      report: false,
      goals: false,
    });
    expect(setNotificationPrefs).toHaveBeenCalledTimes(1);
  });

  it('merges onto the latest saved prefs, not the render-time snapshot', async () => {
    const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

    result.current.mutate({ notifications: { report: false } });
    await waitFor(() => expect(useAuthStore.getState().customer?.notifications?.report).toBe(false));

    // Same hook instance, no re-render in between — this used to reset `report`
    // back to true because it merged onto the stale closure value.
    result.current.mutate({ notifications: { goals: false } });
    await waitFor(() => expect(useAuthStore.getState().customer?.notifications?.goals).toBe(false));

    expect(useAuthStore.getState().customer?.notifications).toEqual({
      budget: true,
      report: false,
      goals: false,
    });
  });
});
