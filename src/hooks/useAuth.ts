/**
 * useAuth.ts -- TanStack Query mutation wrappers around the mock auth services.
 *
 * Each hook surfaces typed AuthError on failure (see @/types/auth). Screens
 * read mutation.error?.code for inline banner copy and mutation.isPending for
 * the button spinner.
 *
 * Successful login/register/googleOAuth update the auth store side-effect-free
 * here -- routing decisions stay in the screen so we don't double-navigate.
 */

import { useMutation } from '@tanstack/react-query';
import {
  login,
  register,
  googleOAuth,
  forgotPassword,
  resetPassword,
  resendVerification,
  verifyEmail,
  changePassword,
  logout,
  type MockLoginInput,
  type MockRegisterInput,
  type MockChangePasswordInput,
  type ResetPasswordInput,
} from '@/services';
import { getRefreshToken } from '@/lib/mmkv';
import { useAuthStore } from '@/stores/authStore';
import type { Customer } from '@/types';

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<Customer, Error, MockLoginInput>({
    mutationFn: (input) => login(input),
    onSuccess: (user) => setSession(user),
  });
};

export const useRegister = () =>
  // Register issues no tokens (verify-email-first) — do NOT open a session here.
  // The screen routes to verify-email using the returned customer's email.
  useMutation<Customer, Error, MockRegisterInput>({
    mutationFn: (input) => register(input),
  });

export const useGoogleOAuth = (mode: 'login' | 'register') => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<Customer, Error, void>({
    mutationFn: () => googleOAuth(mode),
    onSuccess: (user) => setSession(user),
  });
};

export const useForgotPassword = () =>
  useMutation<void, Error, string>({
    mutationFn: (email) => forgotPassword(email),
  });

export const useResetPassword = () =>
  useMutation<void, Error, ResetPasswordInput>({
    mutationFn: (input) => resetPassword(input),
  });

export const useResendVerification = () =>
  useMutation<void, Error, string>({
    mutationFn: (email) => resendVerification(email),
  });

export const useVerifyEmail = () =>
  useMutation<void, Error, string>({
    mutationFn: (code) => verifyEmail(code),
  });

export const useChangePassword = () =>
  useMutation<void, Error, MockChangePasswordInput>({
    mutationFn: (input) => changePassword(input),
  });

export const useLogout = () => {
  const clearSession = useAuthStore((s) => s.clearSession);
  return useMutation<void, Error, void>({
    // Best-effort server-side revoke, then always clear the local session.
    mutationFn: async () => {
      await logout(getRefreshToken() ?? '');
    },
    onSettled: () => clearSession(),
  });
};
