/**
 * Unit tests for the mock auth service layer.
 * Pure logic -- no React, no async-storage, no navigation.
 */

import {
  login,
  register,
  forgotPassword,
  resendVerification,
  changePassword,
  googleOAuth,
} from '@/services/mock/auth';
import { AuthError, isAuthError } from '@/types/auth';

describe('mock auth services', () => {
  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns a user for any non-magic email', async () => {
      const user = await login({ email: 'khoi@example.com', password: 'Aaa12345' });
      expect(user.email).toBe('khoi@example.com');
      expect(user.onboardingDone).toBe(true);
    });

    it('throws invalid_credentials for wrongpw@test.com', async () => {
      await expect(
        login({ email: 'wrongpw@test.com', password: 'whatever1' }),
      ).rejects.toMatchObject({ code: 'invalid_credentials' });
    });

    it('throws account_locked for locked@test.com', async () => {
      await expect(
        login({ email: 'locked@test.com', password: 'whatever1' }),
      ).rejects.toMatchObject({ code: 'account_locked' });
    });

    it('returns emailVerified:false for unverified@test.com', async () => {
      const user = await login({ email: 'unverified@test.com', password: 'whatever1' });
      expect(user.emailVerified).toBe(false);
      expect(user.onboardingDone).toBe(true);
    });

    it('throws network_error for network@test.com', async () => {
      await expect(
        login({ email: 'network@test.com', password: 'whatever1' }),
      ).rejects.toMatchObject({ code: 'network_error' });
    });

    it('throws rate_limited for ratelimit@test.com', async () => {
      await expect(
        login({ email: 'ratelimit@test.com', password: 'whatever1' }),
      ).rejects.toMatchObject({ code: 'rate_limited' });
    });

    it('matches magic emails case-insensitively', async () => {
      await expect(
        login({ email: 'WRONGPW@test.com', password: 'whatever1' }),
      ).rejects.toMatchObject({ code: 'invalid_credentials' });
    });

    it('all rejections are AuthError instances', async () => {
      try {
        await login({ email: 'locked@test.com', password: 'whatever1' });
        fail('expected throw');
      } catch (e) {
        expect(isAuthError(e)).toBe(true);
        expect(e).toBeInstanceOf(AuthError);
      }
    });
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns a fresh user with emailVerified:false and onboardingDone:false', async () => {
      const user = await register({
        displayName: 'Test User',
        email: 'someone@new.com',
        password: 'Aaa12345',
      });
      expect(user.email).toBe('someone@new.com');
      expect(user.displayName).toBe('Test User');
      expect(user.emailVerified).toBe(false);
      expect(user.onboardingDone).toBe(false);
    });

    it('throws email_in_use for taken@test.com', async () => {
      await expect(
        register({ displayName: 'X', email: 'taken@test.com', password: 'Aaa12345' }),
      ).rejects.toMatchObject({ code: 'email_in_use' });
    });

    it('throws weak_password for weak@test.com', async () => {
      await expect(
        register({ displayName: 'X', email: 'weak@test.com', password: 'Aaa12345' }),
      ).rejects.toMatchObject({ code: 'weak_password' });
    });
  });

  // ─── forgot password ──────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('resolves silently for valid email', async () => {
      await expect(forgotPassword('hi@example.com')).resolves.toBeUndefined();
    });

    it('throws user_not_found for notfound@test.com', async () => {
      await expect(forgotPassword('notfound@test.com')).rejects.toMatchObject({
        code: 'user_not_found',
      });
    });
  });

  // ─── resend verification ──────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('resolves silently for valid email', async () => {
      await expect(resendVerification('hi@example.com')).resolves.toBeUndefined();
    });

    it('honours network@test.com magic email', async () => {
      await expect(resendVerification('network@test.com')).rejects.toMatchObject({
        code: 'network_error',
      });
    });
  });

  // ─── change password ──────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('resolves silently with a valid pair', async () => {
      await expect(
        changePassword({ currentPassword: 'Aaa12345', newPassword: 'Bbb12345' }),
      ).resolves.toBeUndefined();
    });

    it('throws wrong_current_password when current is "wrongpw"', async () => {
      await expect(
        changePassword({ currentPassword: 'wrongpw', newPassword: 'Bbb12345' }),
      ).rejects.toMatchObject({ code: 'wrong_current_password' });
    });

    it('throws weak_password when newPassword < 8 chars', async () => {
      await expect(
        changePassword({ currentPassword: 'Aaa12345', newPassword: 'short' }),
      ).rejects.toMatchObject({ code: 'weak_password' });
    });
  });

  // ─── google oauth ─────────────────────────────────────────────────────────

  describe('googleOAuth', () => {
    it('returns onboardingDone:true for login mode', async () => {
      const user = await googleOAuth('login');
      expect(user.onboardingDone).toBe(true);
      expect(user.emailVerified).toBe(true);
    });

    it('returns onboardingDone:false for register mode', async () => {
      const user = await googleOAuth('register');
      expect(user.onboardingDone).toBe(false);
    });
  });
});
