/**
 * Regression test for the two category caches drifting apart.
 *
 * GET /categories?type=expense backs BOTH queryKeys.customCategories (the
 * `custom_`-filtered view the bucket editor reads) and
 * queryKeys.customerCategories (the whole catalog useCategoryCatalog reads for
 * pickers, transaction rows and the Budgets tab). Creating a category used to
 * invalidate only the first, so a brand-new label appeared in the bucket editor
 * and nowhere else until the other query happened to go stale.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useCreateCustomCategory,
  useDeleteCustomCategory,
  useBulkUpdateCustomCategoryBucket,
} from '@/hooks/useCustomCategories';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';
import type { Customer } from '@/types';

jest.mock('@/services', () => ({
  getCustomCategories: jest.fn(async () => []),
  createCustomCategory: jest.fn(async () => ({ id: 'custom_new' })),
  deleteCustomCategory: jest.fn(async () => undefined),
  updateCustomCategoryBucket: jest.fn(async () => ({ id: 'custom_new' })),
  bulkUpdateCustomCategoryBucket: jest.fn(async () => []),
}));

const CUSTOMER = { id: 'customer-1', email: 'a@b.com', displayName: 'A' } as unknown as Customer;

describe('custom category mutations — cache invalidation', () => {
  let queryClient: QueryClient;
  let invalidated: unknown[][];

  // See useUpdatePreferences.test.tsx: running a TanStack mutation under
  // renderHook makes Jest print its "did not exit" notice in this jest-expo
  // setup regardless of teardown.
  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    useAuthStore.setState({ customer: CUSTOMER } as never);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidated = [];
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation((filters?: { queryKey?: unknown }) => {
        invalidated.push(filters?.queryKey as unknown[]);
        return Promise.resolve();
      });
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  function invalidatedBoth() {
    const keys = invalidated.map((k) => JSON.stringify(k));
    return {
      custom: keys.includes(JSON.stringify(queryKeys.customCategories())),
      catalog: keys.includes(JSON.stringify(queryKeys.customerCategories(CUSTOMER.id))),
    };
  }

  it('refreshes the full catalog too when a category is created', async () => {
    const { result } = renderHook(() => useCreateCustomCategory(), { wrapper });

    result.current.mutate({ nameVi: 'Nhậu', type: 'expense', bucketId: 'wants', color: '#F97316' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedBoth()).toEqual({ custom: true, catalog: true });
  });

  it('refreshes both when a category is deleted', async () => {
    const { result } = renderHook(() => useDeleteCustomCategory(), { wrapper });

    result.current.mutate('custom_gone');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedBoth()).toEqual({ custom: true, catalog: true });
  });

  it('refreshes both when staged bucket moves are saved', async () => {
    const { result } = renderHook(() => useBulkUpdateCustomCategoryBucket(), { wrapper });

    result.current.mutate([{ id: 'custom_new', bucketId: 'needs' }]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedBoth()).toEqual({ custom: true, catalog: true });
  });
});
