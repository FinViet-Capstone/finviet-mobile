import React from 'react';
import { render } from '@testing-library/react-native';
import WalletDetailScreen from '../[id]';
import type { Transaction, TransactionFilters } from '@/types';

// Regression coverage for: the wallet detail screen's "LỊCH SỬ GIAO DỊCH" only listed the
// current calendar month, so a wallet with older activity looked like it had lost its history.
// The screen is rendered for real; only the data hooks are stubbed, and the transactions stub
// applies startDate/endDate the way the backend `from`/`to` params do, so any date window the
// screen asks for is honoured faithfully.

jest.mock('@/providers/ThemeProvider', () => ({
  useThemeColors: () => jest.requireActual<typeof import('@/theme')>('@/theme').COLORS,
  ThemeProvider: ({ children }: any) => children,
}));
jest.mock('@/components/common/MaterialIcon', () => ({ MaterialIcon: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, SafeAreaView: ({ children }: any) => children };
});
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'w1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/components/transaction/TransactionCard', () => {
  const { Text } = jest.requireActual('react-native');
  return { TransactionCard: ({ transaction }: any) => <Text>{transaction.description}</Text> };
});

const mockTransactions: Transaction[] = [];

jest.mock('@/hooks/useWallets', () => ({
  useWalletById: () => ({
    data: { id: 'w1', name: 'Basic1', type: 'basic', balance: 1000, linkedMetadata: null },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSyncSepayWallet: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteWallet: () => ({ mutate: jest.fn(), isPending: false }),
  useSepayLinks: () => ({ data: [] }),
  useUnlinkSepayAccount: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('@/hooks', () => ({
  useTransactions: (filters?: TransactionFilters) => ({
    data: mockTransactions.filter(
      (t) =>
        (!filters?.walletId || t.walletId === filters.walletId) &&
        (!filters?.startDate || t.transactionDate.slice(0, 10) >= filters.startDate) &&
        (!filters?.endDate || t.transactionDate.slice(0, 10) <= filters.endDate),
    ),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

function tx(description: string, daysAgo: number): Transaction {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { id: description, walletId: 'w1', description, transactionDate: iso } as Transaction;
}

it('lists transactions from previous months, not just the current one', () => {
  mockTransactions.splice(0, mockTransactions.length, tx('today', 0), tx('two months ago', 62));

  const view = render(<WalletDetailScreen />);

  expect(view.getByText('today')).toBeTruthy();
  expect(view.getByText('two months ago')).toBeTruthy();
});
