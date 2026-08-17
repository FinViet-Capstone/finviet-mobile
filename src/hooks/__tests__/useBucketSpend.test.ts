import { calculateBucketSpend } from '../useBucketSpend';
import type { CustomerCategory, Transaction } from '@/types';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx',
    customerId: 'customer',
    walletId: 'wallet',
    categoryId: 'cat_food',
    amount: 100_000,
    type: 'expense',
    description: null,
    merchant: null,
    transactionDate: '2026-08-14',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
    ...overrides,
  };
}

const FOOD_OVERRIDE: CustomerCategory = {
  id: 'customer-category',
  customerId: 'customer',
  categoryId: 'cat_food',
  bucketId: 'wants',
  source: 'system',
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
};

describe('calculateBucketSpend', () => {
  it('nets saving-goal withdrawal income against contribution expense', () => {
    const result = calculateBucketSpend(
      [
        transaction({
          id: 'contribution',
          categoryId: 'cat_savings_goal',
          amount: 5_000_000,
          type: 'expense',
        }),
        transaction({
          id: 'withdrawal',
          categoryId: 'cat_savings_goal',
          amount: 2_000_000,
          type: 'income',
        }),
        transaction({
          id: 'salary',
          categoryId: 'cat_salary',
          amount: 10_000_000,
          type: 'income',
        }),
      ],
      [],
    );

    expect(result.savings).toBe(3_000_000);
  });

  it('does not erase an unrelated ordinary savings expense when a goal withdrawal exceeds this month\'s contributions', () => {
    // The exact C1 data-loss repro: a large goal withdrawal must only ever
    // zero out the goal component, never clamp away a real cat_savings
    // expense logged in the same month.
    const result = calculateBucketSpend(
      [
        transaction({
          id: 'manual-savings',
          categoryId: 'cat_savings',
          amount: 2_000_000,
          type: 'expense',
        }),
        transaction({
          id: 'withdrawal',
          categoryId: 'cat_savings_goal',
          amount: 5_000_000,
          type: 'income',
        }),
      ],
      [],
    );

    expect(result.savings).toBe(2_000_000);
  });

  it('never reports negative Savings progress', () => {
    const result = calculateBucketSpend(
      [
        transaction({
          categoryId: 'cat_savings_goal',
          amount: 5_000_000,
          type: 'income',
        }),
      ],
      [],
    );

    expect(result.savings).toBe(0);
  });

  it('keeps applying customer bucket overrides to expenses', () => {
    const result = calculateBucketSpend([transaction({})], [FOOD_OVERRIDE]);

    expect(result.needs).toBe(0);
    expect(result.wants).toBe(100_000);
  });
});
