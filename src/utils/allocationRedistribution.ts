/**
 * Pure redistribution math shared by the two 3-bucket allocation editors —
 * Settings › Phân bổ ngân sách (app/settings/budget-allocation.tsx) and
 * onboarding step 2 (src/components/onboarding/OnboardingAllocation.tsx).
 *
 * Given a new value for one bucket, both screens derive the other two so all
 * three always sum to exactly 100 — the backend's chk_buckets_sum /
 * chk_income_allocation_pct_sum CHECK constraints, and the matching
 * FluentValidation `NeedsPct + WantsPct + SavingsPct == 100` rules on
 * UpdateProfileCommand/ScheduleIncomeAllocationChangeCommand, reject anything
 * else.
 *
 * All arithmetic that needs to sum exactly happens in integer "basis points"
 * (percentage × 100, so 14.29% → 1429) rather than on the decimal percentages
 * directly. This matters: rounding three decimals independently and summing
 * them with plain `+` is not reliably exact in JS — e.g.
 * `14.29 + 61.22 + 24.49` can evaluate to `99.99999999999999`, even though
 * each value is individually correct to 2dp, because binary floating point
 * can't represent most 2-decimal fractions exactly. Doing the "other B is the
 * exact remainder" step as `remainingBp - otherABp` (integer subtraction,
 * exact for any value in this 0-10000 range) instead of
 * `roundPct(remaining - otherA)` (decimal subtraction, then rounded) removes
 * any dependence on that division being "close enough" to round correctly —
 * it's simply always correct.
 *
 * The two screens use slightly different zero-total fallback strategies
 * (budget-allocation.tsx: `ratio || fallbackRatio`; onboarding: an explicit
 * `total === 0` check with an implicit 50/50 split) — preserved here as two
 * distinct exports rather than unified, so this extraction changes neither
 * screen's observable behavior.
 */

const BASIS_POINTS_PER_PERCENT = 100;
const TOTAL_BASIS_POINTS = 100 * BASIS_POINTS_PER_PERCENT; // 100% as basis points

/** percentage (0-100, up to 2dp) → integer basis points (0-10000), exact. */
function toBasisPoints(pct: number): number {
  return Math.round(pct * BASIS_POINTS_PER_PERCENT);
}

/** integer basis points → percentage (0-100, 2dp). */
function fromBasisPoints(bp: number): number {
  return bp / BASIS_POINTS_PER_PERCENT;
}

/** Round a % to at most 2 decimal places — the max precision this feature supports. */
export function roundPct(n: number): number {
  return fromBasisPoints(toBasisPoints(n));
}

export interface ProportionalResult {
  changed: number;
  otherA: number;
  otherB: number;
}

export interface LockedResult {
  changed: number;
  free: number;
}

/**
 * No-lock redistribution using budget-allocation.tsx's fallback strategy:
 * the caller supplies a fixed fallback ratio for "other A", used whenever
 * `otherAValue / (otherAValue + otherBValue)` is falsy (zero or NaN).
 */
export function redistributeProportionalWithFallbackRatio(
  newValue: number,
  otherAValue: number,
  otherBValue: number,
  fallbackRatioA: number,
): ProportionalResult {
  const changedBp = toBasisPoints(newValue);
  const remainingBp = TOTAL_BASIS_POINTS - changedBp;
  const otherABp = toBasisPoints(otherAValue);
  const otherBBp = toBasisPoints(otherBValue);
  const ratioA = otherABp / (otherABp + otherBBp) || fallbackRatioA;
  const otherANewBp = Math.round(remainingBp * ratioA);
  const otherBNewBp = remainingBp - otherANewBp; // exact integer remainder
  return {
    changed: fromBasisPoints(changedBp),
    otherA: fromBasisPoints(otherANewBp),
    otherB: fromBasisPoints(otherBNewBp),
  };
}

/**
 * No-lock redistribution using OnboardingAllocation.tsx's fallback strategy:
 * an even 50/50 split specifically when both other buckets are 0 (checked
 * explicitly, not via a falsy-ratio fallback, so a legitimate 0/positive
 * split isn't overridden).
 */
export function redistributeProportionalEvenSplit(
  newValue: number,
  otherAValue: number,
  otherBValue: number,
): ProportionalResult {
  const changedBp = toBasisPoints(newValue);
  const remainingBp = TOTAL_BASIS_POINTS - changedBp;
  const otherABp = toBasisPoints(otherAValue);
  const otherBBp = toBasisPoints(otherBValue);
  const totalBp = otherABp + otherBBp;
  const otherANewBp =
    totalBp === 0 ? Math.round(remainingBp / 2) : Math.round((remainingBp * otherABp) / totalBp);
  const otherBNewBp = remainingBp - otherANewBp; // exact integer remainder
  return {
    changed: fromBasisPoints(changedBp),
    otherA: fromBasisPoints(otherANewBp),
    otherB: fromBasisPoints(otherBNewBp),
  };
}

/**
 * Redistribution when one of the OTHER two buckets is locked: clamp the
 * dragged value against the locked share, and give the entire remainder to
 * the single free bucket (no proportional split needed). Identical on both
 * screens.
 */
export function redistributeLocked(newValue: number, lockedValue: number): LockedResult {
  const roundedBp = toBasisPoints(newValue);
  const lockedBp = toBasisPoints(lockedValue);
  const maxBp = TOTAL_BASIS_POINTS - lockedBp;
  const clampedBp = Math.min(Math.max(roundedBp, 0), maxBp);
  const freeBp = TOTAL_BASIS_POINTS - lockedBp - clampedBp; // exact integer remainder
  return { changed: fromBasisPoints(clampedBp), free: fromBasisPoints(freeBp) };
}
