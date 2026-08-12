/**
 * Unit tests for src/lib/api.ts — the request auth-header interceptor and the
 * single-flight 401 refresh-rotation response interceptor.
 *
 * @/lib/mmkv and @/stores/authStore are mocked so token state is controlled
 * directly rather than going through SecureStore. Two MockAdapter instances
 * are needed: one on `api` (the interceptor-wrapped instance under test) and
 * one on the bare `axios` export, since refreshAccessToken() deliberately
 * calls bare axios to avoid re-entering api's own interceptor.
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { api, unwrap } from '@/lib/api';
import { getAccessToken, getRefreshToken, setAuthTokens, clearAuthTokens } from '@/lib/mmkv';
import { useAuthStore } from '@/stores/authStore';

jest.mock('@/lib/mmkv', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  setAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: jest.fn(() => ({ clearSession: jest.fn() })) },
}));

const mockedGetAccessToken = getAccessToken as jest.Mock;
const mockedGetRefreshToken = getRefreshToken as jest.Mock;
const mockedSetAuthTokens = setAuthTokens as jest.Mock;
const mockedClearAuthTokens = clearAuthTokens as jest.Mock;
const mockedClearSession = jest.fn();

let apiMock: MockAdapter;
let bareAxiosMock: MockAdapter;

// Mirror mmkv.ts's real in-memory-cache behavior: setAuthTokens() must be
// reflected by later getAccessToken()/getRefreshToken() calls, since the
// response interceptor's retry re-enters the request interceptor, which
// reads the (now refreshed) token straight from these mocks.
let currentAccessToken: string | undefined;
let currentRefreshToken: string | undefined;

function setTokens(access: string | undefined, refresh: string | undefined) {
  currentAccessToken = access;
  currentRefreshToken = refresh;
}

beforeEach(() => {
  apiMock = new MockAdapter(api);
  bareAxiosMock = new MockAdapter(axios);
  jest.clearAllMocks();
  currentAccessToken = undefined;
  currentRefreshToken = undefined;
  mockedGetAccessToken.mockImplementation(() => currentAccessToken);
  mockedGetRefreshToken.mockImplementation(() => currentRefreshToken);
  mockedSetAuthTokens.mockImplementation(
    (tokens: { accessToken: string; refreshToken: string }) => {
      currentAccessToken = tokens.accessToken;
      currentRefreshToken = tokens.refreshToken;
    },
  );
  (useAuthStore.getState as jest.Mock).mockReturnValue({ clearSession: mockedClearSession });
});

afterEach(() => {
  apiMock.restore();
  bareAxiosMock.restore();
});

describe('request interceptor — auth header', () => {
  it('attaches Authorization when an access token is set', async () => {
    setTokens('token-123', undefined);
    apiMock.onGet('/wallets').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer token-123');
      return [200, { success: true, data: [] }];
    });

    await api.get('/wallets');
  });

  it('omits Authorization when there is no access token', async () => {
    setTokens(undefined, undefined);
    apiMock.onGet('/wallets').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { success: true, data: [] }];
    });

    await api.get('/wallets');
  });
});

describe('unwrap', () => {
  it('extracts the typed data field from a success envelope', async () => {
    setTokens('token-123', undefined);
    apiMock.onGet('/wallets').reply(200, { success: true, data: [{ id: 'w1' }] });

    const res = await api.get('/wallets');
    expect(unwrap(res)).toEqual([{ id: 'w1' }]);
  });
});

describe('response interceptor — 401 refresh rotation', () => {
  it('refreshes the token and retries the original request on 401', async () => {
    setTokens('expired-token', 'refresh-token-1');

    let walletsAttempt = 0;
    apiMock.onGet('/wallets').reply((config) => {
      walletsAttempt += 1;
      if (walletsAttempt === 1) {
        expect(config.headers?.Authorization).toBe('Bearer expired-token');
        return [401, { success: false, message: 'Unauthorized' }];
      }
      expect(config.headers?.Authorization).toBe('Bearer new-access-token');
      return [200, { success: true, data: ['ok'] }];
    });

    bareAxiosMock.onPost(/\/auth\/refresh-token$/).reply(200, {
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiry: '2026-12-01T00:00:00Z',
      },
    });

    const res = await api.get('/wallets');

    expect(unwrap(res)).toEqual(['ok']);
    expect(walletsAttempt).toBe(2);
    expect(mockedSetAuthTokens).toHaveBeenCalledWith({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      accessTokenExpiry: '2026-12-01T00:00:00Z',
    });
  });

  it('does not attempt refresh for a 401 on an /auth/ endpoint', async () => {
    setTokens('some-token', 'refresh-token-1');
    apiMock.onPost('/auth/login').reply(401, { success: false, message: 'Invalid credentials' });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(bareAxiosMock.history.post.length).toBe(0);
  });

  it('does not attempt refresh when there is no refresh token', async () => {
    setTokens('some-token', undefined);
    apiMock.onGet('/wallets').reply(401, { success: false, message: 'Unauthorized' });

    await expect(api.get('/wallets')).rejects.toMatchObject({ response: { status: 401 } });
    expect(bareAxiosMock.history.post.length).toBe(0);
  });

  it('clears tokens and session when the refresh call itself fails', async () => {
    setTokens('expired-token', 'refresh-token-1');
    apiMock.onGet('/wallets').reply(401, { success: false, message: 'Unauthorized' });
    bareAxiosMock.onPost(/\/auth\/refresh-token$/).reply(401, { success: false });

    await expect(api.get('/wallets')).rejects.toBeDefined();

    expect(mockedClearAuthTokens).toHaveBeenCalled();
    expect(mockedClearSession).toHaveBeenCalled();
  });

  it('single-flights concurrent 401s into one refresh call', async () => {
    setTokens('expired-token', 'refresh-token-1');

    apiMock.onGet('/wallets').reply((config) => {
      if (config.headers?.Authorization === 'Bearer expired-token') {
        return [401, { success: false }];
      }
      return [200, { success: true, data: 'wallets-ok' }];
    });
    apiMock.onGet('/budgets').reply((config) => {
      if (config.headers?.Authorization === 'Bearer expired-token') {
        return [401, { success: false }];
      }
      return [200, { success: true, data: 'budgets-ok' }];
    });

    let refreshCalls = 0;
    bareAxiosMock.onPost(/\/auth\/refresh-token$/).reply(() => {
      refreshCalls += 1;
      return [
        200,
        {
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            accessTokenExpiry: '2026-12-01T00:00:00Z',
          },
        },
      ];
    });

    const [walletsRes, budgetsRes] = await Promise.all([
      api.get('/wallets'),
      api.get('/budgets'),
    ]);

    expect(unwrap(walletsRes)).toBe('wallets-ok');
    expect(unwrap(budgetsRes)).toBe('budgets-ok');
    expect(refreshCalls).toBe(1);
  });
});
