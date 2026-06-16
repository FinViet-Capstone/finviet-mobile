import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { ProgressBar } from '@/components/common/ProgressBar';
import { BudgetWithSpend } from '@/types/budget';
import { formatVND } from '@/utils/formatters';

export interface BudgetProgressBarProps {
  budget: BudgetWithSpend;
  onPress?: () => void;
}

/**
 * Displays a single budget category row:
 *   Category name (left)              Spent / Limit (right)
 *   [=======------ color progress bar ------]
 *
 * Fill color thresholds (from SPEC):
 *   green  — < 60%   (safe)
 *   yellow — 60–80%  (warning)
 *   red    — > 80%   (danger)
 */
export function BudgetProgressBar({ budget, onPress }: BudgetProgressBarProps) {
  const barColor =
    budget.status === 'safe'
      ? COLORS.budget.safe
      : budget.status === 'warning'
      ? COLORS.budget.warning
      : COLORS.budget.danger;

  const spentFormatted = formatVND(budget.spent);
  const limitFormatted = formatVND(budget.monthlyLimit);

  const content = (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        {/* Color dot + name */}
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: budget.categoryColor }]} />
          <Text style={styles.categoryName} numberOfLines={1}>
            {budget.categoryName}
          </Text>
        </View>
        {/* Spent / Limit */}
        <Text style={styles.amounts}>
          {spentFormatted}
          <Text style={styles.limit}>{' / ' + limitFormatted}</Text>
        </Text>
      </View>

      {/* Progress bar */}
      <ProgressBar
        value={budget.percentage / 100}
        color={barColor}
        height={8}
        style={styles.bar}
      />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}


const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING[2],
  },
  categoryName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[800],
    flex: 1,
  },
  amounts: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  limit: {
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.gray[500],
  },
  bar: {
    marginTop: SPACING[1],
  },
});
