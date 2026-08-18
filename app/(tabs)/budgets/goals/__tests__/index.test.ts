import { computeGoalAffordability } from '../index';

// Neither the mock nor the real backend compares Σ requiredMonthlySaving
// against the customer's Savings allocation cap — a customer can otherwise
// commit to goals their own plan can't fund with no warning anywhere.
describe('computeGoalAffordability', () => {
  it('warns when active goals collectively need more than the savings cap', () => {
    const result = computeGoalAffordability(
      [{ requiredMonthlySaving: 3_000_000 }, { requiredMonthlySaving: 2_500_000 }],
      5_000_000,
    );

    expect(result.totalRequiredMonthly).toBe(5_500_000);
    expect(result.isOverAllocated).toBe(true);
  });

  it('does not warn when goals fit within the savings cap', () => {
    const result = computeGoalAffordability(
      [{ requiredMonthlySaving: 1_000_000 }],
      5_000_000,
    );

    expect(result.isOverAllocated).toBe(false);
  });

  it('does not warn when the savings cap is zero (no income configured)', () => {
    // A cap of 0 usually means the customer hasn't set an income yet — treat
    // as "nothing to compare against" rather than flagging every goal.
    const result = computeGoalAffordability([{ requiredMonthlySaving: 1_000_000 }], 0);

    expect(result.isOverAllocated).toBe(false);
  });

  it('does not warn with no active goals', () => {
    const result = computeGoalAffordability([], 5_000_000);

    expect(result.totalRequiredMonthly).toBe(0);
    expect(result.isOverAllocated).toBe(false);
  });

  it('does not warn exactly at the cap boundary', () => {
    const result = computeGoalAffordability([{ requiredMonthlySaving: 5_000_000 }], 5_000_000);

    expect(result.isOverAllocated).toBe(false);
  });
});
