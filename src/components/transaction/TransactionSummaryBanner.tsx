import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVNDCompact, signedCompact } from '@/utils/formatters';

export interface TransactionSummaryBannerProps {
  income: number;
  expense: number;
  monthNet: number;
  prevIncome: number;
  prevExpense: number;
}

/** Trend vs tháng trước: "—" = không có gốc so sánh; "–" = không đổi; else % thay đổi. */
function pctTrend(curr: number, prev: number): { label: string; changed: boolean } {
  if (prev === 0) return { label: '—', changed: false };     // không có baseline
  if (curr === prev) return { label: '–', changed: false };  // không tăng/giảm
  const pct = Math.round((Math.abs(curr - prev) / Math.abs(prev)) * 100);
  return { label: `${pct}%`, changed: true };
}

function TrendBadge({ curr, prev, goodWhenUp }: { curr: number; prev: number; goodWhenUp: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = pctTrend(curr, prev);
  if (!t.changed) {
    return (
      <View style={styles.trendRow}>
        <MaterialIcon name="remove" size={11} color={colors.onSurfaceVariant} />
        <Text style={[styles.trendText, { color: colors.onSurfaceVariant }]}>{t.label}</Text>
      </View>
    );
  }
  const up = curr >= prev;
  const good = goodWhenUp ? up : !up;
  const color = good ? colors.tertiary : colors.error;
  return (
    <View style={styles.trendRow}>
      <MaterialIcon name={up ? 'arrow_upward' : 'arrow_downward'} size={11} color={color} />
      <Text style={[styles.trendText, { color }]}>{t.label}</Text>
    </View>
  );
}

/** Three-column month summary: Thu nhập · Chi tiêu · Tổng, each with a trend. */
export function TransactionSummaryBanner({
  income,
  expense,
  monthNet,
  prevIncome,
  prevExpense,
}: TransactionSummaryBannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasPrevData = prevIncome > 0 || prevExpense > 0;
  const prevNet = prevIncome - prevExpense;

  return (
    <View style={styles.summaryBanner}>
      {/* Thu nhập — no sign */}
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>{'Thu nhập'}</Text>
        <Text style={[styles.summaryAmount, { color: colors.tertiary }]}>
          {formatVNDCompact(income)}
        </Text>
        {hasPrevData && <TrendBadge curr={income} prev={prevIncome} goodWhenUp />}
      </View>

      <View style={styles.summaryDivider} />

      {/* Chi tiêu — no sign */}
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>{'Chi tiêu'}</Text>
        <Text style={[styles.summaryAmount, { color: colors.error }]}>
          {formatVNDCompact(expense)}
        </Text>
        {hasPrevData && <TrendBadge curr={expense} prev={prevExpense} goodWhenUp={false} />}
      </View>

      <View style={styles.summaryDivider} />

      {/* Tổng — with sign */}
      <View style={styles.summaryCol}>
        <Text style={styles.summaryLabel}>{'Tổng'}</Text>
        <Text style={[styles.summaryAmount, { color: monthNet >= 0 ? colors.tertiary : colors.error }]}>
          {signedCompact(monthNet)}
        </Text>
        {hasPrevData && <TrendBadge curr={monthNet} prev={prevNet} goodWhenUp />}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    summaryBanner: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainerLow,
      paddingHorizontal: SPACING[4],
      paddingTop: SPACING[1],
      paddingBottom: SPACING[2],
      gap: SPACING[2],
    },
    summaryCol: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.surfaceContainer,
      borderRadius: BORDER_RADIUS.lg,
      paddingVertical: SPACING[2],
    },
    summaryLabel: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
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
}
