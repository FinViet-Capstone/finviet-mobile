/**
 * auth.ts - Auth-flow error model + Vietnamese message map.
 *
 * Every auth mock service throws an AuthError with a typed code; screens
 * render messages from AUTH_ERROR_MESSAGES_VI keyed by that code so error
 * copy stays consistent across login / register / forgot / change-password.
 *
 * When the real .NET API lands, the axios layer maps backend error codes
 * to the same AuthErrorCode union -- screen logic is unchanged.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_locked'
  | 'email_not_verified'
  | 'email_in_use'
  | 'user_not_found'
  | 'network_error'
  | 'rate_limited'
  | 'oauth_cancelled'
  | 'oauth_failed'
  | 'weak_password'
  | 'wrong_current_password'
  | 'verification_failed'
  | 'unknown';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

/** Type guard for catch blocks. */
export function isAuthError(e: unknown): e is AuthError {
  return e instanceof AuthError;
}

/**
 * Vietnamese inline-banner copy keyed by error code.
 * Keep messages short -- 1 sentence, no trailing period when possible.
 */
export const AUTH_ERROR_MESSAGES_VI: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không chính xác',
  account_locked:
    'Tài khoản đã bị khoá tạm thời do nhiều lần đăng nhập sai. Hãy thử lại sau.',
  email_not_verified:
    'Email chưa được xác minh. Hãy kiểm tra hộp thư để hoàn tất xác minh.',
  email_in_use: 'Email này đã được sử dụng. Hãy đăng nhập hoặc dùng email khác.',
  user_not_found: 'Không tìm thấy tài khoản với email này',
  network_error: 'Mất kết nối mạng. Hãy kiểm tra kết nối và thử lại.',
  rate_limited: 'Bạn đã thử quá nhiều lần. Hãy đợi một lát rồi thử lại.',
  oauth_cancelled: 'Bạn đã huỷ đăng nhập với Google',
  oauth_failed: 'Đăng nhập với Google không thành công. Hãy thử lại.',
  weak_password:
    'Mật khẩu phải có ít nhất 8 ký tự, gồm 1 chữ in hoa và 1 chữ số.',
  wrong_current_password: 'Mật khẩu hiện tại không chính xác',
  verification_failed:
    'Mã xác minh không đúng hoặc đã hết hạn. Hãy kiểm tra lại hoặc gửi lại mã.',
  unknown: 'Đã có lỗi xảy ra. Hãy thử lại sau.',
};

/** Convenience: pull the VI message for any caught error, with fallback. */
export function authErrorMessage(e: unknown): string {
  if (isAuthError(e)) return AUTH_ERROR_MESSAGES_VI[e.code];
  return AUTH_ERROR_MESSAGES_VI.unknown;
}

// -------------------------------------------------------------------------
// Auth service request payloads (services/real/auth.ts's login()/register()/
// changePassword()/etc.). Named *Payload rather than *Input to stay distinct
// from the same-named form-validation types in validators/auth.schema.ts
// (e.g. LoginInput there includes only what the login form collects; this
// LoginPayload is what actually gets sent to the backend).
// -------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  /** 6-char code from the reset email. */
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  fullName: string;
  monthlyIncomeExpected?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
  /** 'YYYY-MM-DD' */
  dateOfBirth?: string | null;
  /** 50-30-20 budget bucket allocation — send all three together or omit all three. */
  needsPct?: number;
  wantsPct?: number;
  savingsPct?: number;
}

export interface UpdateProfileSettingsInput {
  theme?: 'light' | 'dark' | 'system';
  /** [warningPct, exceededPct] for budget_alert notifications. */
  notifBudgetThresholds?: [number, number];
}
