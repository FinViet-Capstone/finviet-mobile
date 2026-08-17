import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getBudgetBuckets } from '@/services/real/budgets';

function success<T>(data: T) {
  return { success: true, data };
}

// The backend returns allocationPct/uncategorizedRatio as a whole 0-100
// percent (BudgetService.cs: AllocationPct = raw Customer.NeedsPct value;
// UncategorizedRatio = uncategorizedSpent/totalSpent*100), while the mock
// contract — and every screen consuming this hook — expects a 0-1 fraction.
// Confirmed real bug (mobile finding C2): the Budgets tab's savings cap was
// 100x too large because this mapper used to pass the raw percent through.
describe('real budgets service — allocationPct/uncategorizedRatio scale', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('normalizes allocationPct and uncategorizedRatio from whole percent to a 0-1 fraction', async () => {
    mock.onGet('/budgets/buckets').reply(
      200,
      success({
        month: '2026-05',
        monthlyIncome: 10_000_000,
        budgetAdherenceScore: 90,
        uncategorizedRatio: 15.5,
        uncategorizedWarning: false,
        buckets: [
          {
            bucket: 'savings',
            allocationPct: 42,
            allocationCap: 4_200_000,
            categoryLimitTotal: 0,
            spent: 1_000_000,
            remaining: 3_200_000,
            percentage: 23.8,
            overAllocated: false,
            expectedSpent: 2_000_000,
            paceDeviation: -1_000_000,
            paceStatus: 'ON_TRACK',
          },
        ],
      }),
    );

    const result = await getBudgetBuckets();

    expect(result.uncategorizedRatio).toBeCloseTo(0.155);
    expect(result.buckets[0].allocationPct).toBeCloseTo(0.42);
    // allocationCap is already an absolute VND amount server-side — untouched.
    expect(result.buckets[0].allocationCap).toBe(4_200_000);
  });
});
