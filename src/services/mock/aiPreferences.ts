export type CategorizationMode = 'off' | 'suggest_only' | 'high_confidence_auto';

export interface AiPreferences {
  categorizationMode: CategorizationMode;
  autoCategorizationThreshold: number;
  defaultHistoryEnabled: boolean;
  weeklyReportEnabled: boolean;
  shareBalances: boolean;
  shareTransactions: boolean;
  shareBudgets: boolean;
  shareGoals: boolean;
  shareReports: boolean;
  ragEnabled: boolean;
}

export type UpdateAiPreferencesInput = Partial<AiPreferences>;

const DEFAULT_AI_PREFERENCES: AiPreferences = {
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

let aiPreferences = { ...DEFAULT_AI_PREFERENCES };

const delay = (ms = 150) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function getAiPreferences(): Promise<AiPreferences> {
  await delay();
  return { ...aiPreferences };
}

export async function updateAiPreferences(
  patch: UpdateAiPreferencesInput,
): Promise<AiPreferences> {
  await delay();
  aiPreferences = { ...aiPreferences, ...patch };
  return { ...aiPreferences };
}
