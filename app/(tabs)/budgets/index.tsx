import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useBudgets } from '@/hooks/useBudgets';
import { useWallets } from '@/hooks/useWallets';
import { useUser } from '@/hooks/useUser';
import { EXPENSE_CATEGORIES, getBucketColor, getBucketIcon, getBucketLabel } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import SetLimitSheet from '@/components/budget/SetLimitSheet';
import type { BucketType } from '@/constants/categories';
import type { BudgetWithSpend } from '@/types/budget';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Ngân sách',
  tabBudget: 'Ngân sách',
  tabGoals: 'Mục tiêu tiết kiệm',
  settings: 'settings',
  prevMonth: 'chevron_left',
  nextMonth: 'chevron_right',
  jumpCurrent: 'keyboard_double_arrow_right',
  aiBadge: 'AI Dự báo',
  aiIcon: 'insights',
  setLimit: 'Đặt hạn mức',
  spent: 'Đã chi',
  of: '/',
  over: 'Vượt',
  left: 'Còn lại',
  noLimit: 'Chưa có hạn mức',
  months: [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toLocaleString('vi-VN');
}

function pacingStatus(currentDay: number, daysInMonth: number, buckets: BucketSummary[]): 'good' | 'warning' | 'over' {
  const over = buckets.filter((b) => b.allocationCap > 0 && b.percentage > 100);
  if (over.length > 0) return 'over';
  const paced = buckets.filter((b) => b.allocationCap > 0);
  if (paced.length === 0) return 'good';
  const avgPct = paced.reduce((s, b) => s + b.percentage, 0) / paced.length;
  const expectedPct = (currentDay / daysInMonth) * 100;
  if (avgPct > expectedPct * 1.1) return 'warning';
  return 'good';
}

function pacingHeadline(status: 'good' | 'warning' | 'over'): string {
  if (status === 'over') return 'Vượt ngân sách';
  if (status === 'warning') return 'Chi tiêu hơi nhanh';
  return 'Tiến độ tốt';
}

