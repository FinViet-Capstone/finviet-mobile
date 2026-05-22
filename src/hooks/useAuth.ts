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
  resendVerification,
  changePassword,
  type MockLoginInput,
  type MockRegisterInput,
  type MockChangePasswordInput,
} from '@/services';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<User, Error, MockLoginInput>({
    mutationFn: (input) => login(input),
    onSuccess: (user) => setSession(user),
  });
};

export const useRegister = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<User, Error, MockRegisterInput>({
    mutationFn: (input) => register(input),
    onSuccess: (user) => setSession(user),
  });
};

export const useGoogleOAuth = (mode: 'login' | 'register') => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<User, Error, void>({
    mutationFn: () => googleOAuth(mode),
    onSuccess: (user) => setSession(user),
  });
};

export const useForgotPassword = () =>
  useMutation<void, Error, string>({
    mutationFn: (email) => forgotPassword(email),
  });

export const useResendVerification = () =>
  useMutation<void, Error, string>({
    mutationFn: (email) => resendVerification(email),
  });

export const useChangePassword = () =>
  useMutation<void, Error, MockChangePasswordInput>({
    mutationFn: (input) => changePassword(input),
  });
