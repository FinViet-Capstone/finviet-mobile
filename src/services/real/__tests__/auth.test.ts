import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getFirebaseIdTokenFromGoogle } from '@/lib/googleAuth';
import { setAuthTokens } from '@/lib/mmkv';
import { googleOAuth, getProfile, register, updateProfileSettings } from '@/services/real/auth';
import { AuthError } from '@/types/auth';

// Token storage is SecureStore-backed; stubbed so the session write is
// observable and nothing touches the device keychain under test.
jest.mock('@/lib/mmkv', () => ({
  setAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn(),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
}));

// Google sign-in reaches the backend as an opaque Firebase ID token; the native
// half that produces it is covered in src/lib/__tests__/googleAuth.test.ts.
jest.mock('@/lib/googleAuth', () => ({
  getFirebaseIdTokenFromGoogle: jest.fn(),
  signOutFromGoogle: jest.fn().mockResolvedValue(undefined),
}));

// One adapter for the whole file: axios-mock-adapter patches the shared `api`
// instance, so a second one created per describe would detach the first.
const mock = new AxiosMockAdapter(api);
afterEach(() => mock.reset());
afterAll(() => mock.restore());

// Backend AppTheme has no JsonStringEnumConverter registered, so it serializes
// as a raw integer on the wire (0 Light, 1 Dark, 2 System) in both directions.
describe('real auth service — theme enum mapping', () => {
  it('sends theme as an integer, not a string, on save', async () => {
    mock.onPut('/profile/settings').reply(200, { success: true, data: {} });

    await updateProfileSettings({ theme: 'dark' });

    expect(JSON.parse(mock.history.put[0].data)).toEqual({ theme: 1 });
  });

  it.each([
    [0, 'light'],
    [1, 'dark'],
    [2, 'system'],
  ])('maps raw theme %d from GET /profile to %s', async (raw, expected) => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        customerId: 'c1',
        fullName: 'Test User',
        email: 'test@example.com',
        isEmailVerified: true,
        isActive: true,
        theme: raw,
      },
    });

    const customer = await getProfile();
    expect(customer.theme).toBe(expected);
  });

  it('falls back to system when the backend sends no theme at all', async () => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        customerId: 'c1',
        fullName: 'Test User',
        email: 'test@example.com',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const customer = await getProfile();
    expect(customer.theme).toBe('system');
  });
});

describe('real auth service — googleOAuth', () => {
  const getToken = getFirebaseIdTokenFromGoogle as jest.Mock;

  const profile = {
    customerId: 'c1',
    fullName: 'Google User',
    email: 'gu@example.com',
    isEmailVerified: true,
    isActive: true,
    monthlyIncomeExpected: 12_000_000,
  };

  beforeEach(() => getToken.mockResolvedValue('firebase-id-token'));
  afterEach(() => getToken.mockReset());

  it('posts the Firebase ID token and opens a session from the response', async () => {
    mock.onPost('/auth/google-login').reply(200, {
      success: true,
      data: {
        accessToken: 'access',
        refreshToken: 'refresh',
        accessTokenExpiry: '2026-01-01T00:00:00Z',
        profile,
      },
    });

    const customer = await googleOAuth('login');

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ idToken: 'firebase-id-token' });
    expect(customer.email).toBe('gu@example.com');
    expect(setAuthTokens).toHaveBeenCalledWith({
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiry: '2026-01-01T00:00:00Z',
    });
  });

  it('sends the same request in register mode — the backend creates the account itself', async () => {
    mock.onPost('/auth/google-login').reply(200, {
      success: true,
      data: { accessToken: 'a', refreshToken: 'r', accessTokenExpiry: 'e', profile },
    });

    await googleOAuth('register');

    expect(mock.history.post).toHaveLength(1);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ idToken: 'firebase-id-token' });
  });

  it('never calls the backend when the customer dismisses the picker', async () => {
    getToken.mockRejectedValue(new AuthError('oauth_cancelled'));

    await expect(googleOAuth('login')).rejects.toMatchObject({ code: 'oauth_cancelled' });
    expect(mock.history.post).toHaveLength(0);
  });

  it.each([
    // Firebase Admin rejected the token — including the case where the backend
    // has no service-account credentials configured at all.
    [401, 'oauth_failed'],
    [400, 'oauth_failed'],
    [403, 'account_locked'],
  ])('maps a %d from the backend to %s', async (status, code) => {
    mock.onPost('/auth/google-login').reply(status, { success: false, message: 'nope' });

    await expect(googleOAuth('login')).rejects.toMatchObject({ code });
  });
});

// Register commits the account server-side before the slow verification-email
// step, so a dropped connection or a retry must map to codes the screen can
// recover from (see isRegistrationResumable).
describe('real auth service - register failure contract', () => {
  const input = { displayName: 'a', email: 'a@example.com', password: 'Passw0rd1' };

  it('maps a dropped connection (no HTTP response) to network_error', async () => {
    mock.onPost('/auth/register').networkError();

    await expect(register(input)).rejects.toMatchObject({ code: 'network_error' });
  });

  it('maps a retry against the already-created account (409) to email_in_use', async () => {
    mock.onPost('/auth/register').reply(409, { success: false, message: 'Email already registered' });

    await expect(register(input)).rejects.toMatchObject({ code: 'email_in_use' });
  });

  it('maps a 200 "could not be sent" (account saved, email timed out) to verification_email_failed', async () => {
    mock.onPost('/auth/register').reply(200, {
      success: true,
      data: 'Account created but verification email could not be sent.',
    });

    await expect(register(input)).rejects.toMatchObject({ code: 'verification_email_failed' });
  });
});
