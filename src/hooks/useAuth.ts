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

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  uploadAvatar,
  deleteAccount,
  unregisterNotificationDevice,
  type MockLoginInput,
  type MockRegisterInput,
  type MockChangePasswordInput,
  type ResetPasswordInput,
} from '@/services';
import { getRefreshToken } from '@/lib/mmkv';
import { getNotificationInstallationId } from '@/lib/notificationStorage';
import { queryKeys } from '@/lib/queryKeys';
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
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    // Device unregister and refresh-token revoke are both best effort; neither
    // may keep the user signed in locally when the network is unavailable.
    mutationFn: async () => {
      try {
        const installationId = await getNotificationInstallationId();
        await unregisterNotificationDevice(installationId);
      } catch {
        // The backend registration is reconciled on the next authenticated use.
      }
      await logout(getRefreshToken() ?? '');
    },
    onSettled: () => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.all() });
      clearSession();
    },
  });
};

/** Upload a new avatar image; on success patches the avatarUrl in the store. */
export const useUploadAvatar = () => {
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  return useMutation<string, Error, string>({
    mutationFn: (uri) => uploadAvatar(uri),
    onSuccess: (url) => updateCustomer({ avatarUrl: url }),
  });
};

/** Self-delete the account (soft). The caller clears the session on success. */
export const useDeleteAccount = () =>
  useMutation<void, Error, void>({
    mutationFn: () => deleteAccount(),
  });
