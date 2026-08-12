/**
 * Unit tests for the secure token storage layer (src/lib/mmkv.ts).
 * expo-secure-store is mocked; the module's in-memory cache is real.
 */

import * as SecureStore from 'expo-secure-store';
import {
  hydrateTokenCache,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
} from '@/lib/mmkv';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('mmkv (secure token storage)', () => {
  beforeEach(() => {
    clearAuthTokens();
    jest.clearAllMocks();
  });

  describe('getAccessToken / getRefreshToken', () => {
    it('return undefined before any token is set', () => {
      expect(getAccessToken()).toBeUndefined();
      expect(getRefreshToken()).toBeUndefined();
    });
  });

  describe('setAuthTokens', () => {
    it('updates the in-memory cache synchronously', () => {
      setAuthTokens({
        accessToken: 'a1',
        refreshToken: 'r1',
        accessTokenExpiry: '2026-01-01T00:00:00Z',
      });
      expect(getAccessToken()).toBe('a1');
      expect(getRefreshToken()).toBe('r1');
    });

    it('persists every provided field to SecureStore', () => {
      setAuthTokens({
        accessToken: 'a1',
        refreshToken: 'r1',
        accessTokenExpiry: '2026-01-01T00:00:00Z',
      });
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('auth.accessToken', 'a1');
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('auth.refreshToken', 'r1');
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth.accessTokenExpiry',
        '2026-01-01T00:00:00Z',
      );
    });

    it('skips persisting accessTokenExpiry when omitted', () => {
      setAuthTokens({ accessToken: 'a1', refreshToken: 'r1' });
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearAuthTokens', () => {
    it('clears the in-memory cache', () => {
      setAuthTokens({ accessToken: 'a1', refreshToken: 'r1' });
      clearAuthTokens();
      expect(getAccessToken()).toBeUndefined();
      expect(getRefreshToken()).toBeUndefined();
    });

    it('removes all three keys from SecureStore', () => {
      clearAuthTokens();
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.accessToken');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.refreshToken');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.accessTokenExpiry');
    });
  });

  describe('hydrateTokenCache', () => {
    it('populates the cache from SecureStore', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'auth.accessToken') return 'stored-access';
        if (key === 'auth.refreshToken') return 'stored-refresh';
        return null;
      });

      await hydrateTokenCache();

      expect(getAccessToken()).toBe('stored-access');
      expect(getRefreshToken()).toBe('stored-refresh');
    });

    it('leaves keys unset when SecureStore has nothing stored', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      await hydrateTokenCache();

      expect(getAccessToken()).toBeUndefined();
      expect(getRefreshToken()).toBeUndefined();
    });
  });
});
