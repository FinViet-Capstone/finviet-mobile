/**
 * useMonthlyTransactions — container logic for the Transactions screen.
 *
 * Fetches the selected month + previous month (for trend deltas) and derives
 * everything the calendar / summary / section-list need. Keeping this out of the
 * screen lets the screen stay a thin stateful container over presentational
 * components.
 */

import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useWallets } from '@/hooks/useWallets';
import { isoDate, todayISO } from '@/utils/date';
import type { Transaction } from '@/types';

export interface TxSection {
  title: string; // ISO date "YYYY-MM-DD"
  data: Transaction[];
  dayNet: number; // positive = income > expense
}

export interface DayCell {
  iso: string;
  day: number;
  income: number;
  expense: number;
  net: number;
  hasActivity: boolean;
  hasUncategorized: boolean;
  isToday: boolean;
}

export interface CalendarGridCell {
  key: string;
  day: number;
  current: DayCell | null;
}

export function buildCalendarWeeks(
  dayCells: DayCell[],
  leadingBlanks: number,
): CalendarGridCell[][] {
  const first = dayCells[0];
  if (!first) return [];

  const [year, month] = first.iso.split('-').map(Number);
  const previousMonthLastDay = new Date(year, month - 1, 0).getDate();
  const leadingCells = Array.from({ length: leadingBlanks }, (_, index) => ({
    key: `previous-${previousMonthLastDay - leadingBlanks + index + 1}`,
    day: previousMonthLastDay - leadingBlanks + index + 1,
    current: null,
  }));
  const currentCells = dayCells.map((cell) => ({
    key: cell.iso,
    day: cell.day,
    current: cell,
  }));
  const trailingCount = (7 - ((leadingCells.length + currentCells.length) % 7)) % 7;
  const trailingCells = Array.from({ length: trailingCount }, (_, index) => ({
    key: `next-${index + 1}`,
    day: index + 1,
    current: null,
  }));
  const cells = [...leadingCells, ...currentCells, ...trailingCells];

  return Array.from(
    { length: cells.length / 7 },
    (_, index) => cells.slice(index * 7, index * 7 + 7),
  );
}

export function buildDayCells(
  transactions: Transaction[],
  year: number,
  monthIdx: number,
): DayCell[] {
  const dayMap = new Map<
    string,
    { income: number; expense: number; hasUncategorized: boolean }
  >();

  for (const transaction of transactions) {
    if (
      transaction.type === 'transfer_out' ||
      transaction.type === 'transfer_in'
    ) {
      continue;
    }

    const current = dayMap.get(transaction.transactionDate) ?? {
      income: 0,
      expense: 0,
      hasUncategorized: false,
    };
    if (transaction.type === 'income') current.income += transaction.amount;
    else if (transaction.type === 'expense') current.expense += transaction.amount;
    if (!transaction.categoryId) current.hasUncategorized = true;
    dayMap.set(transaction.transactionDate, current);
  }

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = todayISO();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const iso = isoDate(year, monthIdx, index + 1);
    const aggregate = dayMap.get(iso);
    const income = aggregate?.income ?? 0;
    const expense = aggregate?.expense ?? 0;
    return {
      iso,
      day: index + 1,
      income,
      expense,
      net: income - expense,
      hasActivity: !!aggregate,
      hasUncategorized: aggregate?.hasUncategorized ?? false,
      isToday: iso === today,
    };
  });
}

/**
 * A transaction is "uncategorized spend" only if it has no category AND is not a
 * transfer leg. Transfer legs carry categoryId === null by design and must be
 * excluded from the uncategorized count / filter / day badge.
 */
const isUncategorizedSpend = (tx: Transaction): boolean =>
  tx.categoryId === null && tx.type !== 'transfer_in' && tx.type !== 'transfer_out';

export function countUncategorizedTransactions(transactions: Transaction[]): number {
  return transactions.filter(isUncategorizedSpend).length;
}

export function shouldClearUncategorizedFilter(
  uncategorizedOnly: boolean,
  uncategorizedCount: number,
  isFocused: boolean,
  isMonthFetching: boolean,
  hasLoadedMonth: boolean,
): boolean {
  return uncategorizedOnly
    && uncategorizedCount === 0
    && isFocused
    && !isMonthFetching
    && hasLoadedMonth;
}

