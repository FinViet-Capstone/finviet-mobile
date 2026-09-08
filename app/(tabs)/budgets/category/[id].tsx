import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { ZoomIn, FadeInDown } from 'react-native-reanimated';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { BudgetDonut } from '@/components/budget/BudgetDonut';
import { useBudgets } from '@/hooks/useBudgets';
import { useCustomerCategories } from '@/hooks/useCustomerCategories';
import { getCategoryById, getBucketColor, getBucketLabel } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { getBudgetStatus } from '@/utils/budgetStatus';
import { formatVND } from '@/utils/formatters';
import type { BucketType } from '@/constants/categories';
import type { BudgetWithSpend } from '@/types/budget';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  back: 'arrow_back',
  title: 'Chi tiết tiến độ',
  used: 'đã dùng',
  spent: 'Đã chi',
  limit: 'Hạn mức',
  left: 'Còn lại',
  over: 'Vượt mức',
  daysLeft: 'Ngày còn lại',
  paceTitle: 'Tiến độ theo ngày',
  dayOf: (day: number, total: number) => `Ngày ${day}/${total} của tháng`,
  expected: 'Dự kiến đến hôm nay',
  actual: 'Thực tế đã chi',
  deviation: 'Chênh lệch',
  ahead: 'Chi nhanh hơn dự kiến',
  behind: 'Chi chậm hơn dự kiến',
  onTrack: 'Đúng nhịp chi tiêu',
  adviceTitle: 'Gợi ý',
  statusSafe: 'Vẫn trong hạn mức',
  statusWarning: 'Sắp chạm hạn mức',
  statusDanger: 'Gần chạm hạn mức',
  statusOver: 'Đã vượt hạn mức',
  savingsReached: 'Đã đạt mục tiêu tiết kiệm',
  savingsProgress: 'Đang tích luỹ',
  monthEndLeft: (s: string) => `Tháng đã kết thúc, bạn còn dư ${s} trong hạn mức.`,
  overAdvice: (s: string) =>
    `Bạn đã chi vượt ${s}. Cân nhắc tạm dừng nhóm chi này hoặc nâng hạn mức nếu đây là khoản cần thiết.`,
  dailyAdvice: (amount: string, days: number) =>
    `Bạn còn có thể chi khoảng ${amount} mỗi ngày trong ${days} ngày còn lại để giữ đúng hạn mức.`,
  savingsAdvice: (s: string) => `Bạn còn cần tiết kiệm ${s} nữa để đạt mục tiêu tháng này.`,
  savingsDone: 'Bạn đã hoàn thành mục tiêu tiết kiệm của tháng này. Rất tốt!',
  notFoundTitle: 'Chưa có hạn mức',
  notFoundText: 'Danh mục này chưa được đặt hạn mức cho tháng đã chọn.',
  goBack: 'Quay lại',
};

