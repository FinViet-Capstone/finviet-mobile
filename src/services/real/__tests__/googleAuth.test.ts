import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getFirebaseIdTokenFromGoogle } from '@/lib/googleAuth';
import { setAuthTokens } from '@/lib/mmkv';
import { googleOAuth } from '@/services/real/auth';
import { AuthError } from '@/types/auth';

jest.mock('@/lib/googleAuth', () => ({ getFirebaseIdTokenFromGoogle: jest.fn() }));
jest.mock('@/lib/mmkv', () => ({
  setAuthTokens: jest.fn(), getAccessToken: jest.fn(), getRefreshToken: jest.fn(),
}));
jest.mock('@/lib/notificationPrefsCache', () => ({ getNotificationPrefs: jest.fn().mockResolvedValue({}) }));

describe('real Google login', () => {
  const mock = new AxiosMockAdapter(api);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getFirebaseIdTokenFromGoogle).mockResolvedValue('firebase-id-token');
  });
  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it.each(['login', 'register'] as const)('exchanges Firebase token and persists backend session for %s', async (mode) => {
    mock.onPost('/auth/google-login', { idToken: 'firebase-id-token' }).reply(200, {
      success: true, data: {
        accessToken: 'api-access', refreshToken: 'api-refresh', accessTokenExpiry: '2030-01-01',
        profile: { customerId: 'c1', email: 'user@example.com', fullName: 'User', isActive: true, isEmailVerified: true },
      },
    });
    const customer = await googleOAuth(mode);
    expect(customer.id).toBe('c1');
    expect(setAuthTokens).toHaveBeenCalledWith({
      accessToken: 'api-access', refreshToken: 'api-refresh', accessTokenExpiry: '2030-01-01',
    });
  });

  it('does not call the backend when the user cancels', async () => {
    jest.mocked(getFirebaseIdTokenFromGoogle).mockRejectedValue(new AuthError('oauth_cancelled'));
    await expect(googleOAuth('login')).rejects.toMatchObject({ code: 'oauth_cancelled' });
    expect(mock.history.post).toHaveLength(0);
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it.each([401, 403, 503])('does not save a session on backend error %d', async (status) => {
    mock.onPost('/auth/google-login').reply(status, { success: false, message: 'Unavailable' });
    await expect(googleOAuth('login')).rejects.toBeInstanceOf(AuthError);
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it('rejects malformed success responses without creating a tokenless session', async () => {
    mock.onPost('/auth/google-login').reply(200, { success: true, data: {} });
    await expect(googleOAuth('login')).rejects.toMatchObject({ code: 'oauth_failed' });
    expect(setAuthTokens).not.toHaveBeenCalled();
  });
});
