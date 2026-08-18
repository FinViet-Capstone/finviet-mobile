import { api, unwrap } from '@/lib/api';
import type { AiPreferences, UpdateAiPreferencesInput } from '@/types';

export async function getAiPreferences(): Promise<AiPreferences> {
  const response = await api.get('/profile/ai-preferences');
  return unwrap<AiPreferences>(response);
}

// Uses PUT rather than PATCH — React Native's on-device networking layer has a
// known history of dropping the request body specifically on PATCH requests.
// The backend route accepts both verbs.
export async function updateAiPreferences(
  patch: UpdateAiPreferencesInput,
): Promise<AiPreferences> {
  const response = await api.put('/profile/ai-preferences', patch);
  return unwrap<AiPreferences>(response);
}
