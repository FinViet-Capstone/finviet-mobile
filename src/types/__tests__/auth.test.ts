/**
 * Unit tests for the AuthError model + Vietnamese message map.
 */

import {
  AUTH_ERROR_MESSAGES_VI,
  AuthError,
  authErrorMessage,
  isAuthError,
  isRegistrationResumable,
  type AuthErrorCode,
} from '@/types/auth';

describe('AuthError', () => {
  it('carries the code', () => {
    const e = new AuthError('invalid_credentials');
    expect(e.code).toBe('invalid_credentials');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('AuthError');
  });

  it('uses the code as default message', () => {
    const e = new AuthError('account_locked');
    expect(e.message).toBe('account_locked');
  });

  it('accepts a custom message', () => {
    const e = new AuthError('unknown', 'something blew up');
    expect(e.message).toBe('something blew up');
    expect(e.code).toBe('unknown');
  });
});

describe('isAuthError', () => {
  it('returns true for AuthError instances', () => {
    expect(isAuthError(new AuthError('network_error'))).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isAuthError(new Error('boom'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError('string')).toBe(false);
    expect(isAuthError({ code: 'unknown' })).toBe(false);
  });
});

describe('authErrorMessage', () => {
  it('returns the VI message for an AuthError code', () => {
    const m = authErrorMessage(new AuthError('invalid_credentials'));
    expect(m).toBe(AUTH_ERROR_MESSAGES_VI.invalid_credentials);
  });

  it('falls back to "unknown" for non-AuthError values', () => {
    expect(authErrorMessage(new Error('plain'))).toBe(AUTH_ERROR_MESSAGES_VI.unknown);
    expect(authErrorMessage(undefined)).toBe(AUTH_ERROR_MESSAGES_VI.unknown);
    expect(authErrorMessage('boom')).toBe(AUTH_ERROR_MESSAGES_VI.unknown);
  });
});

describe('AUTH_ERROR_MESSAGES_VI', () => {
  it('has a non-empty VI message for every code', () => {
    const codes: AuthErrorCode[] = [
      'invalid_credentials',
      'account_locked',
      'email_not_verified',
      'email_in_use',
      'user_not_found',
      'network_error',
      'rate_limited',
      'oauth_cancelled',
      'oauth_failed',
      'weak_password',
      'wrong_current_password',
      'verification_email_failed',
      'unknown',
    ];
    codes.forEach((code) => {
      expect(AUTH_ERROR_MESSAGES_VI[code]).toBeTruthy();
      expect(AUTH_ERROR_MESSAGES_VI[code].length).toBeGreaterThan(0);
    });
  });
});

describe('isRegistrationResumable', () => {
  // Register creates the account before the slow verification-email step, so a
  // retry that hits 409 means the customer must be sent to verify-email
  // (resend code) instead of being stranded on the register form.
  it('is true when the email already has an account (retry after a failed register)', () => {
    expect(isRegistrationResumable(new AuthError('email_in_use'))).toBe(true);
  });

  it('is true when the account was saved but the verification email could not be sent', () => {
    expect(isRegistrationResumable(new AuthError('verification_email_failed'))).toBe(true);
  });

  it.each<AuthErrorCode>(['network_error', 'weak_password', 'rate_limited', 'unknown'])(
    'is false for %s',
    (code) => {
      expect(isRegistrationResumable(new AuthError(code))).toBe(false);
    },
  );

  it('is false for non-AuthError values', () => {
    expect(isRegistrationResumable(new Error('boom'))).toBe(false);
  });
});
