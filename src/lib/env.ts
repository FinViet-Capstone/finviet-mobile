/**
 * env.ts — dependency-free runtime config read from EXPO_PUBLIC_* vars.
 *
 * Kept free of other imports so it can be consumed by both the service barrel
 * and the Axios layer without an import cycle.
 */

/**
 * USE_MOCK — single switch between the mock and real API service modules.
 * Reads EXPO_PUBLIC_USE_MOCK; defaults to mock unless explicitly "false".
 */
export const USE_MOCK =
  (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').toLowerCase() !== 'false';

/** Base URL of the .NET 8 Web API, read from the active .env file. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// LAN http:// URLs are expected in dev; production builds must not ship
// pointed at a cleartext endpoint.
if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL must be an https:// URL in production builds.',
  );
}