function pacingMessage(day: number, daysInMonth: number, buckets: BucketSummary[]): string {
  const daysLeft = daysInMonth - day;
  const paced = buckets.filter((b) => b.allocationCap > 0);

  if (paced.length === 0) return `Hôm nay là ngày ${day}/${daysInMonth} — chưa có hạn mức nào để theo dõi.`;

  const totalCap = paced.reduce((s, b) => s + b.allocationCap, 0);
  const totalSpent = paced.reduce((s, b) => s + b.spent, 0);
  const remaining = totalCap - totalSpent;

  const over = buckets.filter((b) => b.allocationCap > 0 && b.percentage > 100);
  if (over.length > 0) {
    const names = over.map((b) => getBucketLabel(b.bucket)).join(', ');
    return `${names} đã vượt hạn mức. Hãy điều chỉnh chi tiêu để tránh thâm hụt thêm.`;
  }

  if (daysLeft <= 0) {
    return remaining >= 0
      ? `Tháng kết thúc. Bạn còn dư ${formatVND(remaining)}đ trong ngân sách.`
      : `Tháng kết thúc. Bạn đã chi vượt ${formatVND(-remaining)}đ so với hạn mức.`;
  }

  const dailyAllowance = Math.max(0, Math.round(remaining / daysLeft));
  return `Bạn có thể chi tiêu ${formatVND(dailyAllowance)}đ mỗi ngày để giữ đúng ngân sách đến cuối tháng.`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BucketSummary {
  bucket: BucketType;
  spent: number;
  monthlyLimit: number;   // Σ category limits — for display / "vượt phân bổ" badge
  allocationCap: number;  // income × bucketPct — denominator for progress + pacing
  percentage: number;     // spent / allocationCap × 100
}

interface SetLimitTarget {
  categoryId: string;
  categoryName: string;
  bucket: BucketType;
  existingLimit?: number;
  allocationCap: number;
  remainingCap: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BucketCard({ summary }: { summary: BucketSummary }) {
  const color = getBucketColor(summary.bucket);
  const icon = getBucketIcon(summary.bucket);
  const label = getBucketLabel(summary.bucket);
  const isOverSpend = summary.percentage > 100;
  const isOverAllocated = summary.allocationCap > 0 && summary.monthlyLimit > summary.allocationCap;
  const barColor = isOverSpend ? COLORS.error : color;
  const barWidth = Math.min(summary.percentage, 100);

  return (
    <View style={[styles.bucketCard, isOverSpend && { borderColor: COLORS.error }]}>
      <View style={styles.bucketCardTop}>
        <Text style={[styles.bucketLabel, { color }]}>{label}</Text>
        {isOverAllocated
          ? <View style={styles.overAllocBadge}><Text style={styles.overAllocText}>vượt phân bổ</Text></View>
          : <MaterialIcon name={icon} size={16} color={color} />}
      </View>
      <View style={styles.bucketAmounts}>
        <Text style={[styles.bucketSpent, isOverSpend && { color: COLORS.error }]}>
          {formatVND(summary.spent)}
        </Text>
        <Text style={styles.bucketLimit}>
          {summary.allocationCap > 0 ? `/ ${formatVND(summary.allocationCap)}` : '—'}
        </Text>
      </View>
      <View style={styles.bucketBarTrack}>
        <View
          style={[
            styles.bucketBarFill,
            { width: `${barWidth}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

interface CategoryRowProps {
  categoryId: string;
  nameVi: string;
  icon: string;
  bucket: BucketType;
  budget?: BudgetWithSpend;
  allocationCap: number;
  remainingCap: number;
  onSetLimit: (target: SetLimitTarget) => void;
}

function CategoryRow({ categoryId, nameVi, icon, bucket, budget, allocationCap, remainingCap, onSetLimit }: CategoryRowProps) {
  const msIcon = getCategoryIcon(icon);
  const hasLimit = !!budget;
  const isOver = hasLimit && budget.percentage > 100;
  const barColor = isOver
    ? COLORS.error
    : budget?.status === 'warning'
    ? COLORS.warning
    : COLORS.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.categoryRow, isOver && styles.categoryRowOver]}
      onPress={() => onSetLimit({ categoryId, categoryName: nameVi, bucket, existingLimit: budget?.monthlyLimit, allocationCap, remainingCap })}
    >
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIconWrap, { backgroundColor: `${COLORS.primary}20` }]}>
          <MaterialIcon name={msIcon} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, isOver && { color: COLORS.error }]}>{nameVi}</Text>
          {hasLimit ? (
            <Text style={[styles.categoryMeta, isOver && { color: COLORS.error }]}>
              {formatVND(budget.spent)} {S.of} {formatVND(budget.monthlyLimit)} ₫
            </Text>
          ) : (
            <Text style={styles.categoryNoLimit}>{S.noLimit}</Text>
          )}
        </View>
      </View>

      {hasLimit ? (
        <View style={styles.categoryRight}>
          <Text style={[styles.categoryPct, { color: barColor }]}>
            {budget.percentage.toFixed(0)}%
          </Text>
          <View style={styles.categoryBarTrack}>
            <View
              style={[
                styles.categoryBarFill,
                { width: `${Math.min(budget.percentage, 100)}%` as any, backgroundColor: barColor },
              ]}
            />
          </View>
        </View>
      ) : (
        <View style={styles.setLimitBtn}>
          <MaterialIcon name="add" size={14} color={COLORS.primary} />
          <Text style={styles.setLimitText}>{S.setLimit}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BudgetsScreen() {
  const router = useRouter();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [limitTarget, setLimitTarget] = useState<SetLimitTarget | null>(null);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<BucketType>>(new Set());

  const { data: budgets = [], isLoading, isError, error, refetch } = useBudgets();
  const { data: wallets = [] } = useWallets();
  const { data: user } = useUser();

  const income = user?.monthlyIncome ?? 0;
  const bucketPct: Record<BucketType, number> = {
    needs: (user?.needsPct ?? 50) / 100,
    wants: (user?.wantsPct ?? 30) / 100,
    savings: (user?.savingsPct ?? 20) / 100,
  };

  const totalDays = daysInMonth(year, month);
  const currentDay = year === now.getFullYear() && month === now.getMonth() ? now.getDate() : totalDays;

  // Map categoryId → budget for fast lookup
  const budgetMap = useMemo(() => {
    const map: Record<string, BudgetWithSpend> = {};
    (budgets as BudgetWithSpend[]).forEach((b) => { map[b.categoryId] = b; });
    return map;
  }, [budgets]);

  // Bucket summaries — denominator is allocationCap, not Σ category limits
  const bucketSummaries = useMemo((): BucketSummary[] => {
    const bucketTypes: BucketType[] = ['needs', 'wants', 'savings'];
    return bucketTypes.map((bucket) => {
      const cats = EXPENSE_CATEGORIES.filter((c) => c.defaultBucket === bucket);
      const spent = cats.reduce((s, c) => s + (budgetMap[c.id]?.spent ?? 0), 0);
      const monthlyLimit = cats.reduce((s, c) => s + (budgetMap[c.id]?.monthlyLimit ?? 0), 0);
      const cap = Math.round(income * bucketPct[bucket]);
      const percentage = cap > 0 ? (spent / cap) * 100 : 0;
      return { bucket, spent, monthlyLimit, allocationCap: cap, percentage };
    });
  }, [budgetMap, income, bucketPct]);

  const handlePrevMonth = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }, [month]);

  const handleJumpCurrent = useCallback(() => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }, [now]);

  const handleToggleBucket = useCallback((bucket: BucketType) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  }, []);

  const handleSetLimit = useCallback((target: SetLimitTarget) => {
    setLimitTarget(target);
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const buckets: BucketType[] = ['needs', 'wants', 'savings'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/settings/budget-allocation' })}
        >
          <MaterialIcon name={S.settings} size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Toggle pill */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggle}>
          <View style={[styles.toggleOption, styles.toggleOptionActive]}>
            <Text style={styles.toggleTextActive}>{S.tabBudget}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.toggleOption}
            onPress={() => router.push({ pathname: '/(tabs)/budgets/goals' })}
          >
            <Text style={styles.toggleTextInactive}>{S.tabGoals}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity activeOpacity={0.7} onPress={handlePrevMonth} style={styles.monthNavBtn}>
            <MaterialIcon name={S.prevMonth} size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{S.months[month]}, {year}</Text>
          <View style={styles.monthNavRight}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleNextMonth} style={styles.monthNavBtn}>
              <MaterialIcon name={S.nextMonth} size={24} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleJumpCurrent} style={styles.monthNavBtn}>
              <MaterialIcon name={S.jumpCurrent} size={24} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Dự báo banner — Progress-First style */}
        {(() => {
          const status = pacingStatus(currentDay, totalDays, bucketSummaries);
          const accentColor = status === 'over' ? COLORS.error : status === 'warning' ? COLORS.secondary : COLORS.tertiary;
          return (
            <View style={[styles.aiBanner, { borderLeftColor: accentColor }]}>
              <View style={styles.aiBadgeRow}>
                <View style={styles.aiBadge}>
                  <MaterialIcon name={S.aiIcon} size={14} color={COLORS.primary} />
                  <Text style={styles.aiBadgeText}>{S.aiBadge}</Text>
                </View>
              </View>
              <Text style={[styles.aiHeadline, { color: accentColor }]}>
                {pacingHeadline(status)}
              </Text>
              <Text style={styles.aiMessage}>
                {pacingMessage(currentDay, totalDays, bucketSummaries)}
              </Text>
            </View>
          );
        })()}

        {/* 3-col bucket cards */}
        <View style={styles.bucketRow}>
          {bucketSummaries.map((s) => (
            <BucketCard key={s.bucket} summary={s} />
          ))}
        </View>

        {/* Category groups — Reddit thread style */}
        {buckets.map((bucket) => {
          const cats = EXPENSE_CATEGORIES.filter((c) => c.defaultBucket === bucket);
          const isCollapsed = collapsedBuckets.has(bucket);
          const color = getBucketColor(bucket);
          return (
            <View key={bucket} style={styles.categoryGroup}>
              {/* Collapsible group header */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.groupHeader}
                onPress={() => handleToggleBucket(bucket)}
              >
                <View style={[styles.groupDot, { backgroundColor: color }]} />
                <Text style={[styles.groupTitle, { color }]}>{getBucketLabel(bucket)}</Text>
                <Text style={styles.groupCount}>{cats.length}</Text>
                <MaterialIcon
                  name={isCollapsed ? 'expand_more' : 'expand_less'}
                  size={20}
                  color={COLORS.onSurfaceVariant}
                />
              </TouchableOpacity>

              {/* Thread-line + category rows */}
              {!isCollapsed && (
                <View style={styles.threadWrap}>
                  {/* Vertical thread line */}
                  <View style={[styles.threadLine, { backgroundColor: color }]} />
                  <View style={styles.threadRows}>
                    {cats.map((cat, idx) => {
                      const cap = Math.round(income * bucketPct[bucket]);
                      const otherLimitsSum = cats
                        .filter((c) => c.id !== cat.id)
                        .reduce((s, c) => s + (budgetMap[c.id]?.monthlyLimit ?? 0), 0);
                      const remaining = cap - otherLimitsSum;
                      return (
                        <View key={cat.id} style={styles.threadRowWrap}>
                          {/* Horizontal connector */}
                          <View style={[styles.threadConnector, { borderColor: color }]} />
                          <View style={{ flex: 1 }}>
                            <CategoryRow
                              categoryId={cat.id}
                              nameVi={cat.nameVi}
                              icon={cat.icon}
                              bucket={bucket}
                              budget={budgetMap[cat.id]}
                              allocationCap={cap}
                              remainingCap={remaining}
                              onSetLimit={handleSetLimit}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Set Limit Sheet */}
      {limitTarget && (
        <SetLimitSheet
          visible={!!limitTarget}
          categoryId={limitTarget.categoryId}
          categoryName={limitTarget.categoryName}
          bucket={getBucketLabel(limitTarget.bucket)}
          existingLimit={limitTarget.existingLimit}
          allocationCap={limitTarget.allocationCap}
          remainingCap={limitTarget.remainingCap}
          onClose={() => setLimitTarget(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  toggleWrap: {
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[2],
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  toggleOptionActive: {
    backgroundColor: COLORS.primary,
  },
  toggleTextActive: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
  toggleTextInactive: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[12],
    gap: SPACING[4],
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[2],
  },
  monthNavBtn: {
    padding: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  monthNavRight: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  monthLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  aiBanner: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderLeftWidth: 4,
    gap: SPACING[2],
    overflow: 'hidden',
  },
  aiBadgeRow: {
    flexDirection: 'row',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  aiBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  aiHeadline: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  aiMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
    lineHeight: 20,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  bucketCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    gap: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  bucketCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  bucketAmounts: {
    gap: 2,
  },
  bucketSpent: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },
  bucketLimit: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },
  bucketBarTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  bucketBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  categoryGroup: {
    gap: SPACING[2],
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  groupTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    flex: 1,
  },
  groupCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.semibold,
  },
  // Thread-line layout
  threadWrap: {
    flexDirection: 'row',
    paddingLeft: SPACING[3],
  },
  threadLine: {
    width: 2,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING[2],
    opacity: 0.4,
  },
  threadRows: {
    flex: 1,
    gap: SPACING[2],
  },
  threadRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadConnector: {
    width: SPACING[3],
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginRight: SPACING[1],
    opacity: 0.4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minHeight: 48,
  },
  categoryRowOver: {
    borderColor: `${COLORS.error}50`,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
  },
  categoryMeta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  categoryNoLimit: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
    gap: 4,
    width: 64,
  },
  categoryPct: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  categoryBarTrack: {
    width: 64,
    height: 4,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  setLimitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  setLimitText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  overAllocBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.secondary}20`,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}40`,
  },
  overAllocText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.secondary,
  },
});
