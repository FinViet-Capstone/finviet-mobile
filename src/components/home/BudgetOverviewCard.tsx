import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import {
  BudgetAllocationPie,
  computePieSegments,
  segmentFillColor,
  type PieBucket,
} from '@/components/budget/BudgetAllocationPie';
import { BucketDetailPopup } from '@/components/budget/BucketDetailPopup';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';
import { getBudgetStatus } from '@/utils/budgetStatus';

const S = {
  title: 'Ngân sách tháng này',
  detail: 'Chi tiết →',
  hint: 'Nhấn giữ một phần của biểu đồ để xem chi tiết',
  needs: 'Thiết yếu',
  wants: 'Mong muốn',
  savings: 'Tiết kiệm',
  a11yHint: 'Nhấn giữ để xem chi tiết bucket này',
  a11yLabel: (label: string, pct: number, spent: string, limit: string) =>
    `${label}: đã dùng ${pct}%, ${spent} trên ${limit}`,
};

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

export interface BudgetOverviewCardProps {
  readonly needsSpent: number;
  readonly needsLimit: number;
  readonly wantsSpent: number;
  readonly wantsLimit: number;
  readonly savingsSpent: number;
  readonly savingsLimit: number;
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
  const [openedKey, setOpenedKey] = useState<string | null>(null);

  const buckets = useMemo<PieBucket[]>(
    () => [
      { key: 'needs', label: S.needs, spent: needsSpent, limit: needsLimit, color: colors.primary },
      { key: 'wants', label: S.wants, spent: wantsSpent, limit: wantsLimit, color: colors.secondary },
      {
        key: 'savings',
        label: S.savings,
        spent: savingsSpent,
        limit: savingsLimit,
        color: colors.tertiary,
        goalMode: true,
      },
    ],
    [needsSpent, needsLimit, wantsSpent, wantsLimit, savingsSpent, savingsLimit, colors],
  );

  // The legend dot has to track the sector's colour, including the switch to
  // danger once a bucket goes over — otherwise the legend stops identifying
  // the very sector that just turned red.
  const segments = useMemo(() => computePieSegments(buckets), [buckets]);

  const openDetail = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpenedKey(key);
  };

  const opened = buckets.find((b) => b.key === openedKey) ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{S.title}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')} activeOpacity={0.7}>
          <Text style={styles.detailLink}>{S.detail}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartWrap}>
        <BudgetAllocationPie buckets={buckets} onSegmentLongPress={openDetail} />
      </View>

      <View style={styles.hintRow}>
        <MaterialIcon name="touch_app" size={13} color={colors.onSurfaceVariant} />
        <Text style={styles.hintText}>{S.hint}</Text>
      </View>

      <View style={styles.legend}>
        {buckets.map((bucket) => {
          const segment = segments.find((s) => s.bucket.key === bucket.key);
          const dotColor = segment ? segmentFillColor(segment, colors) : bucket.color;
          const pct = getDisplayedPercentage(bucket.spent, bucket.limit);
          const isBadOver = !!segment?.isOver && !bucket.goalMode;
          return (
            <TouchableOpacity
              key={bucket.key}
              style={styles.legendRow}
              activeOpacity={0.7}
              onLongPress={() => openDetail(bucket.key)}
              delayLongPress={280}
              accessibilityRole="button"
              accessibilityLabel={S.a11yLabel(
                bucket.label,
                pct,
                formatVND(bucket.spent),
                formatVND(bucket.limit),
              )}
              accessibilityHint={S.a11yHint}
            >
              <View style={[styles.legendDot, { backgroundColor: dotColor }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{bucket.label}</Text>
              {isBadOver && (
                <MaterialIcon name="warning" size={14} color={colors.budget.danger} />
              )}
              <Text style={styles.legendAmount} numberOfLines={1}>
                <Text style={[styles.legendSpent, isBadOver && { color: colors.budget.danger }]}>
                  {formatVND(bucket.spent)}
                </Text>
                <Text style={styles.legendLimit}> / {formatVND(bucket.limit)}</Text>
              </Text>
              <View
                style={[
                  styles.pctBadge,
                  {
                    backgroundColor: withAlpha(
                      getPctColor(bucket.spent, bucket.limit, colors, bucket.goalMode),
                      0.15,
                    ),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pctText,
                    { color: getPctColor(bucket.spent, bucket.limit, colors, bucket.goalMode) },
                  ]}
                >
                  {pct}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <BucketDetailPopup
        bucket={opened}
        onClose={() => setOpenedKey(null)}
        onOpenBudgets={() => {
          setOpenedKey(null);
          router.push('/(tabs)/budgets');
        }}
      />
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
    marginBottom: SPACING[4],
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
  chartWrap: {
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[3],
  },
  hintText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  legend: {
    marginTop: SPACING[4],
    gap: SPACING[3],
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
  },
  legendAmount: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    textAlign: 'right',
  },
  legendSpent: {
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  legendLimit: {
    color: colors.onSurfaceVariant,
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
  });
}
