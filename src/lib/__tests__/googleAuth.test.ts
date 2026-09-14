/**
 * Covers the two halves of the native sign-in flow that can't be checked on a
 * simulator: that Google's ID token really is exchanged for a *Firebase* one
 * before it reaches the backend (the backend rejects Google's own token), and
 * that every native outcome arrives as a typed AuthError rather than a raw
 * native rejection the auth screen's banner can't render.
 */

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getFirebaseIdTokenFromGoogle, signOutFromGoogle } from '@/lib/googleAuth';
import { isGoogleSignInAvailable } from '@/lib/nativeModuleAvailability';
import { isAuthError } from '@/types/auth';

jest.mock('@/lib/env', () => ({
  API_BASE_URL: 'http://test.local/api',
  SENTRY_DSN: '',
  GOOGLE_WEB_CLIENT_ID: 'web-client-id.apps.googleusercontent.com',
  FIREBASE_API_KEY: 'firebase-api-key',
}));

const SIGN_IN_WITH_IDP_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp';

const signIn = GoogleSignin.signIn as jest.Mock;
const hasPlayServices = GoogleSignin.hasPlayServices as jest.Mock;
const originalIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
beforeAll(() => { process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client.apps.googleusercontent.com'; });
afterAll(() => {
  if (originalIosClientId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalIosClientId;
});

/** The native module rejects with a plain Error carrying a `code` string. */
function nativeError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

function googleSignInSucceeds(idToken: string | null = 'google-id-token') {
  signIn.mockResolvedValue({ type: 'success', data: { idToken } });
}

/** Asserts the call rejects with an AuthError carrying `code`. */
async function expectAuthErrorCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toThrow();
  await promise.catch((err) => {
    expect(isAuthError(err)).toBe(true);
    expect(isAuthError(err) && err.code).toBe(code);
  });
}

/**
 * Regression, and it must stay the FIRST describe in this file: the module
 * caches the package handle after a successful load, so the missing-module
 * branch is only reachable before any other test has gone through it.
 *
 * The first version of `loadNativeModule` try/caught `require` instead of
 * probing first. On the emulator that produced a full-screen redbox — Metro's
 * dev `guardedLoadModule` hands a throwing module factory to
 * `ErrorUtils.reportFatalError` and returns undefined, so the catch never ran.
 */
describe('googleAuth — native module missing (Expo Go)', () => {
  it('fails with a build-specific message and never touches the package', async () => {
    (isGoogleSignInAvailable as jest.Mock).mockReturnValueOnce(false);

    const err = await getFirebaseIdTokenFromGoogle().catch((e: unknown) => e);

    expect(isAuthError(err) && err.code).toBe('unknown');
    expect((err as Error).message).toContain('Expo Go');
    expect(GoogleSignin.configure).not.toHaveBeenCalled();
  });
});

describe('googleAuth — Google ID token → Firebase ID token', () => {
  const mock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    hasPlayServices.mockResolvedValue(true);
    signIn.mockReset();
  });
  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('exchanges the Google token through identitytoolkit and returns the Firebase one', async () => {
    googleSignInSucceeds('google-id-token');
    mock.onPost(SIGN_IN_WITH_IDP_URL).reply(200, { idToken: 'firebase-id-token' });

    await expect(getFirebaseIdTokenFromGoogle()).resolves.toBe('firebase-id-token');

    const request = mock.history.post[0];
    expect(request.params).toEqual({ key: 'firebase-api-key' });
    expect(JSON.parse(request.data).postBody).toBe(
      'id_token=google-id-token&providerId=google.com',
    );
  });

  it('configures the native module with the web client ID', async () => {
    googleSignInSucceeds();
    mock.onPost(SIGN_IN_WITH_IDP_URL).reply(200, { idToken: 'firebase-id-token' });

    await getFirebaseIdTokenFromGoogle();

    expect(GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        webClientId: 'web-client-id.apps.googleusercontent.com',
        iosClientId: 'ios-client.apps.googleusercontent.com',
      }),
    );
  });

  it.each([
    { needConfirmation: true, idToken: 'unconfirmed-token' },
    { idToken: 123 },
    {},
  ])('rejects invalid or unconfirmed Firebase response %j', async (data) => {
    googleSignInSucceeds();
    mock.onPost(SIGN_IN_WITH_IDP_URL).reply(200, data);
    await expect(getFirebaseIdTokenFromGoogle()).rejects.toMatchObject({ code: 'oauth_failed' });
  });

  it('reports a dismissed account picker as oauth_cancelled, not a failure', async () => {
    signIn.mockResolvedValue({ type: 'cancelled' });

    await expectAuthErrorCode(getFirebaseIdTokenFromGoogle(), 'oauth_cancelled');
    expect(mock.history.post).toHaveLength(0);
  });

  it('also maps the legacy thrown SIGN_IN_CANCELLED to oauth_cancelled', async () => {
    // Older native versions reject instead of resolving `{ type: 'cancelled' }`.
    signIn.mockRejectedValue(nativeError(statusCodes.SIGN_IN_CANCELLED));

    await expectAuthErrorCode(getFirebaseIdTokenFromGoogle(), 'oauth_cancelled');
  });

  it.each([
    [statusCodes.PLAY_SERVICES_NOT_AVAILABLE, 'Google Play Services'],
    // Android's DEVELOPER_ERROR: the build's SHA-1 / package name is not
    // registered on the Firebase app. Worth naming — it is the failure a
    // fresh machine or a new keystore hits first.
    ['10', 'SHA-1'],
  ])('turns native %s into an actionable message the banner will render', async (code, hint) => {
    signIn.mockRejectedValue(nativeError(code));

    const err = await getFirebaseIdTokenFromGoogle().catch((e) => e);
    // 'unknown' is what AuthErrorBanner shows a custom message for.
    expect(isAuthError(err) && err.code).toBe('unknown');
    expect((err as Error).message).toContain(hint);
  });

  it('fails cleanly when Google returns no ID token', async () => {
    googleSignInSucceeds(null);

    await expectAuthErrorCode(getFirebaseIdTokenFromGoogle(), 'oauth_failed');
    expect(mock.history.post).toHaveLength(0);
  });

  it('surfaces a rejected exchange as oauth_failed', async () => {
    googleSignInSucceeds();
    mock.onPost(SIGN_IN_WITH_IDP_URL).reply(400, { error: { message: 'INVALID_IDP_RESPONSE' } });

    await expectAuthErrorCode(getFirebaseIdTokenFromGoogle(), 'oauth_failed');
  });

  it('distinguishes an unreachable network from a rejected token', async () => {
    googleSignInSucceeds();
    mock.onPost(SIGN_IN_WITH_IDP_URL).networkError();

    await expectAuthErrorCode(getFirebaseIdTokenFromGoogle(), 'network_error');
  });

  it('signs out of Google without throwing when the native call fails', async () => {
    (GoogleSignin.signOut as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(signOutFromGoogle()).resolves.toBeUndefined();
  });
});
