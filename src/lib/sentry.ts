/**
 * sentry.ts — crash reporting init, gated on SENTRY_DSN.
 *
 * No-ops (including captureException) when the DSN is empty, so local dev
 * and CI don't need a real Sentry project configured. SENTRY_DSN defaults to
 * this project's DSN (see src/lib/env.ts) unless EXPO_PUBLIC_SENTRY_DSN
 * overrides or explicitly disables it.
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '@/lib/env';

export function initSentry(): void {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,

    // Adds more context data to events (IP address, cookies, user, etc.)
    // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
    sendDefaultPii: true,

    // Enable Logs
    enableLogs: true,

    // Configure Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  });
}

export function captureException(error: unknown): void {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error);
}
