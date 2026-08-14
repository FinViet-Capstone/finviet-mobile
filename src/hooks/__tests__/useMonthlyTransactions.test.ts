import {
  buildCalendarWeeks,
  buildDayCells,
} from '../useMonthlyTransactions';
import type { Transaction } from '@/types';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx',
    customerId: 'customer',
    walletId: 'wallet',
    categoryId: 'cat_savings_goal',
    amount: 5_000_000,
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

describe('buildCalendarWeeks', () => {
  it('places August 1 and 2, 2026 under Saturday and Sunday', () => {
    const dayCells = buildDayCells([], 2026, 7);
    const weeks = buildCalendarWeeks(dayCells, 5);

    expect(weeks[0].map((cell) => cell.day)).toEqual([27, 28, 29, 30, 31, 1, 2]);
    expect(weeks[0][5].current?.iso).toBe('2026-08-01');
    expect(weeks[0][6].current?.iso).toBe('2026-08-02');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('places day 1 in the Sunday column for a Sunday-start month', () => {
    const dayCells = buildDayCells([], 2026, 10);
    const weeks = buildCalendarWeeks(dayCells, 6);

    expect(weeks[0].map((cell) => cell.day)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(weeks[0][6].current?.iso).toBe('2026-11-01');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('fills the final week with trailing next-month days', () => {
    const dayCells = buildDayCells([], 2026, 3);
    const weeks = buildCalendarWeeks(dayCells, 2);
    const finalWeek = weeks[weeks.length - 1];

    expect(finalWeek?.map((cell) => cell.day)).toEqual([27, 28, 29, 30, 1, 2, 3]);
    expect(finalWeek?.slice(4).every((cell) => cell.current === null)).toBe(true);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});

describe('buildDayCells', () => {
  it('preserves separate income and expense traces when the daily net is zero', () => {
    const cells = buildDayCells(
      [
        transaction({ id: 'contribution' }),
        transaction({ id: 'withdrawal', type: 'income' }),
      ],
      2026,
      7,
    );
    const day = cells.find((cell) => cell.iso === '2026-08-14');

    expect(day).toMatchObject({
      income: 5_000_000,
      expense: 5_000_000,
      net: 0,
      hasActivity: true,
    });
  });

  it('excludes transfer legs from Calendar activity', () => {
    const cells = buildDayCells(
      [
        transaction({
          id: 'transfer-out',
          categoryId: null,
          type: 'transfer_out',
        }),
        transaction({
          id: 'transfer-in',
          categoryId: null,
          type: 'transfer_in',
        }),
      ],
      2026,
      7,
    );
    const day = cells.find((cell) => cell.iso === '2026-08-14');

    expect(day).toMatchObject({
      income: 0,
      expense: 0,
      hasActivity: false,
    });
  });
});
