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

// Default DSN for this project's Sentry instance; EXPO_PUBLIC_SENTRY_DSN
// overrides it per-environment. Set the env var to '' explicitly (not just
// omit it) if crash reporting must be disabled, e.g. local dev.
const DEFAULT_SENTRY_DSN =
  'https://b26adbc3b815c2b9fd62db860e8ebc62@o4511073418215424.ingest.de.sentry.io/4511904839893072';

/** Sentry DSN. Empty disables crash reporting. */
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? DEFAULT_SENTRY_DSN;
