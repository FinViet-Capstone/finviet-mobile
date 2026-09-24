import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import {
  CategorySuggestionField,
  type CategorySuggestionSource,
  type CategorySuggestionStatus,
} from '@/components/categories/CategorySuggestionField';
import { useCategoryCatalog } from '@/hooks/useCategoryCatalog';
import { formatVND } from '@/utils/formatters';
import { formatDisplayDate } from '@/utils/date';
import { SEPAY_REVIEW_STRINGS as S } from '@/data/sepayReviewData';
import type { Transaction } from '@/types/transaction';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SepayReviewCardProps {
  transaction: Transaction;
  walletName?: string;
  /** AI categorization mode is `off`: no AI badge or accept button, failed reads as unsure. */
  isAiOff: boolean;
  onAccept: (transaction: Transaction) => void;
  onChange: (transaction: Transaction) => void;
}

interface ReviewField {
  status: CategorySuggestionStatus;
  source: CategorySuggestionSource;
  suggestedCategoryId: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** How a review row's category field should render. The customer never sees the word
 * "suggested" - a suggestion is just the category with an AI badge. */
export function getReviewField(tx: Transaction, isAiOff: boolean): ReviewField {
  if (tx.categorizationStatus === 'suggested' && !isAiOff && tx.aiSuggestedCategoryId) {
    return { status: 'suggested', source: 'ai', suggestedCategoryId: tx.aiSuggestedCategoryId };
  }
  if (tx.categorizationStatus === 'pending') return { status: 'pending', source: null, suggestedCategoryId: null };
  if (tx.categorizationStatus === 'failed' && !isAiOff) return { status: 'failed', source: null, suggestedCategoryId: null };
  return { status: 'unsure', source: null, suggestedCategoryId: null };
}

export const SepayReviewCard = React.memo(function SepayReviewCard({
  transaction: tx,
  walletName,
  isAiOff,
  onAccept,
  onChange,
}: SepayReviewCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const catalog = useCategoryCatalog();
  const field = getReviewField(tx, isAiOff);
  const category = field.suggestedCategoryId ? catalog.get(field.suggestedCategoryId) : undefined;
  const title = tx.merchant || tx.description || S.title;
  const canAccept = field.status === 'suggested' && category !== undefined;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[walletName, formatDisplayDate(tx.transactionDate)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={styles.amount}>{formatVND(tx.amount)}</Text>
      </View>
      <View style={styles.footer}>
        <CategorySuggestionField
          style={styles.field}
          category={category ? { nameVi: category.nameVi, color: category.color } : null}
          source={field.source}
          status={field.status}
          onPress={() => onChange(tx)}
        />
        {field.status !== 'pending' && (
          <View style={styles.actions}>
            {canAccept && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.acceptBtn}
                onPress={() => onAccept(tx)}
                accessibilityRole="button"
                accessibilityLabel={S.acceptA11yLabel}
              >
                <Text style={styles.acceptText}>{S.accept}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.changeBtn}
              onPress={() => onChange(tx)}
              accessibilityRole="button"
              accessibilityLabel={S.changeA11yLabel}
            >
              <Text style={styles.changeText}>{S.change}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[4],
      gap: SPACING[3],
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
    headerText: { flex: 1 },
    title: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
    meta: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginTop: SPACING[0] },
    amount: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    footer: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
    field: { flex: 1, justifyContent: 'flex-start' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
    acceptBtn: {
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.primary,
    },
    acceptText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: colors.onPrimary },
    changeBtn: {
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.4),
    },
    changeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
  });
}
