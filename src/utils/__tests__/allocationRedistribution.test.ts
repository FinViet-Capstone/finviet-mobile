import {
  roundPct,
  redistributeProportionalWithFallbackRatio,
  redistributeProportionalEvenSplit,
  redistributeLocked,
} from '../allocationRedistribution';

// The backend rejects anything but an exact 100 sum (chk_buckets_sum /
// chk_income_allocation_pct_sum CHECK constraints, plus matching
// FluentValidation `== 100` rules) — these lock in the invariant that was,
// until this test existed, correct only by careful hand-written math with
// nothing enforcing it.
//
// Assertions sum via basis points (percentage × 100, rounded to the nearest
// integer), not naive `changed + otherA + otherB`. This is deliberate, not a
// workaround: three individually-correct 2-decimal percentages do not always
// sum to exactly 100 under plain JS `+` — e.g. `14.29 + 61.22 + 24.49` can
// evaluate to `99.99999999999999`, because most 2-decimal fractions aren't
// exactly representable in binary floating point, even though each value is
// individually correct and would parse as an exact decimal(5,2) on the
// backend. Basis-point summation matches what actually matters — how the
// values round-trip through JSON text into C#'s exact decimal type — and is
// the same reasoning behind the app's own `isValid` tolerance check rather
// than a strict `=== 100`.
function toBasisPoints(pct: number): number {
  return Math.round(pct * 100);
}

describe('redistributeProportionalWithFallbackRatio (budget-allocation.tsx)', () => {
  const cases: [number, number, number, number][] = [
    [33.33, 30, 20, 0.6], // repeating-decimal-producing value
    [14.29, 50, 20, 0.7],
    [66.67, 10, 90, 0.6],
    [0, 50, 30, 0.625],
    [100, 50, 30, 0.6],
    [55.55, 1, 2, 0.7],
    [12.5, 0, 0, 0.6], // zero total triggers the fallback ratio
  ];

  it.each(cases)(
    'newValue=%p otherA=%p otherB=%p fallback=%p sums to exactly 100',
    (newValue, otherA, otherB, fallback) => {
      const result = redistributeProportionalWithFallbackRatio(newValue, otherA, otherB, fallback);
      const totalBp = toBasisPoints(result.changed) + toBasisPoints(result.otherA) + toBasisPoints(result.otherB);
      expect(totalBp).toBe(10000);
    },
  );
});

describe('redistributeProportionalEvenSplit (OnboardingAllocation.tsx)', () => {
  const cases: [number, number, number][] = [
    [33.33, 30, 20],
    [14.29, 50, 20],
    [66.67, 10, 90],
    [0, 50, 30],
    [100, 50, 30],
    [55.55, 1, 2],
    [12.5, 0, 0], // zero total → explicit 50/50 split
    [40, 0, 30], // one side legitimately zero — must not misfire the zero-total branch
  ];

  it.each(cases)(
    'newValue=%p otherA=%p otherB=%p sums to exactly 100',
    (newValue, otherA, otherB) => {
      const result = redistributeProportionalEvenSplit(newValue, otherA, otherB);
      const totalBp = toBasisPoints(result.changed) + toBasisPoints(result.otherA) + toBasisPoints(result.otherB);
      expect(totalBp).toBe(10000);
    },
  );

  it('gives all of the remainder to the nonzero side when the other is legitimately 0', () => {
    const result = redistributeProportionalEvenSplit(40, 0, 30);
    expect(result.otherA).toBe(0);
    expect(result.otherB).toBe(60);
  });
});

describe('redistributeLocked (shared by both screens)', () => {
  const cases: [number, number][] = [
    [33.33, 20],
    [14.29, 50],
    [120, 20], // over 100 — must clamp
    [-10, 20], // negative — must clamp to 0
    [50, 0],
  ];

  it.each(cases)('newValue=%p lockedValue=%p sums to exactly 100 with the locked share', (newValue, lockedValue) => {
    const result = redistributeLocked(newValue, lockedValue);
    const totalBp = toBasisPoints(result.changed) + toBasisPoints(result.free) + toBasisPoints(lockedValue);
    expect(totalBp).toBe(10000);
  });
});

describe('roundPct', () => {
  it('rounds to at most 2 decimal places', () => {
    expect(roundPct(33.333333)).toBe(33.33);
    expect(roundPct(66.666666)).toBe(66.67);
  });
});
