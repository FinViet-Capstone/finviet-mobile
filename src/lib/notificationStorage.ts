import * as SecureStore from 'expo-secure-store';

const INSTALLATION_ID_KEY = 'notifications.installationId';

let installationIdCache: string | null = null;

export async function getNotificationInstallationId(): Promise<string> {
  if (installationIdCache) return installationIdCache;

  const stored = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (stored) {
    installationIdCache = stored;
    return stored;
  }

  const installationId = createInstallationId();
  installationIdCache = installationId;
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

function createInstallationId(): string {
  const randomPart = Math.random().toString(36).slice(2);
  return `finviet-${Date.now().toString(36)}-${randomPart}`;
}
