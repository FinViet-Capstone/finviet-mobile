import { getBudgetStatus } from '../budgetStatus';

// Single threshold set for needs/wants spend-pacing status, shared by Home's
// BudgetOverviewCard and the Budgets tab's BucketCard (previously drifted to
// >85/>60 and >80/>60 respectively) — must match BudgetWithSpend.status's own
// >80/>=60 derivation (mock/budgets.ts, real/budgets.ts).
describe('getBudgetStatus', () => {
  it('is safe below 60%', () => {
    expect(getBudgetStatus(0)).toBe('safe');
    expect(getBudgetStatus(59.9)).toBe('safe');
  });

  it('is warning from 60% up to and including 80%', () => {
    expect(getBudgetStatus(60)).toBe('warning');
    expect(getBudgetStatus(80)).toBe('warning');
  });

  it('is danger above 80%', () => {
    expect(getBudgetStatus(80.1)).toBe('danger');
    expect(getBudgetStatus(150)).toBe('danger');
  });
});
