import {
  getAiPreferences,
  updateAiPreferences,
  type AiPreferences,
} from '@/services/mock/aiPreferences';

const DEFAULTS: AiPreferences = {
  categorizationMode: 'suggest_only',
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

describe('mock AI preferences service', () => {
  beforeEach(async () => {
    await updateAiPreferences(DEFAULTS);
  });

  it('returns the backend safe defaults', async () => {
    await expect(getAiPreferences()).resolves.toEqual(DEFAULTS);
  });

  it('partially updates preferences without resetting other fields', async () => {
    const updated = await updateAiPreferences({
      categorizationMode: 'high_confidence_auto',
      autoCategorizationThreshold: 0.9,
      shareTransactions: false,
      ragEnabled: false,
    });

    expect(updated).toEqual({
      ...DEFAULTS,
      categorizationMode: 'high_confidence_auto',
      autoCategorizationThreshold: 0.9,
      shareTransactions: false,
      ragEnabled: false,
    });
    expect(await getAiPreferences()).toEqual(updated);
  });

  it('supports disabling every boolean preference', async () => {
    const updated = await updateAiPreferences({
      defaultHistoryEnabled: false,
      weeklyReportEnabled: false,
      shareBalances: false,
      shareTransactions: false,
      shareBudgets: false,
      shareGoals: false,
      shareReports: false,
      ragEnabled: false,
    });

    expect(Object.entries(updated).filter(([, value]) => value === false)).toHaveLength(8);
  });
});
