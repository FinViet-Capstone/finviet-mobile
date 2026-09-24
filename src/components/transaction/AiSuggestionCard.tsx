import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { TX_DETAIL_STRINGS as S } from '@/data/transactionDetailData';
import type { Transaction } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiSuggestion {
  categoryId: string;
  categoryName: string;
  /** 0-1, null when the source did not report one. */
  confidence: number | null;
}

export interface AiSuggestionCardProps {
  suggestion: AiSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  isApplying?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** The AI suggestion already stored on a transaction (status 'suggested'), or null when there is none. */
export function getStoredAiSuggestion(
  tx: Pick<Transaction, 'categorizationStatus' | 'aiSuggestedCategoryId' | 'aiSuggestedCategoryName' | 'aiConfidence'>,
  fallbackName?: string,
): AiSuggestion | null {
  if (tx.categorizationStatus !== 'suggested' || !tx.aiSuggestedCategoryId) return null;
  return {
    categoryId: tx.aiSuggestedCategoryId,
    categoryName: tx.aiSuggestedCategoryName ?? fallbackName ?? '',
    confidence: tx.aiConfidence,
  };
}

export function AiSuggestionCard({ suggestion, onApply, onDismiss, isApplying = false }: AiSuggestionCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <MaterialIcon name="auto_awesome" size={20} color={colors.tertiary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{S.aiSuggestCardTitle}</Text>
        <View style={styles.nameRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{S.aiSuggestBadge}</Text>
          </View>
          <Text style={styles.name}>{suggestion.categoryName}</Text>
        </View>
        {suggestion.confidence != null ? (
          <Text style={styles.confidence}>{S.aiSuggestConfidence(Math.round(suggestion.confidence * 100))}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity activeOpacity={0.7} onPress={onDismiss} disabled={isApplying}>
          <Text style={styles.dismiss}>{S.aiSuggestDismiss}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.applyBtn} onPress={onApply} disabled={isApplying}>
          {isApplying
            ? <ActivityIndicator size="small" color={colors.onTertiary} />
            : <Text style={styles.applyText}>{S.aiSuggestApply}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING[3],
      padding: SPACING[4],
      borderRadius: BORDER_RADIUS.xl,
      minHeight: 64,
      backgroundColor: withAlpha(colors.tertiary, 0.08),
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.tertiary, 0.13),
    },
    textWrap: { flex: 1 },
    label: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginTop: 2 },
    badge: {
      paddingHorizontal: SPACING[1],
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.tertiary, 0.18),
    },
    badgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: colors.tertiary },
    name: { flexShrink: 1, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: colors.onSurface },
    confidence: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginTop: 2 },
    actions: { alignItems: 'flex-end', gap: SPACING[2] },
    dismiss: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
    applyBtn: {
      minWidth: 72,
      alignItems: 'center',
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1] + 2,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: colors.tertiary,
    },
    applyText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: colors.onTertiary },
  });
}
