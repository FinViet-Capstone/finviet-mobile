import type { AiPreferences, UpdateAiPreferencesInput } from '@/types';

export type BooleanAiPreference = keyof Pick<
  AiPreferences,
  | 'defaultHistoryEnabled'
  | 'weeklyReportEnabled'
  | 'ragEnabled'
  | 'shareBalances'
  | 'shareTransactions'
  | 'shareBudgets'
  | 'shareGoals'
  | 'shareReports'
>;

export function requiresTransactionSharing(field: BooleanAiPreference): boolean {
  return field === 'weeklyReportEnabled' || field === 'ragEnabled';
}

export function buildAiPreferencePatch(
  field: BooleanAiPreference,
  value: boolean,
): UpdateAiPreferencesInput {
  const patch: UpdateAiPreferencesInput = { [field]: value };
  if (field === 'shareTransactions' && !value) {
    patch.weeklyReportEnabled = false;
    patch.ragEnabled = false;
  }
  return patch;
}
