import {
  buildAiPreferencePatch,
  requiresTransactionSharing,
} from '../aiPreferenceDependencies';

describe('AI preference dependencies', () => {
  it('turns off transaction-dependent features with transaction sharing', () => {
    expect(buildAiPreferencePatch('shareTransactions', false)).toEqual({
      shareTransactions: false,
      weeklyReportEnabled: false,
      ragEnabled: false,
    });
  });

  it('does not alter independent preferences', () => {
    expect(buildAiPreferencePatch('shareGoals', false)).toEqual({ shareGoals: false });
  });

  it('identifies the switches that require transaction sharing', () => {
    expect(requiresTransactionSharing('weeklyReportEnabled')).toBe(true);
    expect(requiresTransactionSharing('ragEnabled')).toBe(true);
    expect(requiresTransactionSharing('defaultHistoryEnabled')).toBe(false);
  });
});
