import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

const DEFAULT_MESSAGE = 'Đã có lỗi xảy ra. Hãy thử lại.';
const RETRY_LABEL = 'Thử lại';

export interface ErrorStateProps {
  /** Error message. Falls back to a generic Vietnamese message. */
  message?: string;
  /** When provided, renders a retry button. */
  onRetry?: () => void;
  /** Material Symbols icon name. Defaults to 'error'. */
  icon?: string;
}

/**
 * Standard error state for data screens — the "error" arm of the
 * loading/error/empty triad (see agents/DESIGN.md). Use instead of bespoke
 * error UIs so every screen looks and behaves the same.
 */
export function ErrorState({ message, onRetry, icon = 'error' }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <MaterialIcon name={icon} size={48} color={COLORS.error} />
      <Text style={styles.message}>{message ?? DEFAULT_MESSAGE}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <MaterialIcon name="refresh" size={18} color={COLORS.onPrimary} />
          <Text style={styles.retryText}>{RETRY_LABEL}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING[8],
    paddingVertical: SPACING[10],
    gap: SPACING[3],
  },
  message: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING[2],
    minHeight: 48,
  },
  retryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
});
