/**
 * AuthErrorBanner -- inline error pill for auth screens.
 *
 * Reads the AuthError code from the mutation result and renders the matching
 * Vietnamese copy from AUTH_ERROR_MESSAGES_VI. Falls back to the generic
 * "unknown" message for unrecognised errors so the user never sees raw text.
 *
 * Use:
 *   <AuthErrorBanner error={mutation.error} />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AUTH_ERROR_MESSAGES_VI,
  isAuthError,
  type AuthErrorCode,
} from '@/types/auth';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '@/constants/theme';

export interface AuthErrorBannerProps {
  error: unknown;
}

export function AuthErrorBanner({ error }: AuthErrorBannerProps) {
  if (!error) return null;

  const code: AuthErrorCode = isAuthError(error) ? error.code : 'unknown';
  // For generic 'unknown' errors, prefer a custom message carried on the error
  // (e.g. a specific backend reason) over the catch-all copy. Known codes keep
  // their curated Vietnamese copy.
  const custom =
    isAuthError(error) && code === 'unknown' && error.message && error.message !== 'unknown'
      ? error.message
      : null;
  const message = custom ?? AUTH_ERROR_MESSAGES_VI[code];

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[4],
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  icon: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    lineHeight: FONT_SIZE.sm + 2,
  },
  message: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: '#991B1B',
    lineHeight: 20,
  },
});
