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

export function useBootstrapSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrateTokenCache();
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setHydrated(true);
        return;
      }
      try {
        const customer = await getProfile();
        if (!cancelled) setSession(customer);
      } catch {
        // Token invalid / refresh failed — clear and fall back to login.
        useAuthStore.getState().clearSession();
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setSession, setHydrated]);
}
