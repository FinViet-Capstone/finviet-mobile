/**
 * useSessionGuard — keep the visible screen in sync with the auth session.
 *
 * 1. Redirect: the only auth gate is app/index.tsx, which is evaluated once.
 *    When the session is cleared from outside a screen (account locked by an
 *    admin, refresh token rejected) the user would otherwise stay on whatever
 *    tab they were on. When `isAuthenticated` flips true → false and the user
 *    is not already in the (auth) stack, replace the route with the login stack.
 *
 * 2. Foreground re-check: when the app returns to the foreground, make one
 *    lightweight authenticated call (profile). If the admin locked the account
 *    while the app was in the background, the backend answers
 *    403 account_deactivated and the Axios interceptor force-logs-out — so the
 *    user is kicked out on resume instead of only on their next tap.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getProfile } from '@/services';
import { subscribeForceLogout } from '@/lib/forceLogout';
import { useAuthStore } from '@/stores/authStore';

/** Minimum gap between two foreground re-checks. */
const FOREGROUND_CHECK_INTERVAL_MS = 30_000;

export function useSessionGuard(): void {
  const router = useRouter();
  const segments = useSegments();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const wasAuthenticated = useRef(isAuthenticated);

  // 0. On a forced logout (account locked), drop every cached query so the
  //    locked account's financial data neither lingers on screen nor leaks into
  //    the next session on this device.
  useEffect(() => subscribeForceLogout(() => queryClient.clear()), [queryClient]);

  // 1. Redirect to login when the session ends while inside the app.
  useEffect(() => {
    const was = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    // Manual logout already navigates to (auth) before clearing the session,
    // so this only fires for session ends that happen "behind" the current screen.
    if (was && !isAuthenticated && segments[0] !== '(auth)') {
      router.replace('/(auth)');
    }
  }, [isAuthenticated, segments, router]);

  // 2. Re-validate the account whenever the app comes back to the foreground.
  const lastCheckAt = useRef(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const cameToForeground = appState.current !== 'active' && next === 'active';
      appState.current = next;
      if (!cameToForeground || !useAuthStore.getState().isAuthenticated) return;

      const now = Date.now();
      if (now - lastCheckAt.current < FOREGROUND_CHECK_INTERVAL_MS) return;
      lastCheckAt.current = now;

      // Result is irrelevant; a locked account is handled by the interceptor.
      getProfile().catch(() => {});
    });
    return () => subscription.remove();
  }, []);
}
