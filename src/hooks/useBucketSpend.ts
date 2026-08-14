import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useCustomerCategories } from './useCustomerCategories';
import { getCategoryById, type BucketType } from '@/constants/categories';
import type { MonthRange } from '@/services';
import type { CustomerCategory, Transaction } from '@/types';

export type BucketSpend = Record<BucketType, number>;

export function calculateBucketSpend(
  transactions: Transaction[],
  customerCategories: CustomerCategory[],
): BucketSpend {
  const override: Record<string, BucketType> = {};
  for (const category of customerCategories)
    override[category.categoryId] = category.bucketId as BucketType;

  const spend: BucketSpend = { needs: 0, wants: 0, savings: 0 };
  for (const transaction of transactions) {
    if (!transaction.categoryId) continue;

    const bucket =
      override[transaction.categoryId] ??
      getCategoryById(transaction.categoryId)?.defaultBucket;
    if (!bucket) continue;

    if (transaction.type === 'expense') {
      spend[bucket] += transaction.amount;
      continue;
    }

    if (
      transaction.type === 'income' &&
      transaction.categoryId === 'cat_savings_goal'
    ) {
      spend.savings -= transaction.amount;
    }
  }

  spend.savings = Math.max(0, spend.savings);
  return spend;
}

/**
 * Single source of bucket-level spend for a calendar month.
 *
 * Every **expense** transaction is grouped by its category's bucket
 * (`defaultBucket`), so spend in categories that have *no budget set* still
 * counts toward its bucket. Saving-goal withdrawal income offsets Savings
 * progress; other income, transfers, and uncategorized transactions are excluded
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
  // Per-customer bucket override (a customer can move a category to a different jar).
  const { data: customerCats } = useCustomerCategories();

  return useMemo(
    () => calculateBucketSpend(txs ?? [], customerCats ?? []),
    [txs, customerCats],
  );
}
