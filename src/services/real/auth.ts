/**
 * real/auth.ts — real .NET auth service (email/password).
 *
 * Mirrors the signatures of src/services/mock/auth.ts so the barrel
 * (src/services/index.ts) can swap mock ⇄ real with zero hook/screen changes.
 *
 * The backend has no machine-readable error code — only HTTP status + a message
 * string (see ApiResponse / ExceptionHandlingMiddleware). We map those onto the
 * FE AuthErrorCode union so AuthErrorBanner renders consistent Vietnamese copy.
 *
 * Endpoints with no backend equivalent (changePassword, googleOAuth) re-export
 * the mock so the swap stays whole.
 */

import axios from 'axios';
import { api, unwrap, type AuthResponsePayload } from '@/lib/api';
import { setAuthTokens } from '@/lib/mmkv';
import { AuthError, type AuthErrorCode } from '@/types/auth';
import type { Customer } from '@/types';
import type {
  MockLoginInput,
  MockRegisterInput,
  UpdateProfileInput,
  ResetPasswordInput,
} from '@/services/mock/auth';

// changePassword has no .NET endpoint yet — keep it on the mock.
export { changePassword } from '@/services/mock/auth';

/**
 * Google sign-in is NOT mocked in real mode. The backend (`POST /auth/google-login`)
 * verifies a **Firebase ID token** via Firebase Admin — obtaining one needs Firebase +
 * Google OAuth client config and a custom dev build (it cannot run inside Expo Go).
 *
 * Until that's wired we fail loudly here instead of minting a tokenless "demo" session,
 * which is what caused every protected screen (wallets/budgets/entry) to 401. Use
 * email/password against the real backend instead (e.g. the seeded demo@finviet.local).
 */
export async function googleOAuth(_mode: 'login' | 'register'): Promise<never> {
  throw new AuthError(
    'unknown',
    'Đăng nhập Google chưa khả dụng ở bản kết nối backend. Vui lòng dùng email và mật khẩu.',
  );
}

// ─── error mapping ────────────────────────────────────────────────────────────

interface AxiosErrorLike {
  response?: {
    status?: number;
    data?: {
      message?: string | null;
      errors?: Record<string, string[]> | null;
    };
  };
  request?: unknown;
}

/**
 * Collapse an axios failure into a typed AuthError. `match` lets each caller add
 * status/message-specific codes (the backend gives no code field).
 */
function toAuthError(
  err: unknown,
  match?: (status: number, message: string) => AuthErrorCode | undefined,
): AuthError {
  if (!axios.isAxiosError(err)) {
    return new AuthError('unknown');
  }
  const e = err as AxiosErrorLike;
  // No HTTP response → request never reached the server.
  if (!e.response) return new AuthError('network_error');

  const status = e.response.status ?? 0;
  const message = (e.response.data?.message ?? '').toLowerCase();
  const errors = e.response.data?.errors ?? undefined;

  if (status === 429) return new AuthError('rate_limited');

  // FluentValidation 400s put the detail in `errors` (message is just
  // "Validation failed."). Surface a password-policy failure meaningfully
  // instead of the generic "unknown".
  if (status === 400 && errors && Object.keys(errors).some((k) => /password/i.test(k))) {
    return new AuthError('weak_password');
  }

  const matched = match?.(status, message);
  if (matched) return new AuthError(matched, e.response.data?.message ?? undefined);

  return new AuthError('unknown', e.response.data?.message ?? undefined);
}

// ─── profile → Customer mapper ────────────────────────────────────────────────

