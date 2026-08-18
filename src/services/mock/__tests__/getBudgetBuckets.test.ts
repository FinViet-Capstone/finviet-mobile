/**
 * Regression tests for getBudgetBuckets' reconciliation with the real backend
 * and with useBucketSpend (mobile finding B1/B2): bucket assignment must
 * honor the customer's own drag-and-drop override, not just the category's
 * global default; a goal contribution/withdrawal must net into the Savings
 * bucket instead of being ignored. Each test gets fresh module state through
 * jest.resetModules() and uses relative before/after deltas rather than
 * absolute values, since the mock store ships with pre-seeded demo data.
 */

import { WALLET_IDS, USER_ID } from '@/services/mock/walletStore';

describe('mock getBudgetBuckets', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('nets a goal contribution into the Savings bucket spend, not into Needs/Wants', async () => {
    const goals = require('@/services/mock/goals');
    const budgets = require('@/services/mock/budgets');

    const before = budgets.getBudgetBuckets();
    const savingsBefore = before.buckets.find((b: { bucket: string }) => b.bucket === 'savings').spent;

    const goal = await goals.createGoal({
      name: 'T3.1 regression goal',
      targetAmount: 50_000_000,
      deadline: '2027-01-01',
    });
    await goals.addGoalContribution(goal.id, {
      amount: 1_234_000,
      fundingWalletId: WALLET_IDS.CASH,
    });

    const after = budgets.getBudgetBuckets();
    const savingsAfter = after.buckets.find((b: { bucket: string }) => b.bucket === 'savings').spent;

    expect(savingsAfter - savingsBefore).toBe(1_234_000);
  });

  it('nets a goal withdrawal back out of the Savings bucket spend', async () => {
    const goals = require('@/services/mock/goals');
    const budgets = require('@/services/mock/budgets');

    const goal = await goals.createGoal({
      name: 'T3.1 withdrawal regression goal',
      targetAmount: 50_000_000,
      deadline: '2027-01-01',
    });
    await goals.addGoalContribution(goal.id, {
      amount: 5_000_000,
      fundingWalletId: WALLET_IDS.BANK,
    });
    const afterContribution = budgets.getBudgetBuckets();
    const savingsAfterContribution = afterContribution.buckets.find(
      (b: { bucket: string }) => b.bucket === 'savings',
    ).spent;

    await goals.withdrawFromGoal(goal.id, { amount: 2_000_000, walletId: WALLET_IDS.BANK });
    const afterWithdrawal = budgets.getBudgetBuckets();
    const savingsAfterWithdrawal = afterWithdrawal.buckets.find(
      (b: { bucket: string }) => b.bucket === 'savings',
    ).spent;

    expect(savingsAfterContribution - savingsAfterWithdrawal).toBe(2_000_000);
  });

  it('honors a customer bucket override instead of the category global default', async () => {
    const budgets = require('@/services/mock/budgets');
    const customerCategories = require('@/services/mock/customerCategories');
    const transactions = require('@/services/mock/transactions');

    // cat_food defaults to 'needs' — move it to 'wants' for this customer.
    const rows = await customerCategories.getCustomerCategories(USER_ID);
    const foodRow = rows.find((r: { categoryId: string }) => r.categoryId === 'cat_food');
    await customerCategories.moveBucket({ customerCategoryId: foodRow.id, targetBucket: 'wants' });

    const before = budgets.getBudgetBuckets();
    const needsBefore = before.buckets.find((b: { bucket: string }) => b.bucket === 'needs').spent;
    const wantsBefore = before.buckets.find((b: { bucket: string }) => b.bucket === 'wants').spent;

    const today = new Date().toISOString().slice(0, 10);
    await transactions.createTransaction({
      walletId: WALLET_IDS.CASH,
      categoryId: 'cat_food',
      amount: 321_000,
      type: 'expense',
      description: null,
      merchant: 'Test food expense',
      transactionDate: today,
      entryMethod: 'manual',
    });

    const after = budgets.getBudgetBuckets();
    const needsAfter = after.buckets.find((b: { bucket: string }) => b.bucket === 'needs').spent;
    const wantsAfter = after.buckets.find((b: { bucket: string }) => b.bucket === 'wants').spent;

    expect(wantsAfter - wantsBefore).toBe(321_000);
    expect(needsAfter).toBe(needsBefore);
  });
});
