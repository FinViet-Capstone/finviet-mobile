/**
 * env.ts — dependency-free runtime config read from EXPO_PUBLIC_* vars.
 *
 * Kept free of other imports so it can be consumed by both the service barrel
 * and the Axios layer without an import cycle.
 */

/** Base URL of the .NET 8 Web API, read from the active .env file. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// LAN http:// URLs are expected in dev; production builds must not ship
// pointed at a cleartext endpoint.
if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL must be an https:// URL in production builds.',
  );
}

// ─── Google Sign-In (see src/lib/googleAuth.ts) ───────────────────────────────
// Neither value is a secret — both ship inside any app binary that uses them,
// and Firebase treats the browser key as public. They live in env rather than
// in source so a different Firebase project can be pointed at per build, and
// so this repo keeps honouring its "no Firebase config in git" .gitignore rule.
// Empty = Google sign-in reports itself as unconfigured; email/password is
// unaffected.

/** OAuth **web** client ID of the Firebase project (`client_type: 3`). */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** Firebase Web API key, used only for the identitytoolkit token exchange. */
export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
