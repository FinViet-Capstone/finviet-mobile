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

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AUTH_ERROR_MESSAGES_VI,
  isAuthError,
  type AuthErrorCode,
} from '@/types/auth';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export interface AuthErrorBannerProps {
  error: unknown;
}

export function AuthErrorBanner({ error }: AuthErrorBannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING[3],
      paddingVertical: SPACING[3],
      paddingHorizontal: SPACING[4],
      // Was hardcoded near-white (#FEF2F2/#FCA5A5) — read fine on a light
      // ground but rendered as a pale card floating on the dark login screen.
      // errorContainer/error are the M3 roles built for exactly this.
      backgroundColor: colors.errorContainer,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING[4],
    },
    iconWrap: {
      width: 22,
      height: 22,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    icon: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.white,
      lineHeight: FONT_SIZE.sm + 2,
    },
    message: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      color: colors.onErrorContainer,
      lineHeight: 20,
    },
  });
}
