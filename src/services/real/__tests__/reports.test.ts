import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getWeeklyReport } from '@/services/real/reports';

describe('real weekly report service', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

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
