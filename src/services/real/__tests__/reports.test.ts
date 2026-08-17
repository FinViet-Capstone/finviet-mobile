import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getWeeklyReport, getSpendingScore } from '@/services/real/reports';

// A single shared adapter for the whole file — constructing a second
// AxiosMockAdapter against the same `api` instance in a nested describe
// clobbers the first one's registered routes (both constructors run during
// Jest's synchronous collection phase, before either describe's tests run).
const mock = new AxiosMockAdapter(api);

afterEach(() => mock.reset());
afterAll(() => mock.restore());

describe('real weekly report service', () => {
  it('loads the exact report requested by a notification deep link', async () => {
    mock.onGet('/ai/reports/report%2Fid').reply(200, {
      success: true,
      data: {
        reportId: 'report/id',
        periodStart: '2026-08-03',
        periodEnd: '2026-08-09',
        narrative: 'Exact report',
        finalScore: 70,
        colorBadge: 'GREEN',
        generatedAt: '2026-08-10T00:00:00Z',
      },
    });

    const report = await getWeeklyReport('report/id');

    expect(report).toMatchObject({
      id: 'report/id',
      reportTextVi: 'Exact report',
      weekStart: '2026-08-03',
    });
    expect(mock.history.get).toHaveLength(1);
  });
});

describe('real spending score service', () => {
  it('maps spikeScore/budgetScore/savingsScore/weights through unchanged', async () => {
    mock.onGet('/ai/score', { params: { period: 'MONTHLY' } }).reply(200, {
      success: true,
      data: {
        periodType: 'MONTHLY',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        finalScore: 54,
        spikeScore: 51,
        budgetScore: 44,
        savingsScore: 68,
        weights: { spike: 30, budget: 40, savings: 30 },
        colorBadge: 'YELLOW',
        comment: 'Bạn tiết kiệm tốt nhưng chi tiêu vượt ngân sách.',
      },
    });

    const score = await getSpendingScore('monthly');

    expect(score.spikeScore).toBe(51);
    expect(score.budgetScore).toBe(44);
    expect(score.savingsScore).toBe(68);
    expect(score.weights).toEqual({ spike: 30, budget: 40, savings: 30 });
  });

  it('passes through null sub-scores (insufficient data for that metric) without fabricating a value', async () => {
    mock.onGet('/ai/score', { params: { period: 'WEEKLY' } }).reply(200, {
      success: true,
      data: {
        periodType: 'WEEKLY',
        periodStart: '2026-05-18',
        periodEnd: '2026-05-24',
        finalScore: 50,
        spikeScore: null,
        budgetScore: 60,
        savingsScore: null,
        weights: { budget: 100 },
        colorBadge: 'YELLOW',
        comment: null,
      },
    });

    const score = await getSpendingScore('weekly');

    expect(score.spikeScore).toBeNull();
    expect(score.savingsScore).toBeNull();
    // Backend comment: null on AI-provider failure must stay null (not ''),
    // so the UI's fallback text actually renders instead of a blank box.
    expect(score.reasonVi).toBeNull();
    expect(score.commentaryVi).toBeNull();
  });
});
