import {
  getCategories,
  getCategoryTypeForTransaction,
} from '../categories';

describe('transaction category picker options', () => {
  it('maps income transactions to income-only categories', () => {
    const categoryType = getCategoryTypeForTransaction('income');
    const categories = getCategories(categoryType!);

    expect(categoryType).toBe('income');
    expect(categories).not.toHaveLength(0);
    expect(categories.every((category) => category.type === 'income')).toBe(true);
    expect(categories.some((category) => category.id === 'cat_food')).toBe(false);
  });

  it('maps expense transactions to manually selectable expense categories', () => {
    const categoryType = getCategoryTypeForTransaction('expense');
    const categories = getCategories(categoryType!);

    expect(categoryType).toBe('expense');
    expect(categories).not.toHaveLength(0);
    expect(categories.every((category) => category.type === 'expense')).toBe(true);
    expect(categories.some((category) => category.id === 'cat_salary')).toBe(false);
    expect(categories.some((category) => category.id === 'cat_savings_goal')).toBe(false);
    expect(categories.some((category) => category.id === 'cat_uncategorized')).toBe(false);
  });

  it('does not expose a category type for transfer legs', () => {
    expect(getCategoryTypeForTransaction('transfer_in')).toBeNull();
    expect(getCategoryTypeForTransaction('transfer_out')).toBeNull();
  });
});
