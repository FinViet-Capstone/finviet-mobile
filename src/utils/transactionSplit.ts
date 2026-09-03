/**
 * Running state of a split form: what the parts add up to, what is left, and whether the
 * backend would accept it.
 *
 * The backend requires the parts to sum to the original amount exactly. It does not adjust a
 * remainder because that would change the wallet balance. Keeping this calculation independent
 * from the screen makes the submit guard directly testable without booting Expo components.
 */
export function computeSplitState(
  originalAmount: number,
  parts: readonly { amount: number }[],
): { total: number; remaining: number; canSubmit: boolean } {
  const total = parts.reduce(
    (sum, part) => sum + (Number.isFinite(part.amount) ? part.amount : 0),
    0,
  );
  const remaining = originalAmount - total;
  const canSubmit =
    parts.length >= 2 && parts.every((part) => part.amount > 0) && remaining === 0;
  return { total, remaining, canSubmit };
}