const DONUT_SIZE = 208;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pace {
  /** Elapsed day of the viewed month (the whole month for a past month). */
  day: number;
  totalDays: number;
  daysLeft: number;
  /** limit × elapsed fraction — the same straight-line model the buckets use. */
  expectedSpent: number;
  /** spent − expectedSpent; positive = spending faster than the month elapses. */
  deviation: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Straight-line pace for the month being viewed. A past month is fully
 * elapsed, so its expected spend is the whole limit and `daysLeft` is 0.
 */
export function computePace(endDate: string, limit: number, spent: number, now: Date): Pace {
  const [yearStr, monthStr] = endDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const totalDays = daysInMonth(year, month);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const day = isCurrentMonth ? now.getDate() : totalDays;
  const expectedSpent = Math.round(limit * (day / totalDays));
  return {
    day,
    totalDays,
    daysLeft: Math.max(0, totalDays - day),
    expectedSpent,
    deviation: spent - expectedSpent,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BudgetCategoryDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { id, startDate, endDate } = useLocalSearchParams<{
    id: string;
    startDate?: string;
    endDate?: string;
  }>();

  const now = useMemo(() => new Date(), []);
  const range = useMemo(
    () => (startDate && endDate ? { startDate, endDate } : undefined),
    [startDate, endDate],
  );

  const { data: budgets = [], isLoading, isError, error, refetch, isRefetching } = useBudgets(range);
  const { data: customerCats = [] } = useCustomerCategories();

  const budget = useMemo(
    () => (budgets as BudgetWithSpend[]).find((b) => b.categoryId === id),
    [budgets, id],
  );

  const category = id ? getCategoryById(id) : undefined;
  const bucket = (customerCats.find((c) => c.categoryId === id)?.bucketId ??
    category?.defaultBucket ??
    'needs') as BucketType;

  const handleBack = useCallback(() => router.back(), [router]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const name = category?.nameVi ?? budget?.categoryName ?? '';
  const bucketColor = getBucketColor(bucket);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.headerBtn}
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={S.goBack}
      >
        <MaterialIcon name={S.back} size={22} color={colors.primary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name || S.title}
        </Text>
      </View>
      <View style={styles.headerBtn} />
    </View>
  );

  if (!budget) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <EmptyState icon="donut_large" title={S.notFoundTitle} subtitle={S.notFoundText} />
      </SafeAreaView>
    );
  }

  const isSavings = bucket === 'savings';
  const isOver = budget.percentage > 100;
  // Savings is a target, not a cap: passing it is the good outcome, so it never
  // gets the red treatment and stays neutral below target — the same asymmetry
  // the Budgets tab's rows and bucket cards already use.
  const isGoodOver = isOver && isSavings;
  const isBadOver = isOver && !isSavings;
  const status = getBudgetStatus(budget.percentage);
  const accent = isGoodOver
    ? colors.tertiary
    : isBadOver
    ? colors.error
    : isSavings
    ? colors.onSurfaceVariant
    : colors.budget[status];

  const statusText = isSavings
    ? isOver
      ? S.savingsReached
      : S.savingsProgress
    : isBadOver
    ? S.statusOver
    : status === 'danger'
    ? S.statusDanger
    : status === 'warning'
    ? S.statusWarning
    : S.statusSafe;

  const statusIcon = isGoodOver
    ? 'check_circle'
    : isBadOver
    ? 'error'
    : status === 'safe'
    ? 'check_circle'
    : 'warning';

  const pace = computePace(
    endDate ?? budget.updatedAt.slice(0, 10),
    budget.monthlyLimit,
    budget.spent,
    now,
  );
  const paceState =
    Math.abs(pace.deviation) <= budget.monthlyLimit * 0.05
      ? 'on_track'
      : pace.deviation > 0
      ? 'ahead'
      : 'behind';
  const paceColor =
    paceState === 'on_track'
      ? colors.tertiary
      : paceState === 'ahead'
      ? colors.warning
      : colors.primary;
  const paceLabel =
    paceState === 'on_track' ? S.onTrack : paceState === 'ahead' ? S.ahead : S.behind;

  const overAmount = Math.max(0, budget.spent - budget.monthlyLimit);
  const remaining = Math.max(0, budget.monthlyLimit - budget.spent);
  const dailyAllowance = pace.daysLeft > 0 ? Math.round(remaining / pace.daysLeft) : 0;

  const advice = isSavings
    ? isOver || remaining === 0
      ? S.savingsDone
      : S.savingsAdvice(formatVND(remaining))
    : isBadOver
    ? S.overAdvice(formatVND(overAmount))
    : pace.daysLeft === 0
    ? S.monthEndLeft(formatVND(remaining))
    : S.dailyAdvice(formatVND(dailyAllowance), pace.daysLeft);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Hero — the zoomed-in version of the row's small donut */}
        <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: withAlpha(bucketColor, 0.16) }]}>
              <MaterialIcon
                name={getCategoryIcon(category?.icon ?? budget.categoryIcon)}
                size={20}
                color={bucketColor}
              />
            </View>
            <Text
              style={[
                styles.bucketChip,
                { color: bucketColor, borderColor: withAlpha(bucketColor, 0.4) },
              ]}
            >
              {getBucketLabel(bucket)}
            </Text>
          </View>

          <BudgetDonut
            percentage={budget.percentage}
            color={accent}
            trackColor={colors.surfaceContainerHighest}
            size={DONUT_SIZE}
            strokeWidth={16}
            labelSize={FONT_SIZE['4xl']}
            labelColor={colors.onSurface}
            caption={S.used}
            captionColor={colors.onSurfaceVariant}
            captionSize={FONT_SIZE.sm}
          />

          <View style={[styles.statusPill, { backgroundColor: withAlpha(accent, 0.14) }]}>
            <MaterialIcon name={statusIcon} size={16} color={accent} />
            <Text style={[styles.statusText, { color: accent }]}>{statusText}</Text>
          </View>

          <Text style={styles.heroAmounts}>
            <Text style={[styles.heroSpent, { color: accent }]}>{formatVND(budget.spent)}</Text>
            {`  /  ${formatVND(budget.monthlyLimit)}`}
          </Text>
        </Animated.View>

        {/* Numbers */}
        <Animated.View entering={FadeInDown.delay(60)} style={styles.statGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{S.spent}</Text>
            <Text style={styles.statValue}>{formatVND(budget.spent)}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{S.limit}</Text>
            <Text style={styles.statValue}>{formatVND(budget.monthlyLimit)}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{isBadOver ? S.over : S.left}</Text>
            <Text style={[styles.statValue, isBadOver && { color: colors.error }]}>
              {formatVND(isBadOver ? overAmount : remaining)}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{S.daysLeft}</Text>
            <Text style={styles.statValue}>{pace.daysLeft}</Text>
          </View>
        </Animated.View>

        {/* Pace — actual against the straight-line expectation */}
        <Animated.View entering={FadeInDown.delay(120)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{S.paceTitle}</Text>
            <Text style={styles.cardMeta}>{S.dayOf(pace.day, pace.totalDays)}</Text>
          </View>

          <View style={styles.paceTrack}>
            <View
              style={[
                styles.paceFill,
                { width: `${Math.min(budget.percentage, 100)}%`, backgroundColor: accent },
              ]}
            />
            <View
              style={[
                styles.paceMarker,
                {
                  left: `${Math.min((pace.day / pace.totalDays) * 100, 100)}%`,
                  backgroundColor: colors.onSurface,
                },
              ]}
            />
          </View>

          <View style={styles.paceRow}>
            <Text style={styles.paceLabel}>{S.expected}</Text>
            <Text style={styles.paceValue}>{formatVND(pace.expectedSpent)}</Text>
          </View>
          <View style={styles.paceRow}>
            <Text style={styles.paceLabel}>{S.actual}</Text>
            <Text style={styles.paceValue}>{formatVND(budget.spent)}</Text>
          </View>
          <View style={styles.paceRow}>
            <Text style={styles.paceLabel}>{S.deviation}</Text>
            <Text style={[styles.paceValue, { color: paceColor }]}>
              {`${pace.deviation >= 0 ? '+' : '−'}${formatVND(pace.deviation)}`}
            </Text>
          </View>
          <View style={styles.paceStateRow}>
            <MaterialIcon
              name={
                paceState === 'ahead'
                  ? 'trending_up'
                  : paceState === 'behind'
                  ? 'trending_down'
                  : 'check'
              }
              size={16}
              color={paceColor}
            />
            <Text style={[styles.paceState, { color: paceColor }]}>{paceLabel}</Text>
          </View>
        </Animated.View>

        {/* Advice */}
        <Animated.View
          entering={FadeInDown.delay(180)}
          style={[styles.card, { borderLeftWidth: 4, borderLeftColor: accent }]}
        >
          <Text style={styles.cardTitle}>{S.adviceTitle}</Text>
          <Text style={styles.adviceText}>{advice}</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[2],
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: SPACING[4],
      paddingBottom: SPACING[12],
      gap: SPACING[4],
    },
    heroCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: SPACING[5],
      gap: SPACING[4],
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      justifyContent: 'space-between',
    },
    heroIcon: {
      width: 40,
      height: 40,
      borderRadius: BORDER_RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bucketChip: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[3],
      paddingVertical: 4,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[1],
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1],
      borderRadius: BORDER_RADIUS.full,
    },
    statusText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
    },
    heroAmounts: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
    },
    heroSpent: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
    },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING[3],
    },
    statCell: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: SPACING[3],
      gap: 2,
    },
    statLabel: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
    },
    statValue: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurface,
    },
    card: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: SPACING[4],
      gap: SPACING[2],
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurface,
    },
    cardMeta: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
    },
    paceTrack: {
      height: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: BORDER_RADIUS.full,
      marginVertical: SPACING[2],
      justifyContent: 'center',
    },
    paceFill: {
      height: '100%',
      borderRadius: BORDER_RADIUS.full,
    },
    paceMarker: {
      position: 'absolute',
      top: -3,
      width: 2,
      height: 14,
      borderRadius: 1,
    },
    paceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    paceLabel: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
    },
    paceValue: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurface,
    },
    paceStateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[1],
      marginTop: SPACING[1],
    },
    paceState: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
    },
    adviceText: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
      lineHeight: 20,
    },
  });
}
