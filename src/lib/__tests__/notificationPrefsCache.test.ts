/**
 * Unit tests for the device-local notification-toggle cache
 * (src/lib/notificationPrefsCache.ts). expo-secure-store is mocked with a real
 * in-memory store so the read-modify-write sequencing is actually exercised.
 */

import * as SecureStore from 'expo-secure-store';
import { getNotificationPrefs, setNotificationPrefs } from '@/lib/notificationPrefsCache';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const CUSTOMER_ID = 'customer-1';

/** Backs the mocked SecureStore with a plain object, optionally slowing reads. */
function useInMemoryStore(readDelayMs = 0) {
  const store: Record<string, string> = {};
  mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
    if (readDelayMs > 0) await new Promise((r) => setTimeout(r, readDelayMs));
    return store[key] ?? null;
  });
  mockedSecureStore.setItemAsync.mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  return store;
}

describe('notificationPrefsCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults every toggle to on when nothing was ever saved', async () => {
    useInMemoryStore();
    await expect(getNotificationPrefs(CUSTOMER_ID)).resolves.toEqual({
      budget: true,
      report: true,
      goals: true,
    });
  });

  it('merges a partial patch onto the saved prefs', async () => {
    useInMemoryStore();
    await setNotificationPrefs(CUSTOMER_ID, { report: false });
    await expect(getNotificationPrefs(CUSTOMER_ID)).resolves.toEqual({
      budget: true,
      report: false,
      goals: true,
    });
  });

  it('keeps every key when writes are issued concurrently', async () => {
    // Regression: the writes used to read-modify-write in parallel, so the last
    // one to settle clobbered the other two — the master switch only ever moved
    // one of the three toggles.
    useInMemoryStore(5);
    await Promise.all([
      setNotificationPrefs(CUSTOMER_ID, { budget: false }),
      setNotificationPrefs(CUSTOMER_ID, { report: false }),
      setNotificationPrefs(CUSTOMER_ID, { goals: false }),
    ]);
    await expect(getNotificationPrefs(CUSTOMER_ID)).resolves.toEqual({
      budget: false,
      report: false,
      goals: false,
    });
  });

  it('keeps the write queue usable after a failed write', async () => {
    useInMemoryStore();
    mockedSecureStore.setItemAsync.mockRejectedValueOnce(new Error('secure store unavailable'));

    await expect(setNotificationPrefs(CUSTOMER_ID, { budget: false })).rejects.toThrow();
    await expect(setNotificationPrefs(CUSTOMER_ID, { goals: false })).resolves.toEqual({
      budget: true,
      report: true,
      goals: false,
    });
  });

  it('scopes prefs per customer', async () => {
    useInMemoryStore();
    await setNotificationPrefs(CUSTOMER_ID, { budget: false });
    await expect(getNotificationPrefs('customer-2')).resolves.toEqual({
      budget: true,
      report: true,
      goals: true,
    });
  });
});