export function useMonthlyTransactions(
  year: number,
  monthIdx: number,
  selectedWalletId: string | null,
  searchQuery: string = '',
  filterType: 'all' | 'income' | 'expense' = 'all',
  filterCategoryId: string | null = null,
  uncategorizedOnly: boolean = false,
  enabled: boolean = true,
) {
  // ── Date ranges ──────────────────────────────────────────────────────────
  const monthStart = isoDate(year, monthIdx, 1);
  const monthEnd = isoDate(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate());

  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  const prevStart = isoDate(prevYear, prevMonthIdx, 1);
  const prevEnd = isoDate(prevYear, prevMonthIdx, new Date(prevYear, prevMonthIdx + 1, 0).getDate());

  // ── Data ─────────────────────────────────────────────────────────────────
  const {
    data: txData,
    isLoading,
    isFetching: isMonthFetching,
    isFetched: hasLoadedMonth,
  } = useTransactions({
    startDate: monthStart,
    endDate: monthEnd,
    walletId: selectedWalletId ?? undefined,
  }, { enabled });
  const { data: prevTxData } = useTransactions({
    startDate: prevStart,
    endDate: prevEnd,
    walletId: selectedWalletId ?? undefined,
  }, { enabled });
  const { data: walletsData } = useWallets();

  const monthTransactions = useMemo(() => txData ?? [], [txData]);
  const transactions = useMemo(() => {
    let txs = monthTransactions;
    if (uncategorizedOnly) return txs.filter(isUncategorizedSpend);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      txs = txs.filter((tx) => tx.merchant?.toLowerCase().includes(q) || tx.description?.toLowerCase().includes(q));
    }
    if (filterType !== 'all') txs = txs.filter((tx) => tx.type === filterType);
    if (filterCategoryId) txs = txs.filter((tx) => tx.categoryId === filterCategoryId);
    return txs;
  }, [monthTransactions, searchQuery, filterType, filterCategoryId, uncategorizedOnly]);
  const prevTransactions = useMemo(() => prevTxData ?? [], [prevTxData]);
  const wallets = walletsData?.wallets ?? [];
  const totalBalance = walletsData?.totalBalance ?? 0;
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) ?? null;

  // ── Aggregates ───────────────────────────────────────────────────────────
  const { income, expense } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') inc += tx.amount;
      else if (tx.type === 'expense') exp += tx.amount;
    }
    return { income: inc, expense: exp };
  }, [transactions]);

  const { prevIncome, prevExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const tx of prevTransactions) {
      if (tx.type === 'income') inc += tx.amount;
      else if (tx.type === 'expense') exp += tx.amount;
    }
    return { prevIncome: inc, prevExpense: exp };
  }, [prevTransactions]);

  const monthNet = income - expense;

  const uncategorizedCount = useMemo(
    () => countUncategorizedTransactions(monthTransactions),
    [monthTransactions],
  );

  // ── SectionList sections ─────────────────────────────────────────────────
  const sections = useMemo((): TxSection[] => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const list = map.get(tx.transactionDate) ?? [];
      list.push(tx);
      map.set(tx.transactionDate, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => {
        let net = 0;
        for (const tx of data) {
          if (tx.type === 'income') net += tx.amount;
          else if (tx.type === 'expense') net -= tx.amount;
        }
        return { title: date, data, dayNet: net };
      });
  }, [transactions]);

  // ── Calendar cells ───────────────────────────────────────────────────────
  const dayCells = useMemo(
    () => buildDayCells(transactions, year, monthIdx),
    [transactions, year, monthIdx],
  );

  // First day offset (Monday = 0)
  const leadingBlanks = (new Date(year, monthIdx, 1).getDay() + 6) % 7;

  return {
    isLoading,
    isMonthFetching,
    hasLoadedMonth,
    wallets,
    totalBalance,
    selectedWallet,
    income,
    expense,
    prevIncome,
    prevExpense,
    monthNet,
    uncategorizedCount,
    sections,
    dayCells,
    leadingBlanks,
  };
}
