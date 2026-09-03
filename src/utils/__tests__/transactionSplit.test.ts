import { computeSplitState } from '@/utils/transactionSplit';

describe('computeSplitState', () => {
  it('allows two positive parts that exactly preserve the original amount', () => {
    expect(computeSplitState(500_000, [{ amount: 300_000 }, { amount: 200_000 }])).toEqual({
      total: 500_000,
      remaining: 0,
      canSubmit: true,
    });
  });

  it('reports an under-allocation', () => {
    expect(computeSplitState(500_000, [{ amount: 300_000 }, { amount: 150_000 }])).toEqual({
      total: 450_000,
      remaining: 50_000,
      canSubmit: false,
    });
  });

  it('reports an over-allocation', () => {
    expect(computeSplitState(500_000, [{ amount: 300_000 }, { amount: 250_000 }])).toEqual({
      total: 550_000,
      remaining: -50_000,
      canSubmit: false,
    });
  });

  it('rejects one part or a non-positive part even when the total matches', () => {
    expect(computeSplitState(500_000, [{ amount: 500_000 }]).canSubmit).toBe(false);
    expect(computeSplitState(500_000, [{ amount: 500_000 }, { amount: 0 }]).canSubmit).toBe(false);
  });

  it('does not let non-finite input poison the displayed total', () => {
    expect(computeSplitState(500_000, [{ amount: Number.NaN }, { amount: 500_000 }])).toEqual({
      total: 500_000,
      remaining: 0,
      canSubmit: false,
    });
  });
});
