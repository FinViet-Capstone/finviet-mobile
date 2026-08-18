import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import {
  getWeeklyReport,
  getSpendingScore,
  previewCategorization,
  categorizeTransaction,
  overrideCategorization,
} from '@/services/real/reports';

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

  it('maps hasData: false through so the UI can show the no-transactions empty state', async () => {
    mock.onGet('/ai/score', { params: { period: 'WEEKLY' } }).reply(200, {
      success: true,
      data: {
        periodType: 'WEEKLY',
        periodStart: '2026-08-17',
        periodEnd: '2026-08-19',
        finalScore: 50, // neutral baseline, not a real assessment
        spikeScore: null,
        budgetScore: null,
        savingsScore: null,
        weights: {},
        colorBadge: 'YELLOW',
        comment: null,
        hasData: false,
      },
    });

    const score = await getSpendingScore('weekly');

    expect(score.hasData).toBe(false);
  });

  it('defaults hasData to true when an older backend omits the field', async () => {
    mock.onGet('/ai/score', { params: { period: 'WEEKLY' } }).reply(200, {
      success: true,
      data: {
        periodType: 'WEEKLY',
        periodStart: '2026-08-17',
        periodEnd: '2026-08-19',
        finalScore: 72,
        spikeScore: 80,
        budgetScore: 64,
        savingsScore: null,
        weights: { spike: 50, budget: 50 },
        colorBadge: 'YELLOW',
        comment: 'Ổn định.',
      },
    });

    const score = await getSpendingScore('weekly');

    expect(score.hasData).toBe(true);
  });
});

describe('AI categorization service', () => {
  it('previewCategorization passes through the backend-resolved categoryId', async () => {
    mock.onPost('/ai/categorize/preview').reply(200, {
      success: true,
      data: { categoryId: 'cat_food', categoryName: 'Ăn uống', confidence: 0.9 },
    });

    const result = await previewCategorization('Highlands Coffee');

    expect(result).toEqual({ categoryId: 'cat_food', categoryName: 'Ăn uống', confidence: 0.9 });
  });

  it('categorizeTransaction maps an AI_SUGGESTION outcome (default suggest_only mode) without applying it', async () => {
    mock.onPost('/ai/categorize/tx-1').reply(200, {
      success: true,
      data: {
        transactionId: 'tx-1',
        categoryId: null,
        categoryName: null,
        confidence: 0.92,
        isAiClassified: false,
        queued: false,
        applied: false,
        suggestedCategoryId: 'cat_food',
        suggestedCategoryName: 'Ăn uống',
        reason: 'suggest_only',
        source: 'AI_SUGGESTION',
      },
    });

    const outcome = await categorizeTransaction('tx-1');

    expect(outcome.applied).toBe(false);
    expect(outcome.source).toBe('AI_SUGGESTION');
    expect(outcome.suggestedCategoryId).toBe('cat_food');
    expect(outcome.suggestedCategoryName).toBe('Ăn uống');
    expect(outcome.reason).toBe('suggest_only');
  });

  it('categorizeTransaction maps every backend source value, defaulting only truly unknown values to FALLBACK', async () => {
    for (const source of ['MANUAL', 'RULE', 'AI_AUTO', 'AI_SUGGESTION', 'OFF', 'FALLBACK']) {
      mock.onPost('/ai/categorize/tx-src').reply(200, {
        success: true,
        data: {
          transactionId: 'tx-src',
          isAiClassified: false,
          queued: false,
          applied: false,
          source,
        },
      });

      const outcome = await categorizeTransaction('tx-src');
      expect(outcome.source).toBe(source);
    }

    mock.onPost('/ai/categorize/tx-unknown').reply(200, {
      success: true,
      data: { transactionId: 'tx-unknown', isAiClassified: false, queued: false, applied: false, source: 'WEIRD' },
    });
    const unknown = await categorizeTransaction('tx-unknown');
    expect(unknown.source).toBe('FALLBACK');
  });

  it('overrideCategorization maps an applied outcome', async () => {
    mock.onPost('/ai/transactions/tx-2/override').reply(200, {
      success: true,
      data: {
        transactionId: 'tx-2',
        categoryId: 'cat_food',
        categoryName: 'Ăn uống',
        isAiClassified: false,
        queued: false,
        applied: true,
        source: 'MANUAL',
      },
    });

    const outcome = await overrideCategorization('tx-2', 'cat_food');

    expect(outcome.applied).toBe(true);
    expect(outcome.categoryId).toBe('cat_food');
    expect(mock.history.post[mock.history.post.length - 1].data).toBe(
      JSON.stringify({ categoryId: 'cat_food' }),
    );
  });
});
