import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BudgetDonut } from '@/components/budget/BudgetDonut';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';
import { getBudgetStatus } from '@/utils/budgetStatus';

const DONUT_SIZE = 76;
const DONUT_STROKE = 7;

export function getDisplayedPercentage(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((spent / limit) * 100)));
}

function getPctColor(spent: number, limit: number, colors: ThemeColors, goalMode = false): string {
  if (limit === 0) return colors.budget.safe;
  const pct = (spent / limit) * 100;
  // Savings (goalMode): đạt/vượt mục tiêu = xanh; dưới mục tiêu = trung tính, KHÔNG đỏ.
  if (goalMode) return pct >= 100 ? colors.budget.safe : colors.onSurfaceVariant;
  return colors.budget[getBudgetStatus(pct)];
}

interface BucketRow {
  label: string;
  spent: number;
  limit: number;
  activeColor: string;
  goalMode?: boolean;
}

export interface BudgetOverviewCardProps {
  readonly needsSpent: number;
  readonly needsLimit: number;
  readonly wantsSpent: number;
  readonly wantsLimit: number;
  readonly savingsSpent: number;
  readonly savingsLimit: number;
}

function BucketItem({ label, spent, limit, activeColor, goalMode }: BucketRow) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pct = getDisplayedPercentage(spent, limit);
  const pctColor = getPctColor(spent, limit, colors, goalMode);

  return (
    <View
      style={styles.bucketItem}
      accessibilityRole="text"
      accessibilityLabel={`${label}: đã dùng ${pct}%, ${formatVND(spent)} trên ${formatVND(limit)}`}
    >
      <BudgetDonut
        percentage={pct}
        color={activeColor}
        trackColor={colors.surfaceContainerHighest}
        size={DONUT_SIZE}
        strokeWidth={DONUT_STROKE}
        labelColor={pctColor}
        labelSize={FONT_SIZE.base}
      />
      <Text style={styles.bucketLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.amounts}>
        <Text style={styles.bucketSpent} numberOfLines={1}>{formatVND(spent)}</Text>
        <Text style={styles.bucketLimit} numberOfLines={1}>/ {formatVND(limit)}</Text>
      </View>
    </View>
  );
}

export function BudgetOverviewCard({
  needsSpent,
  needsLimit,
  wantsSpent,
  wantsLimit,
  savingsSpent,
  savingsLimit,
}: BudgetOverviewCardProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Ngân sách tháng này</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')} activeOpacity={0.7}>
          <Text style={styles.detailLink}>Chi tiết →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bucketList}>
        <BucketItem
          label="Thiết yếu"
          spent={needsSpent}
          limit={needsLimit}
          activeColor={colors.primary}
        />
        <BucketItem
          label="Mong muốn"
          spent={wantsSpent}
          limit={wantsLimit}
          activeColor={colors.secondary}
        />
        <BucketItem
          label="Tiết kiệm"
          spent={savingsSpent}
          limit={savingsLimit}
          activeColor={colors.tertiary}
          goalMode
        />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: withAlpha(colors.outline, 0.1),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  detailLink: {
    fontSize: FONT_SIZE.sm,
    color: colors.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  bucketList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  bucketItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING[2],
  },
  bucketLabel: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
  amounts: {
    alignItems: 'center',
  },
  bucketSpent: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  bucketLimit: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
  },
  });
}
