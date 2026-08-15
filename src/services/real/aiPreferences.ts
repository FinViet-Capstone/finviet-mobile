import { api, unwrap } from '@/lib/api';
import type {
  AiPreferences,
  UpdateAiPreferencesInput,
} from '@/services/mock/aiPreferences';

export async function getAiPreferences(): Promise<AiPreferences> {
  const response = await api.get('/profile/ai-preferences');
  return unwrap<AiPreferences>(response);
}

export async function updateAiPreferences(
  patch: UpdateAiPreferencesInput,
): Promise<AiPreferences> {
  const response = await api.patch('/profile/ai-preferences', patch);
  return unwrap<AiPreferences>(response);
}
