/**
 * useBootstrapSession — rehydrate the auth session on app launch.
 *
 * If a JWT access token is persisted (MMKV), fetch the profile and restore the
 * session so a reload keeps the user logged in. The Axios interceptor handles an
 * expired access token (401 → refresh rotation); if refresh fails it clears the
 * session, and the catch here falls through to the unauthenticated state.
 *
 * In mock mode no token is ever stored, so this resolves immediately to the
 * unauthenticated state — preserving the existing login-required behavior.
 *
 * The root layout renders nothing until `hydrated` flips true, avoiding a
 * login-screen flash before the session is restored.
 */

import { useEffect } from 'react';
import { getProfile } from '@/services';
import { getAccessToken, hydrateTokenCache } from '@/lib/mmkv';
import { useAuthStore } from '@/stores/authStore';

// Max time the splash waits on the profile fetch before showing the login gate.
// Bounds the white screen when the backend is slow/unreachable (the profile call
// itself can hang until the 20s Axios timeout).
const BOOTSTRAP_TIMEOUT_MS = 4000;

export function useBootstrapSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    // If the profile fetch is slow/unreachable, flip the gate anyway so the app
    // shows login instead of a long white screen. The stored token is kept, so a
    // later launch with the backend reachable restores the session.
    const timer = setTimeout(() => {
      if (!cancelled && !settled) {
        settled = true;
        setHydrated(true);
      }
    }, BOOTSTRAP_TIMEOUT_MS);

    (async () => {
      await hydrateTokenCache();
      const token = getAccessToken();
      if (!token) {
        clearTimeout(timer);
        if (!cancelled && !settled) {
          settled = true;
          setHydrated(true);
        }
        return;
      }
      try {
        const customer = await getProfile();
        if (!cancelled && !settled) setSession(customer);
      } catch {
        // Token invalid / refresh failed — clear and fall back to login.
        // (A timeout already showed login; a real auth failure clears the token.)
        if (!cancelled && !settled) useAuthStore.getState().clearSession();
      } finally {
        clearTimeout(timer);
        if (!cancelled && !settled) {
          settled = true;
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [setSession, setHydrated]);
}
