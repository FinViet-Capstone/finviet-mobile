import { computePace } from '../[id]';

// The progress-detail screen compares actual spend against a straight-line
// expectation for the month the user is *viewing*, which is not always the
// month the clock is in — a past month is fully elapsed and must never report
// days left or a partial expectation.
describe('computePace', () => {
  it('measures the elapsed fraction of the current month', () => {
    const now = new Date(2026, 8, 8); // 8 Sep 2026 — 30-day month
    const pace = computePace('2026-09-30', 3_000_000, 1_500_000, now);

    expect(pace.day).toBe(8);
    expect(pace.totalDays).toBe(30);
    expect(pace.daysLeft).toBe(22);
    expect(pace.expectedSpent).toBe(800_000);
    expect(pace.deviation).toBe(700_000); // spending faster than the month elapses
  });

  it('treats a past month as fully elapsed', () => {
    const now = new Date(2026, 8, 8);
    const pace = computePace('2026-07-31', 2_000_000, 1_200_000, now);

    expect(pace.day).toBe(31);
    expect(pace.daysLeft).toBe(0);
    expect(pace.expectedSpent).toBe(2_000_000); // the whole limit, not a slice
    expect(pace.deviation).toBe(-800_000);
  });

  it('handles February in a leap year', () => {
    const now = new Date(2028, 1, 15);
    const pace = computePace('2028-02-29', 2_900_000, 0, now);

    expect(pace.totalDays).toBe(29);
    expect(pace.daysLeft).toBe(14);
  });

  it('reports a negative deviation when spending trails the month', () => {
    const now = new Date(2026, 8, 15);
    const pace = computePace('2026-09-30', 1_000_000, 100_000, now);

    expect(pace.expectedSpent).toBe(500_000);
    expect(pace.deviation).toBe(-400_000);
  });
});
