/**
 * Regression tests for the savings-goal contribution/deletion bug: a goal created
 * without a preset fundingWalletId (the only path the UI's "new goal" form offers)
 * used to (a) never actually debit the wallet picked in the contribution sheet, and
 * (b) even when a transaction did exist, deleteGoal skipped reversing it because it
 * incorrectly required goal.fundingWalletId to be set. Each test gets a fresh copy
 * of both modules (jest.resetModules) since they hold mutable module-level state.
 */

import { WALLET_IDS } from '@/services/mock/walletStore';

describe('mock goals service — contribution/deletion wallet integrity', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('debits the wallet picked at contribution time, even when the goal has no preset fundingWalletId', async () => {
    // require (not import) so this re-resolves fresh module state after resetModules()
    const goals = require('@/services/mock/goals');
    const wallets = require('@/services/mock/wallets');

    const before = wallets.getWalletById(WALLET_IDS.CASH)!.balance;

    const goal = await goals.createGoal({
      name: 'Mua laptop',
      targetAmount: 20_000_000,
      deadline: '2027-01-01',
      // No fundingWalletId — matches the real "new goal" sheet, which never
      // collects one.
    });
    expect(goal.fundingWalletId).toBeUndefined();

    const updated = await goals.addGoalContribution(goal.id, {
      amount: 500_000,
      fundingWalletId: WALLET_IDS.CASH,
    });

    expect(updated.currentAmount).toBe(500_000);
    expect(wallets.getWalletById(WALLET_IDS.CASH)!.balance).toBe(before - 500_000);
  });

  it('rejects a contribution that exceeds the picked wallet balance, regardless of goal.fundingWalletId', async () => {
    // require (not import) so this re-resolves fresh module state after resetModules()
    const goals = require('@/services/mock/goals');
    const wallets = require('@/services/mock/wallets');

    const goal = await goals.createGoal({
      name: 'Quỹ khẩn cấp mới',
      targetAmount: 50_000_000,
      deadline: '2027-01-01',
    });
    const cashBalance = wallets.getWalletById(WALLET_IDS.CASH)!.balance;

    await expect(
      goals.addGoalContribution(goal.id, {
        amount: cashBalance + 1,
        fundingWalletId: WALLET_IDS.CASH,
      }),
    ).rejects.toThrow('insufficient_balance');
  });

  it('refunds the wallet and removes the transaction when a contributed-to goal is deleted', async () => {
    // require (not import) so this re-resolves fresh module state after resetModules()
    const goals = require('@/services/mock/goals');
    const wallets = require('@/services/mock/wallets');

    const before = wallets.getWalletById(WALLET_IDS.BANK)!.balance;

    const goal = await goals.createGoal({
      name: 'Du lịch Đà Lạt',
      targetAmount: 10_000_000,
      deadline: '2027-01-01',
    });
    await goals.addGoalContribution(goal.id, {
      amount: 1_000_000,
      fundingWalletId: WALLET_IDS.BANK,
    });
    expect(wallets.getWalletById(WALLET_IDS.BANK)!.balance).toBe(before - 1_000_000);

    await goals.deleteGoal(goal.id);

    // The debit is fully reversed — this is the bug: it used to stay lost because
    // deleteGoal required goal.fundingWalletId (unset here) before reversing.
    expect(wallets.getWalletById(WALLET_IDS.BANK)!.balance).toBe(before);
    expect(goals.getContributionsByGoalId(goal.id)).toHaveLength(0);
  });
});
