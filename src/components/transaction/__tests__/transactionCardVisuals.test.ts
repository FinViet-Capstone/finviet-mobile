import { getTransactionCardVisuals } from '../transactionCardVisuals';
import { COLORS } from '@/theme';
import type { Transaction } from '@/types/transaction';

/** Minimal transaction factory — override only what a case cares about. */
function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    customerId: 'c1',
    walletId: 'w1',
    categoryId: 'cat_food',
    amount: 50_000,
    type: 'expense',
    description: null,
    merchant: null,
    transactionDate: '2026-05-01',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

// COLORS (theme-invariant, always DARK_COLORS) is a fine fixture here — this
// suite only checks the pure derivation logic branches correctly on a given
// palette, not that the app renders dark by default.
describe('getTransactionCardVisuals', () => {
  it('income is a green credit with a + prefix', () => {
    const v = getTransactionCardVisuals(tx({ type: 'income', merchant: 'Lương' }), COLORS);
    expect(v.amountPrefix).toBe('+');
    expect(v.amountColor).toBe(COLORS.tertiary);
    expect(v.isUncategorized).toBe(false);
  });

  it('transfer_out is a neutral debit with a − prefix and swap icon', () => {
    const v = getTransactionCardVisuals(tx({ type: 'transfer_out', categoryId: null }), COLORS);
    expect(v.amountPrefix).toBe('−');
    expect(v.amountColor).toBe(COLORS.onSurfaceVariant);
    expect(v.iconName).toBe('swap_horiz');
    expect(v.subtitle).toBe('Chuyển đi');
    expect(v.isUncategorized).toBe(false);
  });

  it('transfer_in is a credit and reads "Nhận về"', () => {
    const v = getTransactionCardVisuals(tx({ type: 'transfer_in', categoryId: null }), COLORS);
    expect(v.amountPrefix).toBe('+');
    expect(v.subtitle).toBe('Nhận về');
  });

  it('uncategorized expense gets the classify-now treatment', () => {
    const v = getTransactionCardVisuals(tx({ categoryId: null }), COLORS);
    expect(v.isUncategorized).toBe(true);
    expect(v.iconName).toBe('help_outline');
    expect(v.iconColor).toBe(COLORS.secondary);
    expect(v.title).toBe('Chưa phân loại');
    expect(v.subtitle).toBe('Phân loại ngay →');
    expect(v.amountPrefix).toBe('');
  });

  it('goal contribution derives its name from the description', () => {
    const v = getTransactionCardVisuals(
      tx({ categoryId: 'cat_savings_goal', description: 'Nạp mục tiêu: Du lịch' }),
      COLORS,
    );
    expect(v.iconName).toBe('savings');
    expect(v.iconColor).toBe(COLORS.tertiary);
    expect(v.title).toBe('Nạp mục tiêu: Du lịch');
    expect(v.subtitle).toBe('Tiết kiệm mục tiêu');
    expect(v.amountPrefix).toBe('');
  });

  it('goal withdrawal remains a named credit instead of looking like a contribution', () => {
    const v = getTransactionCardVisuals(
      tx({
        categoryId: 'cat_savings_goal',
        description: 'Rút mục tiêu: Du lịch',
        type: 'income',
      }),
      COLORS,
    );

    expect(v.iconName).toBe('savings');
    expect(v.title).toBe('Rút mục tiêu: Du lịch');
    expect(v.subtitle).toBe('Rút tiền mục tiêu');
    expect(v.amountPrefix).toBe('+');
    expect(v.amountColor).toBe(COLORS.tertiary);
  });

  it('expense prefers merchant, then description, for its title', () => {
    expect(getTransactionCardVisuals(tx({ merchant: 'Highlands' }), COLORS).title).toBe(
      'Highlands',
    );
    expect(
      getTransactionCardVisuals(tx({ merchant: null, description: 'Cà phê' }), COLORS).title,
    ).toBe('Cà phê');
  });
});
