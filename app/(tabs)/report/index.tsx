import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import {
  useWallets,
  useTransactions,
  useSpendingScore,
  useWeeklyReport,
} from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Donut } from '@/components/charts/Donut';
import { WeeklySpendingSwiper } from '@/components/charts/WeeklySpendingSwiper';
import { RingBadge } from '@/components/charts/RingBadge';
import { CATEGORIES } from '@/constants/categories';
import { formatVND } from '@/utils/formatters';
import type { Transaction } from '@/types';

const MONDAY_FIRST_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function ReportScreen() {
  const router = useRouter();
  const { data: walletData, isLoading: walletsLoading } = useWallets();
  const { data: score } = useSpendingScore();
  const { data: weekly } = useWeeklyReport();

  // Current month range
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const { data: monthTx } = useTransactions({
    startDate: ymd(monthStart),
    endDate: ymd(monthEnd),
  });

  // Week range no longer used here — the WeeklySpendingSwiper owns its own
  // per-week queries so the user can page back through history.

  // Last month for WoW comparison
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const { data: prevMonthTx } = useTransactions({
    startDate: ymd(prevMonthStart),
    endDate: ymd(prevMonthEnd),
  });

  const totalBalance = walletData?.totalBalance ?? 0;

  // Donut data: month expenses by category
  const donutData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of monthTx ?? []) {
      if (tx.type !== 'expense' || tx.categoryId === null) continue;
      totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return Array.from(totals.entries())
      .map(([id, amount]) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        return {
          x: cat?.nameVi ?? 'Khác',
          y: amount,
          color: cat?.color ?? COLORS.gray[400],
          categoryId: id,
        };
      })
      .sort((a, b) => b.y - a.y);
  }, [monthTx]);

  const monthExpenseTotal = donutData.reduce((sum, d) => sum + d.y, 0);

  // Week bars are rendered by WeeklySpendingSwiper below; this screen no longer
  // pre-aggregates a single week.

  // Top 5 merchants this month
  const topMerchants = useMemo(() => {
    const merchants = new Map<string, { total: number; count: number }>();
    for (const tx of monthTx ?? []) {
      if (tx.type !== 'expense' || !tx.merchant) continue;
      const cur = merchants.get(tx.merchant) ?? { total: 0, count: 0 };
      cur.total += tx.amount;
      cur.count += 1;
      merchants.set(tx.merchant, cur);
    }
    return Array.from(merchants.entries())
      .map(([merchant, v]) => ({ merchant, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthTx]);

  // Week-over-week comparison: this month total vs last month total (avg-day basis)
  const prevMonthTotal = useMemo(() => {
    return (prevMonthTx ?? [])
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
  }, [prevMonthTx]);

  const wowDelta = monthExpenseTotal - prevMonthTotal;
  const wowPct =
    prevMonthTotal > 0 ? (wowDelta / prevMonthTotal) * 100 : 0;

  if (walletsLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Báo cáo</Text>
            <Text style={styles.headerSubtitle}>Tổng quan tài chính của bạn</Text>
          </View>
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => router.push('/(tabs)/report/advisor')}
            activeOpacity={0.85}
          >
            <Text style={styles.aiIcon}>🤖</Text>
          </TouchableOpacity>
        </View>

        {/* Total balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Tổng số dư</Text>
          <Text style={styles.balanceAmount}>{formatVND(totalBalance)}</Text>
          <Text style={styles.balanceSub}>
            Đã chi tháng này: {formatVND(monthExpenseTotal)}
          </Text>
        </View>

        {/* Weekly report banner */}
        {weekly && !weekly.isRead ? (
          <TouchableOpacity
            style={styles.bannerCard}
            onPress={() => router.push('/(tabs)/report/weekly')}
            activeOpacity={0.85}
          >
            <View style={styles.bannerIconWrap}>
              <Text style={styles.bannerIcon}>📰</Text>
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Báo cáo tuần đã sẵn sàng</Text>
              <Text style={styles.bannerSub} numberOfLines={2}>
                Khám phá phân tích AI về chi tiêu tuần qua của bạn.
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Spending Score */}
        {score ? (
          <TouchableOpacity
            style={styles.scoreCard}
            onPress={() => router.push('/(tabs)/report/score')}
            activeOpacity={0.85}
          >
            <RingBadge
              score={score.score}
              color={score.color}
              verdict={score.verdictVi}
              size={100}
            />
            <View style={styles.scoreText}>
              <Text style={styles.scoreTitle}>Chấm Điểm Ví</Text>
              <Text style={styles.scoreReason}>{score.reasonVi}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Donut */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
          <Text style={styles.sectionSubtitle}>Tháng này</Text>
          <View style={styles.chartCard}>
            <Donut data={donutData} formatValue={formatVND} />
            {donutData.length > 0 ? (
              <View style={styles.legend}>
                {donutData.slice(0, 5).map((d) => {
                  const pct = monthExpenseTotal
                    ? (d.y / monthExpenseTotal) * 100
                    : 0;
                  return (
                    <View key={d.categoryId} style={styles.legendRow}>
                      <View
                        style={[styles.legendDot, { backgroundColor: d.color }]}
                      />
                      <Text style={styles.legendLabel}>{d.x}</Text>
                      <Text style={styles.legendValue}>
                        {pct.toFixed(0)}% • {formatVND(d.y)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        {/* Week bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiêu theo ngày</Text>
          <Text style={styles.sectionSubtitle}>
            Vuốt sang trái để xem các tuần trước. Phần xám là chi tiêu chưa phân loại.
          </Text>
          <View style={styles.chartCard}>
            <WeeklySpendingSwiper
              dayLabels={MONDAY_FIRST_LABELS}
              formatValue={formatVND}
            />
          </View>
        </View>

        {/* WoW comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>So với tháng trước</Text>
          <View style={styles.compareCard}>
            <View>
              <Text style={styles.compareLabel}>Tháng này</Text>
              <Text style={styles.compareValue}>
                {formatVND(monthExpenseTotal)}
              </Text>
            </View>
            <View style={styles.compareDelta}>
              <Text
                style={[
                  styles.compareDeltaText,
                  { color: wowDelta > 0 ? COLORS.danger : COLORS.success },
                ]}
              >
                {wowDelta > 0 ? '↑' : '↓'} {Math.abs(wowPct).toFixed(1)}%
              </Text>
              <Text style={styles.compareSub}>so với T-1</Text>
            </View>
            <View style={styles.compareRight}>
              <Text style={styles.compareLabel}>Tháng trước</Text>
              <Text style={styles.compareValue}>{formatVND(prevMonthTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Top merchants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 5 nơi chi nhiều nhất</Text>
          <Text style={styles.sectionSubtitle}>Tháng này</Text>
          <View style={styles.merchantCard}>
            {topMerchants.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có dữ liệu trong tháng.</Text>
            ) : (
              topMerchants.map((m, i) => (
                <View key={m.merchant} style={styles.merchantRow}>
                  <Text style={styles.merchantRank}>{i + 1}</Text>
                  <View style={styles.merchantMain}>
                    <Text style={styles.merchantName} numberOfLines={1}>
                      {m.merchant}
                    </Text>
                    <Text style={styles.merchantCount}>{m.count} giao dịch</Text>
                  </View>
                  <Text style={styles.merchantTotal}>{formatVND(m.total)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  aiBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: { fontSize: 22 },

  balanceCard: {
    margin: SPACING[5],
    padding: SPACING[6],
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS['2xl'],
    ...SHADOW.lg,
  },
  balanceLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    marginBottom: SPACING[2],
  },
  balanceAmount: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[2],
  },
  balanceSub: { fontSize: FONT_SIZE.xs, color: COLORS.brand[100] },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[3],
    padding: SPACING[4],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
    ...SHADOW.sm,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  bannerIcon: { fontSize: 22 },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  bannerSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[3],
    padding: SPACING[4],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING[3],
    ...SHADOW.sm,
  },
  scoreText: { flex: 1 },
  scoreTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[1],
  },
  scoreReason: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[600],
    lineHeight: 18,
  },

  section: { paddingHorizontal: SPACING[5], marginBottom: SPACING[4] },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginBottom: SPACING[3],
  },

  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[3],
    ...SHADOW.sm,
  },
  legend: { paddingHorizontal: SPACING[2], paddingTop: SPACING[2] },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[1],
    gap: SPACING[2],
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.gray[800] },
  legendValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[600],
    fontWeight: FONT_WEIGHT.medium,
  },

  compareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  compareLabel: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },
  compareValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginTop: 2,
  },
  compareDelta: {
    flex: 1,
    alignItems: 'center',
  },
  compareDeltaText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  compareSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },
  compareRight: { alignItems: 'flex-end' },

  merchantCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[2],
    ...SHADOW.sm,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING[3],
  },
  merchantRank: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    color: COLORS.brand[600],
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    lineHeight: 24,
  },
  merchantMain: { flex: 1 },
  merchantName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  merchantCount: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },
  merchantTotal: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[400],
    textAlign: 'center',
    paddingVertical: SPACING[6],
  },

  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.gray[300],
    marginLeft: SPACING[2],
  },
});
