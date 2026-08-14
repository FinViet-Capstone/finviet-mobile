/**
 * Regression tests for savings-goal money movement and archive integrity. A goal
 * contribution must debit the explicitly selected wallet; archive must require a
 * zero balance and preserve the complete ledger and generated transactions. Each
 * test gets fresh module state through jest.resetModules().
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

  it('requires a full withdrawal before archive and preserves the complete ledger', async () => {
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

    await expect(goals.deleteGoal(goal.id)).rejects.toThrow(
      'goal_balance_must_be_withdrawn',
    );
    expect(wallets.getWalletById(WALLET_IDS.BANK)!.balance).toBe(before - 1_000_000);
    expect(goals.getContributionsByGoalId(goal.id)).toHaveLength(1);

    await goals.withdrawFromGoal(goal.id, {
      amount: 1_000_000,
      walletId: WALLET_IDS.BANK,
    });
    await goals.deleteGoal(goal.id);

    expect(wallets.getWalletById(WALLET_IDS.BANK)!.balance).toBe(before);
    expect(goals.getContributionsByGoalId(goal.id)).toHaveLength(2);
    expect(goals.getGoals(false).some((item: { id: string }) => item.id === goal.id)).toBe(false);
    expect(goals.getGoals(true).some((item: { id: string }) => item.id === goal.id)).toBe(true);
    expect(goals.getGoalById(goal.id)?.isDeleted).toBe(true);
    await expect(
      goals.addGoalContribution(goal.id, {
        amount: 1,
        fundingWalletId: WALLET_IDS.BANK,
      }),
    ).rejects.toThrow('Goal not found');
  });
});

describe('mock goals service — withdrawFromGoal', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('credits the destination wallet and reduces currentAmount', async () => {
    const goals = require('@/services/mock/goals');
    const wallets = require('@/services/mock/wallets');

    const goal = await goals.createGoal({
      name: 'Quỹ dự phòng',
      targetAmount: 10_000_000,
      deadline: '2027-01-01',
    });
    const contributed = await goals.addGoalContribution(goal.id, {
      amount: 2_000_000,
      fundingWalletId: WALLET_IDS.CASH,
    });
    expect(contributed.currentAmount).toBe(2_000_000);

    const before = wallets.getWalletById(WALLET_IDS.CASH)!.balance;
    const after = await goals.withdrawFromGoal(goal.id, {
      amount: 800_000,
      walletId: WALLET_IDS.CASH,
    });

    expect(after.currentAmount).toBe(1_200_000);
    expect(wallets.getWalletById(WALLET_IDS.CASH)!.balance).toBe(before + 800_000);
  });

  it('rejects a non-positive amount and an amount exceeding currentAmount', async () => {
    const goals = require('@/services/mock/goals');

    const goal = await goals.createGoal({
      name: 'Quỹ dự phòng 2',
      targetAmount: 10_000_000,
      deadline: '2027-01-01',
    });
    await goals.addGoalContribution(goal.id, {
      amount: 1_000_000,
      fundingWalletId: WALLET_IDS.CASH,
    });

    await expect(
      goals.withdrawFromGoal(goal.id, { amount: 0, walletId: WALLET_IDS.CASH }),
    ).rejects.toThrow('invalid_amount');

    await expect(
      goals.withdrawFromGoal(goal.id, { amount: 1_000_001, walletId: WALLET_IDS.CASH }),
    ).rejects.toThrow('amount_exceeds_saved');
  });

  it('records both a contribution and a withdrawal in history with correct types', async () => {
    const goals = require('@/services/mock/goals');

    const goal = await goals.createGoal({
      name: 'Quỹ dự phòng 3',
      targetAmount: 10_000_000,
      deadline: '2027-01-01',
    });
    await goals.addGoalContribution(goal.id, {
      amount: 1_000_000,
      fundingWalletId: WALLET_IDS.CASH,
    });
    await goals.withdrawFromGoal(goal.id, { amount: 300_000, walletId: WALLET_IDS.CASH });

    const history = goals.getContributionsByGoalId(goal.id);
    expect(history).toHaveLength(2);
    expect(history.map((c: { type: string }) => c.type).sort()).toEqual([
      'contribution',
      'withdrawal',
    ]);
  });

  it('flips a completed goal back to incomplete after a withdrawal', async () => {
    const goals = require('@/services/mock/goals');

    const goal = await goals.createGoal({
      name: 'Mua tai nghe',
      targetAmount: 1_000_000,
      deadline: '2027-01-01',
    });
    const completed = await goals.addGoalContribution(goal.id, {
      amount: 1_000_000,
      fundingWalletId: WALLET_IDS.CASH,
    });
    expect(completed.isCompleted).toBe(true);

    const after = await goals.withdrawFromGoal(goal.id, {
      amount: 200_000,
      walletId: WALLET_IDS.CASH,
    });
    expect(after.isCompleted).toBe(false);
    expect(after.currentAmount).toBe(800_000);
  });

  it('does not alter wallets or history when a zero-balance goal is archived', async () => {
    const goals = require('@/services/mock/goals');
    const wallets = require('@/services/mock/wallets');

    const before = wallets.getWalletById(WALLET_IDS.BANK)!.balance;
    const goal = await goals.createGoal({
      name: 'Du lịch Phú Quốc',
      targetAmount: 10_000_000,
      deadline: '2027-01-01',
    });
    await goals.addGoalContribution(goal.id, {
      amount: 3_000_000,
      fundingWalletId: WALLET_IDS.BANK,
    });
    await goals.withdrawFromGoal(goal.id, {
      amount: 3_000_000,
      walletId: WALLET_IDS.BANK,
    });

    const walletBeforeArchive = wallets.getWalletById(WALLET_IDS.BANK)!.balance;
    const historyBeforeArchive = goals.getContributionsByGoalId(goal.id);
    expect(walletBeforeArchive).toBe(before);

    await goals.deleteGoal(goal.id);

    expect(wallets.getWalletById(WALLET_IDS.BANK)!.balance).toBe(walletBeforeArchive);
    expect(goals.getContributionsByGoalId(goal.id)).toEqual(historyBeforeArchive);
    await expect(
      goals.withdrawFromGoal(goal.id, { amount: 1, walletId: WALLET_IDS.BANK }),
    ).rejects.toThrow('Goal not found');
    await expect(goals.deleteGoal(goal.id)).rejects.toThrow('Goal not found');
  });

  it('records an initial contribution without a wallet and reaches zero after withdrawal', async () => {
    const goals = require('@/services/mock/goals');

    const goal = await goals.createGoal({
      name: 'Quỹ tiền mặt cũ',
      targetAmount: 1_000_000,
      initialAmount: 500_000,
      deadline: '2027-01-01',
    });
    expect(goal.currentAmount).toBe(500_000);
    expect(goals.getContributionsByGoalId(goal.id)).toMatchObject([
      { amount: 500_000, type: 'contribution', transactionId: undefined },
    ]);

    const withdrawn = await goals.withdrawFromGoal(goal.id, {
      amount: 500_000,
      walletId: WALLET_IDS.CASH,
    });
    expect(withdrawn.currentAmount).toBe(0);
    await expect(goals.deleteGoal(goal.id)).resolves.toBeUndefined();
    expect(goals.getContributionsByGoalId(goal.id)).toHaveLength(2);
  });

  it('deduplicates create, contribution, and withdrawal replays by idempotency key', async () => {
    const goals = require('@/services/mock/goals');
    const wallets = require('@/services/mock/wallets');

    const input = {
      name: 'Quỹ idempotency',
      targetAmount: 2_000_000,
      deadline: '2027-01-01',
    };
    const firstGoal = await goals.createGoal(input, 'create-key');
    const replayedGoal = await goals.createGoal(input, 'create-key');
    expect(replayedGoal.id).toBe(firstGoal.id);

    const before = wallets.getWalletById(WALLET_IDS.CASH)!.balance;
    const contribution = { amount: 1_000_000, fundingWalletId: WALLET_IDS.CASH };
    await goals.addGoalContribution(firstGoal.id, contribution, 'contribute-key');
    await goals.addGoalContribution(firstGoal.id, contribution, 'contribute-key');
    expect(wallets.getWalletById(WALLET_IDS.CASH)!.balance).toBe(before - 1_000_000);
    expect(goals.getContributionsByGoalId(firstGoal.id)).toHaveLength(1);

    const withdrawal = { amount: 1_000_000, walletId: WALLET_IDS.CASH };
    await goals.withdrawFromGoal(firstGoal.id, withdrawal, 'withdraw-key');
    await goals.withdrawFromGoal(firstGoal.id, withdrawal, 'withdraw-key');
    expect(wallets.getWalletById(WALLET_IDS.CASH)!.balance).toBe(before);
    expect(goals.getContributionsByGoalId(firstGoal.id)).toHaveLength(2);
  });
});