function toCustomer(p: AuthResponsePayload['profile']): Customer {
  const monthlyIncome = p.monthlyIncomeExpected ?? null;
  return {
    id: p.customerId,
    email: p.email,
    passwordHash: null,
    googleId: null,
    displayName: p.fullName,
    avatarUrl: p.avatarUrl ?? null,
    gender: null,
    dateOfBirth: null,
    monthlyIncome,
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
    defaultCurrency: 'VND',
    language: 'vi',
    theme: 'system',
    isActive: p.isActive,
    emailVerified: p.isEmailVerified,
    notifications: { budget: true, report: true, goals: true },
    fcmToken: null,
    // ProfileDto carries no onboarding flag; monthly income is the only signal
    // available at login time (see plan / docs). Replaced once GET /me lands.
    onboardingDone: monthlyIncome != null,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── profile (session rehydrate) ──────────────────────────────────────────────

/**
 * GET /api/profile — used to rehydrate the session on app launch from a stored
 * token. The Axios interceptor attaches the token and handles 401 → refresh.
 */
export async function getProfile(): Promise<Customer> {
  const res = await api.get('/profile');
  return toCustomer(unwrap<AuthResponsePayload['profile']>(res));
}

// ─── update profile (onboarding / settings) ───────────────────────────────────

// Backend Gender enum is serialized as an integer (0 Male, 1 Female, 2 Other).
const GENDER_TO_INT: Record<'male' | 'female' | 'other', number> = {
  male: 0,
  female: 1,
  other: 2,
};

/** PUT /api/profile — persist name, expected income, gender and date of birth. */
export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  await api.put('/profile', {
    fullName: input.fullName,
    monthlyIncomeExpected: input.monthlyIncomeExpected ?? null,
    gender: input.gender ? GENDER_TO_INT[input.gender] : null,
    dateOfBirth: input.dateOfBirth ?? null,
  });
}

// ─── login ────────────────────────────────────────────────────────────────────

export async function login(input: MockLoginInput): Promise<Customer> {
  try {
    const res = await api.post('/auth/login', {
      email: input.email,
      password: input.password,
    });
    const payload = unwrap<AuthResponsePayload>(res);
    setAuthTokens({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      accessTokenExpiry: payload.accessTokenExpiry,
    });
    return toCustomer(payload.profile);
  } catch (err) {
    throw toAuthError(err, (status, message) => {
      if (status === 401) return 'invalid_credentials';
      if (status === 400 && message.includes('verify')) return 'email_not_verified';
      if (status === 403) return 'account_locked';
      return undefined;
    });
  }
}

// ─── register ───────────────────────────────────────────────────────────────

/**
 * Register issues NO tokens — the backend returns a "check your email" message
 * (verify-email-first). We return a partial Customer so the screen can route to
 * the verify-email screen with the email; the caller must NOT open a session.
 */
export async function register(input: MockRegisterInput): Promise<Customer> {
  try {
    const res = await api.post('/auth/register', {
      fullName: input.displayName,
      email: input.email,
      password: input.password,
    });
    // The backend returns 200 even when the verification email failed to send
    // (e.g. SendGrid sender not verified). Don't swallow that — surface it so the
    // user isn't stranded on the verify screen waiting for a code that never comes.
    const message = (res.data?.data ?? res.data?.message ?? '') as string;
    if (/could not be sent|failed to send|not be sent/i.test(message)) {
      throw new AuthError(
        'unknown',
        'Đăng ký thành công nhưng không gửi được email xác minh. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
      );
    }
    return toCustomer({
      customerId: '',
      fullName: input.displayName,
      email: input.email,
      avatarUrl: null,
      monthlyIncomeExpected: null,
      isEmailVerified: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Preserve the email-send-failure AuthError thrown above (toAuthError would
    // collapse it to a generic message and drop the detail).
    if (err instanceof AuthError) throw err;
    throw toAuthError(err, (status, message) => {
      if (status === 409) return 'email_in_use';
      if (status === 400 && message.includes('password')) return 'weak_password';
      return undefined;
    });
  }
}

// ─── forgot password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  try {
    // Backend always 200s (anti-enumeration) for a well-formed request.
    await api.post('/auth/forgot-password', { email });
  } catch (err) {
    throw toAuthError(err);
  }
}

// ─── reset password (code + new password) ─────────────────────────────────────

/**
 * POST /auth/reset-password — confirm the 6-char code from the reset email and
 * set a new password. Backend body: { token, newPassword, confirmPassword }.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  try {
    await api.post('/auth/reset-password', {
      token: input.token.trim(),
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    });
  } catch (err) {
    throw toAuthError(err, (status) => {
      // 400 (used/expired/mismatch) and 404 (code not found) → one "bad code" message.
      if (status === 400 || status === 404) return 'verification_failed';
      return undefined;
    });
  }
}

// ─── verify email (6-char code) ───────────────────────────────────────────────

/**
 * Confirm the email with the 6-character code from the verification email.
 * The backend POST /auth/verify-email matches the code against the stored token
 * (BE emits the code; FE just sends it as `token`).
 */
export async function verifyEmail(code: string): Promise<void> {
  try {
    await api.post('/auth/verify-email', { token: code.trim() });
  } catch (err) {
    throw toAuthError(err, (status) => {
      // 400 (used/expired) and 404 (not found) → one "bad code" message.
      if (status === 400 || status === 404) return 'verification_failed';
      return undefined;
    });
  }
}

// ─── resend verification ──────────────────────────────────────────────────────

export async function resendVerification(email: string): Promise<void> {
  try {
    await api.post('/auth/resend-verification', { email });
  } catch (err) {
    throw toAuthError(err);
  }
}

// ─── logout ─────────────────────────────────────────────────────────────────

/** Best-effort server-side refresh-token revoke. Caller clears local session. */
export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  try {
    await api.post('/auth/logout', { refreshToken });
  } catch {
    // Logout is best-effort — never block the user from leaving.
  }
}
