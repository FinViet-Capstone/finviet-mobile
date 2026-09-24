import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  buildReviewFilters,
  getReviewRefetchInterval,
  useReviewOverride,
  useSepayReviewQueue,
} from '@/hooks/useSepayReviewQueue';
import { queryKeys } from '@/lib/queryKeys';
import { getTransactions, overrideCategorization } from '@/services';
import type { CategorizationStatus, Transaction } from '@/types';

jest.mock('@/services', () => ({
  getTransactions: jest.fn(),
  overrideCategorization: jest.fn(),
}));

const mockGetTransactions = getTransactions as jest.Mock;
const mockOverride = overrideCategorization as jest.Mock;

function row(id: string, categorizationStatus: CategorizationStatus): Transaction {
  return { id, categorizationStatus, transactionDate: '2026-09-23', createdAt: '2026-09-23T10:00:00Z' } as Transaction;
}

describe('getReviewRefetchInterval', () => {
  it('polls every 3s only while a row is pending', () => {
    expect(getReviewRefetchInterval([row('a', 'suggested'), row('b', 'pending')])).toBe(3000);
    expect(getReviewRefetchInterval([row('a', 'suggested'), row('b', 'failed')])).toBe(false);
    expect(getReviewRefetchInterval([])).toBe(false);
    expect(getReviewRefetchInterval(undefined)).toBe(false);
  });
});

describe('buildReviewFilters', () => {
  it('asks for the four review statuses on SePay rows, optionally for one wallet', () => {
    expect(buildReviewFilters()).toEqual({
      categorizationStatus: ['pending', 'suggested', 'unsure', 'failed'],
      entryMethod: 'linked',
      type: 'expense',
    });
    expect(buildReviewFilters('w1').walletId).toBe('w1');
  });
});

describe('review queue hooks', () => {
  let queryClient: QueryClient;

  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockGetTransactions.mockReset();
    mockOverride.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
    jest.useRealTimers();
  });

  describe('useSepayReviewQueue polling', () => {
    it('refetches every 3s while a row is pending, then stops once none is', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      mockGetTransactions
        .mockResolvedValueOnce([row('a', 'pending')])
        .mockResolvedValueOnce([row('a', 'pending')])
        .mockResolvedValue([row('a', 'suggested')]);

      renderHook(() => useSepayReviewQueue(), { wrapper });
      await waitFor(() => expect(mockGetTransactions).toHaveBeenCalledTimes(1));

      await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
      expect(mockGetTransactions).toHaveBeenCalledTimes(2);

      await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
      expect(mockGetTransactions).toHaveBeenCalledTimes(3);

      await act(async () => { await jest.advanceTimersByTimeAsync(9000); });
      expect(mockGetTransactions).toHaveBeenCalledTimes(3);
    });

    it('never polls when nothing is pending', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      mockGetTransactions.mockResolvedValue([row('a', 'unsure')]);

      renderHook(() => useSepayReviewQueue(), { wrapper });
      await waitFor(() => expect(mockGetTransactions).toHaveBeenCalledTimes(1));

      await act(async () => { await jest.advanceTimersByTimeAsync(9000); });
      expect(mockGetTransactions).toHaveBeenCalledTimes(1);
    });
  });

  describe('useReviewOverride', () => {
    const key = queryKeys.transactions.review(buildReviewFilters());

    it('removes the row optimistically before the request settles', async () => {
      queryClient.setQueryData(key, [row('a', 'suggested'), row('b', 'unsure')]);
      let resolve!: () => void;
      mockOverride.mockReturnValue(new Promise<void>((r) => { resolve = r; }));

      const { result } = renderHook(() => useReviewOverride(), { wrapper });
      act(() => result.current.mutate({ transactionId: 'a', categoryId: 'cat_food' }));

      await waitFor(() =>
        expect((queryClient.getQueryData(key) as Transaction[]).map((r) => r.id)).toEqual(['b']),
      );
      expect(mockOverride).toHaveBeenCalledWith('a', 'cat_food');

      await act(async () => { resolve(); });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('restores only the failed row when overrides run concurrently', async () => {
      const rows = [row('a', 'suggested'), row('b', 'unsure'), row('c', 'unsure')];
      queryClient.setQueryData(key, rows);
      mockGetTransactions.mockReturnValue(new Promise(() => undefined));
      let rejectA!: (e: Error) => void;
      let resolveB!: () => void;
      mockOverride
        .mockReturnValueOnce(new Promise((_, rej) => { rejectA = rej; }))
        .mockReturnValueOnce(new Promise<void>((res) => { resolveB = res; }));
      const onError = jest.fn();

      const { result } = renderHook(() => useReviewOverride({ onError }), { wrapper });
      act(() => result.current.mutate({ transactionId: 'a', categoryId: 'cat_food' }));
      await waitFor(() => expect(queryClient.getQueryData<Transaction[]>(key)?.length).toBe(2));
      act(() => result.current.mutate({ transactionId: 'b', categoryId: 'cat_food' }));
      await waitFor(() => expect(queryClient.getQueryData<Transaction[]>(key)?.length).toBe(1));

      await act(async () => { rejectA(new Error('boom')); });
      await act(async () => { resolveB(); });

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(onError.mock.calls[0][1].transactionId).toBe('a');
      expect(queryClient.getQueryData<Transaction[]>(key)?.map((r) => r.id)).toEqual(['a', 'c']);
    });

    it('restores the row when the request fails', async () => {
      const rows = [row('a', 'suggested'), row('b', 'unsure')];
      queryClient.setQueryData(key, rows);
      mockOverride.mockRejectedValue(new Error('boom'));
      // Keep the post-error refetch from replacing the restored snapshot.
      mockGetTransactions.mockResolvedValue(rows);

      const { result } = renderHook(() => useReviewOverride(), { wrapper });
      act(() => result.current.mutate({ transactionId: 'a', categoryId: 'cat_food' }));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((queryClient.getQueryData(key) as Transaction[]).map((r) => r.id)).toEqual(['a', 'b']);
    });
  });
});