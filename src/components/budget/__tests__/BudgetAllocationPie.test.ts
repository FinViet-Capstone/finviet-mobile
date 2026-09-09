import { computePieSegments, type PieBucket } from '../BudgetAllocationPie';

function bucket(over: Partial<PieBucket> & Pick<PieBucket, 'key' | 'spent' | 'limit'>): PieBucket {
  return { label: over.key, color: '#000', ...over };
}

const NEEDS = bucket({ key: 'needs', spent: 2_300_000, limit: 10_000_000 });
const WANTS = bucket({ key: 'wants', spent: 0, limit: 6_000_000 });
const SAVINGS = bucket({ key: 'savings', spent: 0, limit: 4_000_000, goalMode: true });

describe('computePieSegments', () => {
  it('sizes each sector by its share of the total allocation', () => {
    const [needs, wants, savings] = computePieSegments([NEEDS, WANTS, SAVINGS]);
    // 10M/6M/4M of 20M → 50% / 30% / 20% of the circle.
    expect(needs.endAngle - needs.startAngle).toBeCloseTo(180);
    expect(wants.endAngle - wants.startAngle).toBeCloseTo(108);
    expect(savings.endAngle - savings.startAngle).toBeCloseTo(72);
  });

  it('closes the ring exactly at 360°', () => {
    const segments = computePieSegments([NEEDS, WANTS, SAVINGS]);
    expect(segments[0].startAngle).toBe(0);
    expect(segments[segments.length - 1].endAngle).toBe(360);
  });

  it('caps an overspent bucket at its own sector instead of bleeding into the next', () => {
    const over = bucket({ key: 'needs', spent: 50_000_000, limit: 10_000_000 });
    const [needs, wants] = computePieSegments([over, WANTS, SAVINGS]);
    expect(needs.fillRatio).toBe(1);
    expect(needs.isOver).toBe(true);
    expect(needs.overAmount).toBe(40_000_000);
    // The neighbour keeps the sector it was always entitled to.
    expect(wants.startAngle).toBeCloseTo(180);
  });

  it('reports the exact overspend so the popup can print a truthful figure', () => {
    const [needs] = computePieSegments([
      bucket({ key: 'needs', spent: 12_400_000, limit: 10_000_000 }),
      WANTS,
      SAVINGS,
    ]);
    expect(needs.overAmount).toBe(2_400_000);
  });

  it('gives a bucket with no limit no sector, and never flags it as overspent', () => {
    const [needs, wants] = computePieSegments([
      NEEDS,
      bucket({ key: 'wants', spent: 500_000, limit: 0 }),
      SAVINGS,
    ]);
    expect(wants.endAngle - wants.startAngle).toBe(0);
    expect(wants.isOver).toBe(false);
    expect(needs.endAngle - needs.startAngle).toBeGreaterThan(0);
  });

  it('lets the last bucket that HAS a limit close the ring, not a trailing empty one', () => {
    const segments = computePieSegments([
      NEEDS,
      WANTS,
      bucket({ key: 'savings', spent: 0, limit: 0, goalMode: true }),
    ]);
    expect(segments[1].endAngle).toBe(360);
    expect(segments[2].endAngle - segments[2].startAngle).toBe(0);
  });

  it('returns nothing when no bucket has an allocation', () => {
    expect(
      computePieSegments([
        bucket({ key: 'needs', spent: 0, limit: 0 }),
        bucket({ key: 'wants', spent: 0, limit: 0 }),
      ]),
    ).toEqual([]);
  });

  it('treats a savings bucket over target as over — the caller decides it is good news', () => {
    const [savings] = computePieSegments([
      bucket({ key: 'savings', spent: 5_000_000, limit: 4_000_000, goalMode: true }),
    ]);
    expect(savings.isOver).toBe(true);
    expect(savings.bucket.goalMode).toBe(true);
  });
});
