import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';
import { getBudgetStatus } from '@/utils/budgetStatus';

const TICK_COUNT = 10;

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

function EnergyBar({ spent, limit, activeColor }: { spent: number; limit: number; activeColor: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeTicks = Math.round(
    (getDisplayedPercentage(spent, limit) / 100) * TICK_COUNT,
  );
  return (
    <View style={styles.tickRow}>
      {Array.from({ length: TICK_COUNT }, (_, i) => (
        <View
          key={i}
          style={[
            styles.tick,
            { backgroundColor: i < activeTicks ? activeColor : colors.surfaceContainerHighest },
          ]}
        />
      ))}
    </View>
  );
}

function PctBadge({ spent, limit, goalMode }: { spent: number; limit: number; goalMode?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pct = getDisplayedPercentage(spent, limit);
  const color = getPctColor(spent, limit, colors, goalMode);
  return (
    <View style={[styles.pctBadge, { backgroundColor: withAlpha(color, 0.15) }]}>
      <Text style={[styles.pctText, { color }]}>{pct}%</Text>
    </View>
  );
}

function BucketItem({ label, spent, limit, activeColor, goalMode }: BucketRow) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.bucketItem}>
      <View style={styles.bucketHeader}>
        <Text style={styles.bucketLabel}>{label}</Text>
        <View style={styles.bucketRight}>
          <Text style={styles.bucketAmount}>
            <Text style={styles.bucketSpent}>{formatVND(spent)}</Text>
            <Text style={styles.bucketLimit}> / {formatVND(limit)}</Text>
          </Text>
          <PctBadge spent={spent} limit={limit} goalMode={goalMode} />
        </View>
      </View>
      <EnergyBar spent={spent} limit={limit} activeColor={activeColor} />
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
    gap: SPACING[4],
  },
  bucketItem: {
    gap: SPACING[2],
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  pctBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  pctText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  bucketLabel: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
  },
  bucketAmount: {
    fontSize: FONT_SIZE.sm,
  },
  bucketSpent: {
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  bucketLimit: {
    color: colors.onSurfaceVariant,
  },
  tickRow: {
    flexDirection: 'row',
    height: 10,
    gap: 2,
  },
  tick: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  });
}
