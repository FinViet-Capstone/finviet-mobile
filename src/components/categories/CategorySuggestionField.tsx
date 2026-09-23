import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CATEGORIZATION_STRINGS as S } from '@/data/categorizationData';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategorySuggestionSource = 'ai' | 'rule' | null;
export type CategorySuggestionStatus = 'ok' | 'suggested' | 'unsure' | 'failed' | 'pending';

export interface CategorySuggestionFieldProps {
  category: { nameVi: string; color: string } | null;
  /** Who chose `category` - null once the user picked it manually, so no badge is shown. */
  source: CategorySuggestionSource;
  status: CategorySuggestionStatus;
  onPress: () => void;
  /** Failed state only: when given, the failed label becomes a retry button. */
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Status a screen should pass when it only knows whether a category came back. Income rows
 * are never sent for AI categorization, so a missing category there is "unsure", not a failure. */
export function getCategoryStatus(hasCategory: boolean, isIncome: boolean): CategorySuggestionStatus {
  if (hasCategory) return 'ok';
  return isIncome ? 'unsure' : 'failed';
}

/** Value side of a "Danh mục" row, shared by the CSV, photo and SMS review screens. The caller
 * renders the label; this renders the category (or its failed/unsure/pending state) and opens
 * the picker on tap. */
export function CategorySuggestionField({
  category, source, status, onPress, onRetry, style,
}: CategorySuggestionFieldProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPending = status === 'pending';
  const isFailed = status === 'failed';
  const hasCategory = category !== null && (status === 'ok' || status === 'suggested');
  const chevronColor = isFailed ? colors.error : colors.onSurfaceVariant;
  // Retry is a sibling of the picker target (not nested inside it) so each is its own button.
  const hasRetry = isFailed && onRetry !== undefined;

  return (
    <View style={[styles.row, style]}>
      {hasRetry && (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.content}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={S.retryA11yLabel}
        >
          <MaterialIcon name="error_outline" size={12} color={colors.error} />
          <Text style={styles.failedText}>{`${S.aiFailed} - ${S.retry}`}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.content}
        onPress={onPress}
        disabled={isPending}
        accessibilityRole="button"
      >
        {hasCategory ? (
          <>
            {source && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>{source === 'ai' ? S.sourceAi : S.sourceRule}</Text>
              </View>
            )}
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <Text style={styles.name} numberOfLines={1}>{category.nameVi}</Text>
          </>
        ) : isPending ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.neutralText}>{S.pending}</Text>
          </>
        ) : isFailed ? (
          hasRetry ? null : (
            <>
              <MaterialIcon name="error_outline" size={12} color={colors.error} />
              <Text style={styles.failedText}>{`${S.aiFailed} - ${S.tapToPick}`}</Text>
            </>
          )
        ) : (
          <Text style={styles.neutralText}>{`${S.uncategorized} - ${S.tapToPick}`}</Text>
        )}
        {!isPending && <MaterialIcon name="chevron_right" size={16} color={chevronColor} />}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1], flexShrink: 1, justifyContent: 'flex-end' },
    content: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1], flexShrink: 1 },
    dot: { width: SPACING[2], height: SPACING[2], borderRadius: BORDER_RADIUS.full },
    name: { flexShrink: 1, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface, textAlign: 'right' },
    sourceBadge: { paddingHorizontal: SPACING[1], paddingVertical: SPACING[0], borderRadius: BORDER_RADIUS.full, backgroundColor: withAlpha(colors.primary, 0.12) },
    sourceBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
    failedText: { fontSize: FONT_SIZE.xs, color: colors.error, fontWeight: FONT_WEIGHT.semibold },
    neutralText: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, fontStyle: 'italic' },
  });
}
