/**
 * sentry.ts — crash reporting init, gated on EXPO_PUBLIC_SENTRY_DSN.
 *
 * No-ops (including captureException) when the DSN is empty, so local dev
 * and CI don't need a real Sentry project configured.
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '@/lib/env';

export function initSentry(): void {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}

export function captureException(error: unknown): void {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error);
}
