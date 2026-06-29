/**
 * mock/auth.ts -- mock auth service layer for FinViet.
 *
 * Magic test emails trigger deterministic AuthError throws so screens can be
 * exercised end-to-end without a backend. Anything else "succeeds".
 *
 * Magic emails:
 *   wrongpw@test.com    -> invalid_credentials       (login only)
 *   locked@test.com     -> account_locked            (login)
 *   unverified@test.com -> email_not_verified        (login; register seeds emailVerified:false)
 *   notfound@test.com   -> user_not_found            (forgot-password)
 *   taken@test.com      -> email_in_use              (register)
 *   weak@test.com       -> weak_password             (register)
 *   network@test.com    -> network_error             (any flow)
 *   ratelimit@test.com  -> rate_limited              (any flow)
 *
 * For change-password, the magic CURRENT password is "wrongpw" -> wrong_current_password.
 */

import { AuthError } from '@/types/auth';
import type { Customer } from '@/types';
import { getCustomer } from './user';

// ─── helpers ────────────────────────────────────────────────────────────────

const delay = (ms = 450) => new Promise<void>((r) => setTimeout(r, ms));

function throwForMagicEmail(email: string): void {
  const e = email.trim().toLowerCase();
  switch (e) {
    case 'network@test.com':
      throw new AuthError('network_error');
    case 'ratelimit@test.com':
      throw new AuthError('rate_limited');
    default:
      return;
  }
}

// ─── login ──────────────────────────────────────────────────────────────────

export interface MockLoginInput {
  email: string;
  password: string;
}

export async function login(input: MockLoginInput): Promise<Customer> {
  await delay();
  throwForMagicEmail(input.email);

  const e = input.email.trim().toLowerCase();
  if (e === 'wrongpw@test.com') throw new AuthError('invalid_credentials');
  if (e === 'locked@test.com') throw new AuthError('account_locked');
  if (e === 'unverified@test.com') {
    return { ...getCustomer(), email: input.email, emailVerified: false, onboardingDone: true };
  }

  return { ...getCustomer(), email: input.email, onboardingDone: true };
}

// ─── register ───────────────────────────────────────────────────────────────

export interface MockRegisterInput {
  displayName: string;
  email: string;
  password: string;
}

export async function register(input: MockRegisterInput): Promise<Customer> {
  await delay();
  throwForMagicEmail(input.email);

  const e = input.email.trim().toLowerCase();
  if (e === 'taken@test.com') throw new AuthError('email_in_use');
  if (e === 'weak@test.com') throw new AuthError('weak_password');

  // Fresh registration: not verified, not onboarded.
  return {
    ...getCustomer(),
    email: input.email,
    displayName: input.displayName,
    emailVerified: false,
    onboardingDone: false,
  };
}

// ─── google oauth ───────────────────────────────────────────────────────────

/**
 * Mock Google OAuth handshake. Real implementation will use expo-auth-session
 * with Google's discovery doc; the screen-side contract stays identical.
 *
 * Returns a distinct Google identity (different id/email/displayName) so the
 * screen can visually confirm OAuth actually switched accounts -- without it
 * the existing demo user would mask any session-routing bugs.
 */
export async function googleOAuth(mode: 'login' | 'register'): Promise<Customer> {
  await delay(700);
  const base = getCustomer();
  return {
    ...base,
    id: 'user_google_demo',
    email: 'google.user@gmail.com',
    displayName: 'Google Demo',
    googleId: 'google_subject_123',
    passwordHash: null,
    avatarUrl: null,
    emailVerified: true,
    // Login mode: returning user, skip onboarding.
    // Register mode: brand-new user, run onboarding.
    onboardingDone: mode === 'login',
  };
}

// ─── forgot password ────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  await delay();
  throwForMagicEmail(email);

  const e = email.trim().toLowerCase();
  if (e === 'notfound@test.com') throw new AuthError('user_not_found');
}

// ─── verify email (6-char code) ───────────────────────────────────────────────

/** Mock: any 6-char code succeeds; the magic code "BADCOD" fails. */
export async function verifyEmail(code: string): Promise<void> {
  await delay();
  const c = code.trim().toUpperCase();
  if (c === 'BADCOD' || c.length !== 6) {
    throw new AuthError('verification_failed');
  }
}

// ─── resend verification ────────────────────────────────────────────────────

export async function resendVerification(email: string): Promise<void> {
  await delay(600);
  throwForMagicEmail(email);
  // Otherwise: success (no return value -- screen shows toast/alert)
}

// ─── reset password (code + new password) ─────────────────────────────────────

export interface ResetPasswordInput {
  /** 6-char code from the reset email. */
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/** Mock: any 6-char code succeeds; "BADCOD" (or wrong length) fails. */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await delay();
  const c = input.token.trim().toUpperCase();
  if (c === 'BADCOD' || c.length !== 6) {
    throw new AuthError('verification_failed');
  }
}

// ─── change password ────────────────────────────────────────────────────────

export interface MockChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  input: MockChangePasswordInput,
): Promise<void> {
  await delay();
  if (input.currentPassword === 'wrongpw') {
    throw new AuthError('wrong_current_password');
  }
  if (input.newPassword.length < 8) {
    // Belt-and-braces: zod catches this client-side first, but the server
    // would reject too. Surface the same code path.
    throw new AuthError('weak_password');
  }
}

// ─── update profile (onboarding / settings) ───────────────────────────────────

export interface UpdateProfileInput {
  fullName: string;
  monthlyIncomeExpected?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
  /** 'YYYY-MM-DD' */
  dateOfBirth?: string | null;
}

/** Mock: no-op (in-memory customer is updated by the store, not here). */
export async function updateProfile(_input: UpdateProfileInput): Promise<void> {
  await delay(150);
}

// ─── logout ───────────────────────────────────────────────────────────────────

/** No-op in mock mode — session is cleared locally by the auth store. */
export async function logout(_refreshToken: string): Promise<void> {
  await delay(150);
}

// ─── profile (session rehydrate) ──────────────────────────────────────────────

/** Mock rehydrate — returns the demo customer. Bootstrap only calls this when a
 *  token is present, which never happens in mock mode, so it's effectively unused. */
export async function getProfile(): Promise<Customer> {
  await delay(150);
  return getCustomer();
}
