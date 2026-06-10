import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { getCategoryById, type BucketType } from '@/constants/categories';
import type { MonthRange } from '@/services';

export type BucketSpend = Record<BucketType, number>;

/**
 * Single source of bucket-level spend for a calendar month.
 *
 * Every **expense** transaction is grouped by its category's bucket
 * (`defaultBucket`), so spend in categories that have *no budget set* still
 * counts toward its bucket — the honest total the bucket cards and AI pacing
 * need. Income, transfers, and uncategorized transactions are excluded
 * (uncategorized has no bucket and is handled separately by the warning banner).
 *
 * Home and the Budgets tab both consume this so their Needs/Wants/Savings
 * numbers are computed identically. Pass the same `{startDate,endDate}` the
 * screen already uses so the underlying transactions query is shared from cache.
 */
export function useBucketSpend(range: MonthRange): BucketSpend {
  const { data: txs } = useTransactions({
    startDate: range.startDate,
    endDate: range.endDate,
  });

  return useMemo<BucketSpend>(() => {
    const acc: BucketSpend = { needs: 0, wants: 0, savings: 0 };
    for (const tx of txs ?? []) {
      if (tx.type !== 'expense' || !tx.categoryId) continue;
      const bucket = getCategoryById(tx.categoryId)?.defaultBucket;
      if (bucket) acc[bucket] += tx.amount;
    }
    return acc;
  }, [txs]);
}
