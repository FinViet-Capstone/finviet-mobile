import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import {
  getAiPreferences,
  updateAiPreferences,
} from '@/services/real/aiPreferences';

const PREFERENCES = {
  categorizationMode: 'suggest_only' as const,
  autoCategorizationThreshold: 0.85,
  defaultHistoryEnabled: true,
  weeklyReportEnabled: true,
  shareBalances: true,
  shareTransactions: true,
  shareBudgets: true,
  shareGoals: true,
  shareReports: true,
  ragEnabled: true,
};

describe('real AI preferences service', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('loads and unwraps customer AI preferences', async () => {
    mock.onGet('/profile/ai-preferences').reply(200, {
      success: true,
      data: PREFERENCES,
    });

    await expect(getAiPreferences()).resolves.toEqual(PREFERENCES);
  });

  it('patches only the supplied fields and preserves false values', async () => {
    const patch = {
      categorizationMode: 'high_confidence_auto' as const,
      autoCategorizationThreshold: 0.9,
      shareTransactions: false,
      ragEnabled: false,
    };
    mock.onPatch('/profile/ai-preferences', patch).reply(200, {
      success: true,
      data: { ...PREFERENCES, ...patch },
    });

    await expect(updateAiPreferences(patch)).resolves.toEqual({
      ...PREFERENCES,
      ...patch,
    });
    expect(JSON.parse(mock.history.patch[0].data)).toEqual(patch);
  });
});
