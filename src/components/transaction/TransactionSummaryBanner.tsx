import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SPACING } from '@/constants/theme';
import { formatVNDCompact, signedCompact, pctChange } from '@/utils/formatters';

export interface TransactionSummaryBannerProps {
  income: number;
  expense: number;
  monthNet: number;
  prevIncome: number;
  prevExpense: number;
}

/** Three-column month summary: Thu nhập · Chi tiêu · Tổng, each with a trend. */
export function TransactionSummaryBanner({
  income,
  expense,
  monthNet,
  prevIncome,
  prevExpense,
}: TransactionSummaryBannerProps) {
  const hasPrevData = prevIncome > 0 || prevExpense > 0;
  const incomeUp = income >= prevIncome;
  const expenseDown = expense <= prevExpense;
  const prevNet = prevIncome - prevExpense;

  return (
    <View style={styles.summaryBanner}>
      {/* Thu nhập — no sign */}
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>{'Thu nhập'}</Text>
        <Text style={[styles.summaryAmount, { color: COLORS.tertiary }]}>
          {formatVNDCompact(income)}
        </Text>
        {hasPrevData && (
          <View style={styles.trendRow}>
            <MaterialIcon
              name={incomeUp ? 'arrow_upward' : 'arrow_downward'}
              size={11}
              color={incomeUp ? COLORS.tertiary : COLORS.error}
            />
            <Text style={[styles.trendText, { color: incomeUp ? COLORS.tertiary : COLORS.error }]}>
              {pctChange(income, prevIncome)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summaryDivider} />

      {/* Chi tiêu — no sign */}
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>{'Chi tiêu'}</Text>
        <Text style={[styles.summaryAmount, { color: COLORS.error }]}>
          {formatVNDCompact(expense)}
        </Text>
        {hasPrevData && (
          <View style={styles.trendRow}>
            <MaterialIcon
              name={expenseDown ? 'arrow_downward' : 'arrow_upward'}
              size={11}
              color={expenseDown ? COLORS.tertiary : COLORS.error}
            />
            <Text style={[styles.trendText, { color: expenseDown ? COLORS.tertiary : COLORS.error }]}>
              {pctChange(expense, prevExpense)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summaryDivider} />

      {/* Tổng — with sign */}
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>{'Tổng'}</Text>
        <Text style={[styles.summaryAmount, { color: monthNet >= 0 ? COLORS.tertiary : COLORS.error }]}>
          {signedCompact(monthNet)}
        </Text>
        {hasPrevData && (
          <View style={styles.trendRow}>
            <MaterialIcon
              name={monthNet >= prevNet ? 'arrow_upward' : 'arrow_downward'}
              size={11}
              color={COLORS.onSurfaceVariant}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
    gap: SPACING[2],
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[3],
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.medium,
  },
  summaryAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
  },
  summaryDivider: {
    width: 1,
  },
});
