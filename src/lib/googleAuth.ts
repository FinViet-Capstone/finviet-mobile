/**
 * googleAuth.ts — native Google Sign-In → Firebase ID token.
 *
 * The backend's `POST /auth/google-login` verifies a **Firebase** ID token
 * through Firebase Admin (`FirebaseAuthService.VerifyIdTokenAsync`), but the
 * native Google flow hands back a **Google** ID token — a different issuer,
 * which Firebase Admin rejects. Firebase's identitytoolkit REST endpoint is
 * what converts one into the other; calling it directly keeps the whole
 * @react-native-firebase SDK (google-services.json + the google-services
 * gradle plugin) out of the build for the single call we actually need.
 *
 * Android needs no `google-services.json`: `webClientId` below is what tells
 * Google Play services which OAuth client to mint the ID token for. The app's
 * package name + signing SHA-1 must still be registered as an **Android**
 * OAuth client in the same Firebase project, otherwise the native call fails
 * with DEVELOPER_ERROR (code 10) — see `.env.example`.
 *
 * Native module, so it runs only in a dev/production build, never Expo Go.
 */

import axios, { isAxiosError } from 'axios';
import { FIREBASE_API_KEY, GOOGLE_WEB_CLIENT_ID } from '@/lib/env';
import { isGoogleSignInAvailable } from '@/lib/nativeModuleAvailability';
import { AuthError } from '@/types/auth';

/** Typed without importing: `typeof import` is erased at compile time. */
type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let nativeModule: GoogleSignInModule | null = null;

/**
 * Loaded on first use, never at import time — the services barrel pulls this
 * file in transitively, so a static import would take the **whole app** down on
 * startup wherever the native module is missing, not just this one flow.
 *
 * The availability probe is not belt-and-braces: `require` alone is not safe to
 * try/catch here. The package calls `getEnforcing` in its own module factory,
 * and Metro's dev-mode `guardedLoadModule` hands a throwing factory to
 * `ErrorUtils.reportFatalError` — a redbox — then returns `undefined`, so the
 * throw never reaches this catch. Verified on the emulator under Expo Go.
 */
function loadNativeModule(): GoogleSignInModule {
  if (nativeModule) return nativeModule;
  if (!isGoogleSignInAvailable()) {
    throw new AuthError(
      // `unknown` on purpose, not `oauth_failed`: AuthErrorBanner renders the
      // curated copy for a known code and only shows a custom message under
      // `unknown` — and here the specific message *is* the point. Same
      // convention the previous stub used. Applies to every actionable case
      // below too.
      'unknown',
      'Đăng nhập Google cần bản build riêng của ứng dụng (không chạy được trong Expo Go).',
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  return nativeModule;
}

/** Firebase "sign in with an identity provider's token" REST endpoint. */
const SIGN_IN_WITH_IDP_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp';

/**
 * Android's DEVELOPER_ERROR. Not in `statusCodes`, but it is the failure a
 * misconfigured SHA-1 / package name produces, so it earns its own message.
 */
const ANDROID_DEVELOPER_ERROR = '10';

let isConfigured = false;

/** `configure` is synchronous and idempotent, but there's no reason to repeat it. */
function ensureConfigured(): void {
  if (isConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID || !FIREBASE_API_KEY) {
    throw new AuthError(
      'unknown',
      'Đăng nhập Google chưa được cấu hình trong bản build này. Vui lòng dùng email và mật khẩu.',
    );
  }
  const { GoogleSignin } = loadNativeModule();
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['email', 'profile'],
    // No server-side Google API access is needed — the backend only verifies
    // the identity token, it never calls Google on the customer's behalf.
    offlineAccess: false,
  });
  isConfigured = true;
}

/** Native error → the typed AuthError the auth screen's banner already renders. */
function toNativeAuthError(err: unknown): AuthError {
  if (err instanceof AuthError) return err;
  const { isErrorWithCode, statusCodes } = loadNativeModule();
  if (!isErrorWithCode(err)) return new AuthError('oauth_failed');

  switch (err.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return new AuthError('oauth_cancelled');
    case statusCodes.IN_PROGRESS:
      return new AuthError('unknown', 'Đang có một phiên đăng nhập Google khác.');
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return new AuthError(
        'unknown',
        'Thiết bị thiếu Google Play Services hoặc cần cập nhật.',
      );
    case ANDROID_DEVELOPER_ERROR:
      return new AuthError(
        'unknown',
        'Cấu hình Google Sign-In chưa đúng (SHA-1 / package name). Vui lòng liên hệ hỗ trợ.',
      );
    default:
      return new AuthError('oauth_failed');
  }
}

/** Opens the native account picker and returns Google's own ID token. */
async function getGoogleIdToken(): Promise<string> {
  ensureConfigured();
  const { GoogleSignin, isSuccessResponse } = loadNativeModule();
  try {
    // Android only (a no-op on iOS): prompts to fix Play Services rather than
    // failing opaquely further down.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new AuthError('oauth_cancelled');
    const { idToken } = response.data;
    if (!idToken) {
      throw new AuthError(
        'oauth_failed',
        'Google không trả về mã định danh. Hãy thử lại.',
      );
    }
    return idToken;
  } catch (err) {
    throw toNativeAuthError(err);
  }
}

/** Firebase's response; only the minted Firebase ID token matters here. */
interface SignInWithIdpResponse {
  idToken?: string;
}

/** Trades Google's ID token for the Firebase one the backend can verify. */
async function exchangeForFirebaseIdToken(googleIdToken: string): Promise<string> {
  try {
    const res = await axios.post<SignInWithIdpResponse>(
      SIGN_IN_WITH_IDP_URL,
      {
        postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
        // Required by the endpoint, unused for a native client — there is no
        // browser redirect in this flow.
        requestUri: 'http://localhost',
        returnSecureToken: true,
      },
      { params: { key: FIREBASE_API_KEY }, timeout: 20_000 },
    );
    const idToken = res.data?.idToken;
    if (!idToken) {
      throw new AuthError('oauth_failed', 'Firebase không cấp được phiên đăng nhập.');
    }
    return idToken;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (isAxiosError(err) && !err.response) {
      throw new AuthError('network_error');
    }
    // Firebase names the real reason (API key restrictions, OPERATION_NOT_ALLOWED,
    // INVALID_IDP_RESPONSE, …) and it never reaches the user's banner, so surface
    // it to the dev log — this exchange failing is otherwise indistinguishable
    // from a backend rejection.
    if (__DEV__ && isAxiosError(err)) {
      console.warn(
        '[googleAuth] signInWithIdp failed',
        err.response?.status,
        JSON.stringify(err.response?.data),
      );
    }
    throw new AuthError('oauth_failed');
  }
}

/**
 * Runs the whole native flow and returns a Firebase ID token ready for
 * `POST /auth/google-login`. Throws a typed AuthError on cancellation or
 * failure — never a raw native error.
 */
export async function getFirebaseIdTokenFromGoogle(): Promise<string> {
  const googleIdToken = await getGoogleIdToken();
  return await exchangeForFirebaseIdToken(googleIdToken);
}

/**
 * Best-effort: drops the cached Google account so the next sign-in shows the
 * picker instead of silently reusing whoever signed in last. Called from
 * `logout()`; a failure here must never keep the customer signed in.
 */
export async function signOutFromGoogle(): Promise<void> {
  // Never configured → nothing cached, and in Expo Go there is no module to load.
  if (!isConfigured || !nativeModule) return;
  try {
    await nativeModule.GoogleSignin.signOut();
  } catch {
    // Nothing actionable — the FinViet session is cleared either way.
  }
}
