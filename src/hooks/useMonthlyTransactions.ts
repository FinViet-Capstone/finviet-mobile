/**
 * useMonthlyTransactions — container logic for the Transactions screen.
 *
 * Fetches the selected month + previous month (for trend deltas) and derives
 * everything the calendar / summary / section-list need. Keeping this out of the
 * screen lets the screen stay a thin stateful container over presentational
 * components.
 */

import { useMemo } from 'react';
import { useTransactions, useWallets } from '@/hooks';
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
  net: number;
  hasActivity: boolean;
  hasUncategorized: boolean;
  isToday: boolean;
}

export function useMonthlyTransactions(
  year: number,
  monthIdx: number,
  selectedWalletId: string | null,
) {
  // ── Date ranges ──────────────────────────────────────────────────────────
  const monthStart = isoDate(year, monthIdx, 1);
  const monthEnd = isoDate(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate());

  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  const prevStart = isoDate(prevYear, prevMonthIdx, 1);
  const prevEnd = isoDate(prevYear, prevMonthIdx, new Date(prevYear, prevMonthIdx + 1, 0).getDate());

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: txData, isLoading } = useTransactions({
    startDate: monthStart,
    endDate: monthEnd,
    walletId: selectedWalletId ?? undefined,
  });
  const { data: prevTxData } = useTransactions({
    startDate: prevStart,
    endDate: prevEnd,
    walletId: selectedWalletId ?? undefined,
  });
  const { data: walletsData } = useWallets();

  const transactions = useMemo(() => txData ?? [], [txData]);
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
    () => transactions.filter((tx) => !tx.categoryId).length,
    [transactions],
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
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const dayCells = useMemo((): DayCell[] => {
    const dayMap = new Map<string, { net: number; hasUncategorized: boolean }>();
    for (const tx of transactions) {
      if (tx.type === 'transfer_out' || tx.type === 'transfer_in') continue;
      const cur = dayMap.get(tx.transactionDate) ?? { net: 0, hasUncategorized: false };
      if (tx.type === 'income') cur.net += tx.amount;
      else cur.net -= tx.amount;
      if (!tx.categoryId) cur.hasUncategorized = true;
      dayMap.set(tx.transactionDate, cur);
    }
    const today = todayISO();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const iso = isoDate(year, monthIdx, i + 1);
      const agg = dayMap.get(iso);
      return {
        iso,
        day: i + 1,
        net: agg?.net ?? 0,
        hasActivity: !!agg,
        hasUncategorized: agg?.hasUncategorized ?? false,
        isToday: iso === today,
      };
    });
  }, [transactions, year, monthIdx, daysInMonth]);

  // First day offset (Monday = 0)
  const leadingBlanks = (new Date(year, monthIdx, 1).getDay() + 6) % 7;

  return {
    isLoading,
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
