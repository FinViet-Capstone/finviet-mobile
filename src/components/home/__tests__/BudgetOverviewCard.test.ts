import { getDisplayedPercentage } from '../BudgetOverviewCard';

describe('getDisplayedPercentage', () => {
  it('caps progress above the allocation at 100', () => {
    expect(getDisplayedPercentage(55_000_000, 3_000_000)).toBe(100);
  });

  it('clamps invalid or negative progress to zero', () => {
    expect(getDisplayedPercentage(1_000_000, 0)).toBe(0);
    expect(getDisplayedPercentage(-1_000_000, 3_000_000)).toBe(0);
  });

  it('rounds progress within the display range', () => {
    expect(getDisplayedPercentage(2_000_000, 3_000_000)).toBe(67);
  });
});
