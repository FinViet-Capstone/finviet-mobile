import { calculateBudgetAdherenceScore } from '../budgets';

// Savings is a target, not a spending cap — saving ahead of pace must never
// lower budgetAdherenceScore. Matches the real backend's structural rule
// (CalculateFlatBudgetAdherenceScore, BudgetService.cs), which excludes the
// savings bucket from this sum entirely.
describe('calculateBudgetAdherenceScore', () => {
  it('excludes the savings bucket even when it is far ahead of pace', () => {
    const withHeavySavings = calculateBudgetAdherenceScore([
      { bucket: 'needs', paceDeviation: 0, allocationCap: 5_000_000 },
      { bucket: 'wants', paceDeviation: 0, allocationCap: 3_000_000 },
      { bucket: 'savings', paceDeviation: 10_000_000, allocationCap: 2_000_000 }, // way over pace
    ]);

    expect(withHeavySavings).toBe(100);
  });

  it('still penalizes needs/wants overspending normally', () => {
    const score = calculateBudgetAdherenceScore([
      { bucket: 'needs', paceDeviation: 1_000_000, allocationCap: 5_000_000 }, // 20% over pace
      { bucket: 'wants', paceDeviation: 0, allocationCap: 3_000_000 },
      { bucket: 'savings', paceDeviation: -5_000_000, allocationCap: 2_000_000 },
    ]);

    // overPace = (1,000,000/5,000,000 + 0)/2 = 0.1 → 100 - 10 = 90
    expect(score).toBe(90);
  });

  it('is unaffected by the savings bucket regardless of its pace direction', () => {
    const savingsAhead = calculateBudgetAdherenceScore([
      { bucket: 'needs', paceDeviation: 500_000, allocationCap: 5_000_000 },
      { bucket: 'wants', paceDeviation: 0, allocationCap: 3_000_000 },
      { bucket: 'savings', paceDeviation: 9_999_999, allocationCap: 2_000_000 },
    ]);
    const savingsBehind = calculateBudgetAdherenceScore([
      { bucket: 'needs', paceDeviation: 500_000, allocationCap: 5_000_000 },
      { bucket: 'wants', paceDeviation: 0, allocationCap: 3_000_000 },
      { bucket: 'savings', paceDeviation: -9_999_999, allocationCap: 2_000_000 },
    ]);

    expect(savingsAhead).toBe(savingsBehind);
  });

  it('returns the neutral 100 when only a savings bucket is present', () => {
    expect(
      calculateBudgetAdherenceScore([{ bucket: 'savings', paceDeviation: 5, allocationCap: 100 }]),
    ).toBe(100);
  });
});
