import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CalendarDays, BarChart3 } from 'lucide-react-native';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useTransactions, useBudgets, useUser } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { WeeklySpendingSwiper } from '@/components/charts/WeeklySpendingSwiper';
import { formatVND, formatVNDCompact } from '@/utils/formatters';
import type { Transaction } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const VI_DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const DOUBLE_TAP_MS = 300;
type CalendarView = 'calendar' | 'bar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayCell {
  iso: string;
  dayOfMonth: number;
  total: number;
  hasUncategorized: boolean;
  isOverBudget: boolean;
  hasActivity: boolean;
  isToday: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(year: number, monthIdx: number, day: number): string {
  return `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`;
}

function todayISO(): string {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatVietnameseDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `Ngày ${parseInt(d, 10)} tháng ${parseInt(m, 10)}, ${y}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const today  = new Date();

  // View toggle: calendar grid or weekly bar chart
  const [activeView, setActiveView] = useState<CalendarView>('calendar');

  // Calendar viewport
  const [year, setYear]         = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());

  // Shared: the selected ISO date drives the day detail panel in both views
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());
  const [lastTap, setLastTap]         = useState<{ iso: string; at: number } | null>(null);

  const monthStartISO = isoDate(year, monthIdx, 1);
  const monthEndISO   = isoDate(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate());

  const { data: transactions, isLoading } = useTransactions({
    startDate: monthStartISO,
    endDate: monthEndISO,
  });
  // Dedicated single-day query for the detail panel — always scoped to the
  // selected date so it stays accurate even when the calendar month viewport
  // has been scrolled to a different month (which would otherwise empty out
  // the month-level `transactions` and make the panel appear blank).
  const { data: selectedDayTxs } = useTransactions({
    startDate: selectedISO,
    endDate: selectedISO,
  });
  const { data: budgets } = useBudgets();
  const { data: user }    = useUser();

  const monthlyLimit = useMemo(
    () => (budgets ?? []).reduce((sum, b) => sum + b.monthlyLimit, 0),
    [budgets],
  );

  const daysInMonth   = new Date(year, monthIdx + 1, 0).getDate();
  const dailyAvgLimit =
    monthlyLimit > 0 ? monthlyLimit / daysInMonth : user?.dailySpendLimit ?? 0;

  // Per-day aggregations (expenses only, transfers excluded)
  const dayMap = useMemo(() => {
    const map = new Map<string, { total: number; hasUncategorized: boolean }>();
    if (!transactions) return map;
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const cur = map.get(tx.transactionDate) ?? { total: 0, hasUncategorized: false };
      cur.total += tx.amount;
      if (tx.categoryId === null) cur.hasUncategorized = true;
      map.set(tx.transactionDate, cur);
    }
    return map;
  }, [transactions]);

  const dayCells: DayCell[] = useMemo(() => {
    const cells: DayCell[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const iso              = isoDate(year, monthIdx, day);
      const agg              = dayMap.get(iso);
      const total            = agg?.total ?? 0;
      const hasUncategorized = agg?.hasUncategorized ?? false;
      const hasActivity      = total > 0;
      const isOverBudget     = dailyAvgLimit > 0 && hasActivity && total > dailyAvgLimit;
      cells.push({ iso, dayOfMonth: day, total, hasUncategorized, isOverBudget, hasActivity, isToday: iso === todayISO() });
    }
    return cells;
  }, [dayMap, daysInMonth, dailyAvgLimit, year, monthIdx]);

  const sundayOffset  = new Date(year, monthIdx, 1).getDay();
  const firstDOW      = (sundayOffset + 6) % 7;
  const leadingBlanks = Array.from({ length: firstDOW }, () => null);

  const monthExpenses      = (transactions ?? []).filter((t) => t.type === 'expense');
  const monthTotal         = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const uncategorizedCount = monthExpenses.filter((t) => t.categoryId === null).length;

  // The day panel uses its own query result — not a filter of the month slice —
  // so it is always correct regardless of which month the calendar is browsing.
  const dayTransactions = selectedDayTxs ?? [];

  // ── Event handlers ──────────────────────────────────────────────────────────

  const handlePrevMonth = () => {
    if (monthIdx === 0) { setYear(year - 1); setMonthIdx(11); }
    else setMonthIdx(monthIdx - 1);
  };
  const handleNextMonth = () => {
    if (monthIdx === 11) { setYear(year + 1); setMonthIdx(0); }
    else setMonthIdx(monthIdx + 1);
  };

  const handleDayTap = (cell: DayCell) => {
    const now = Date.now();
    if (lastTap && lastTap.iso === cell.iso && now - lastTap.at < DOUBLE_TAP_MS) {
      router.push(`/(tabs)/entry?date=${cell.iso}` as never);
      setLastTap(null);
      return;
    }
    setSelectedISO(cell.iso);
    setLastTap({ iso: cell.iso, at: now });
  };

  // Single tap on a bar in bar view → update selectedISO → show day panel
  const handleBarDayPress = (iso: string) => setSelectedISO(iso);

  const handleEntryTap         = (txId: string) => router.push(`/(tabs)/calendar/edit-entry?id=${txId}` as never);
  const handleFixUncategorized = ()              => router.push(`/(tabs)/calendar/edit-entry?uncategorized=1` as never);

  if (isLoading) return <LoadingSpinner />;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch chi tiêu</Text>

        {/* Circular icon-only segmented control */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeView === 'calendar' && styles.segmentBtnActive]}
            onPress={() => setActiveView('calendar')}
            activeOpacity={0.8}
          >
            <CalendarDays
              size={18}
              color={activeView === 'calendar' ? COLORS.white : COLORS.gray[500]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeView === 'bar' && styles.segmentBtnActive]}
            onPress={() => setActiveView('bar')}
            activeOpacity={0.8}
          >
            <BarChart3
              size={18}
              color={activeView === 'bar' ? COLORS.white : COLORS.gray[500]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {activeView === 'calendar' ? (
          /* ── CALENDAR VIEW ─────────────────────────────────────────────── */
          <>
            {/* Month nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth} activeOpacity={0.75}>
                <Text style={styles.navIcon}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{VI_MONTHS[monthIdx]} {year}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth} activeOpacity={0.75}>
                <Text style={styles.navIcon}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week labels */}
            <View style={styles.dowRow}>
              {VI_DAYS_OF_WEEK.map((d) => (
                <Text key={d} style={styles.dowLabel}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {leadingBlanks.map((_, idx) => (
                <View key={`b-${idx}`} style={styles.cell} />
              ))}
              {dayCells.map((cell) => {
                const isSelected  = cell.iso === selectedISO;
                const dayBgColor  = !cell.hasActivity
                  ? 'transparent'
                  : cell.isOverBudget
                  ? COLORS.calendar.overBudget
                  : COLORS.calendar.withinBudget;
                const dayTextColor =
                  cell.hasActivity || isSelected ? COLORS.white : COLORS.gray[800];
                return (
                  <TouchableOpacity
                    key={cell.iso}
                    style={styles.cell}
                    onPress={() => handleDayTap(cell)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        cell.hasActivity && { backgroundColor: dayBgColor },
                        isSelected && styles.dayCircleSelected,
                        cell.isToday  && styles.dayCircleToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          { color: dayTextColor },
                          isSelected && styles.dayNumberSelected,
                        ]}
                      >
                        {cell.dayOfMonth}
                      </Text>
                      {cell.hasUncategorized ? (
                        <View style={styles.uncategorizedBadge}>
                          <Text style={styles.uncategorizedBadgeText}>?</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <Legend color={COLORS.calendar.withinBudget}  label="Trong ngân sách" />
              <Legend color={COLORS.calendar.overBudget}    label="Vượt ngân sách" />
              <Legend color={COLORS.calendar.uncategorized} label="Chưa phân loại" />
            </View>
          </>
        ) : (
          /* ── BAR VIEW ──────────────────────────────────────────────────── */
          <View style={styles.barSection}>
            <Text style={styles.barHint}>
              Chạm vào cột để xem giao dịch • Vuốt để xem tuần trước
            </Text>
            <View style={styles.barCard}>
              <WeeklySpendingSwiper
                dayLabels={VI_DAYS_OF_WEEK}
                formatValue={formatVNDCompact}
                chartHeight={260}
                onDayPress={handleBarDayPress}
              />
            </View>
          </View>
        )}

        {/* ── Day detail panel — visible in both views ────────────────────── */}
        <View style={styles.dayPanel}>
          <Text style={styles.dayPanelTitle}>
            {formatVietnameseDate(selectedISO)}
          </Text>
          {dayTransactions.length === 0 ? (
            <Text style={styles.dayPanelEmpty}>
              Không có giao dịch nào trong ngày này.
            </Text>
          ) : (
            dayTransactions.map((tx: Transaction) => (
              <View key={tx.id} style={styles.entryWrapper}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => handleEntryTap(tx.id)}>
                  <TransactionCard transaction={tx} showChevron />
                  {tx.categoryId === null ? (
                    <View style={styles.entryUncategorized}>
                      <Text style={styles.entryUncategorizedText}>
                        ? Chưa phân loại — chạm để sửa
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerLabel}>Tổng chi tháng</Text>
          <Text style={styles.footerTotal}>{formatVND(monthTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.footerCta, uncategorizedCount === 0 && styles.footerCtaDisabled]}
          onPress={handleFixUncategorized}
          disabled={uncategorizedCount === 0}
          activeOpacity={0.75}
        >
          <Text style={styles.footerCtaCount}>{uncategorizedCount}</Text>
          <Text style={styles.footerCtaLabel}>Cần phân loại</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll:    { paddingBottom: SPACING[16] },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  // Segmented control (circular pill container)
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.full,
    padding: 3,
  },
  segmentBtn: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.brand[500],
    ...SHADOW.sm,
  },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
  },
  navIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.gray[700],
    fontWeight: FONT_WEIGHT.bold,
  },
  monthLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  // Weekday header row
  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.white,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING[2],
    paddingBottom: SPACING[3],
    backgroundColor: COLORS.white,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCircleSelected: {
    borderWidth: 2,
    borderColor: COLORS.brand[500],
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.brand[300],
  },
  dayNumber:         { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  dayNumberSelected: { fontWeight: FONT_WEIGHT.bold },
  uncategorizedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.calendar.uncategorized,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncategorizedBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    marginBottom: SPACING[4],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: FONT_SIZE.xs, color: COLORS.gray[600] },

  // Bar view
  barSection: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[4],
  },
  barHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginBottom: SPACING[3],
  },
  barCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[3],
    ...SHADOW.sm,
  },

  // Day panel (shared)
  dayPanel: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING[5],
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOW.sm,
  },
  dayPanelTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[3],
  },
  dayPanelEmpty: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[400],
    textAlign: 'center',
    paddingVertical: SPACING[6],
  },
  entryWrapper: { marginBottom: SPACING[2] },
  entryUncategorized: {
    marginTop: -SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    backgroundColor: '#FFF7ED',
    borderRadius: BORDER_RADIUS.md,
  },
  entryUncategorizedText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.calendar.uncategorized,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  footerLeft:  { flex: 1 },
  footerLabel: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },
  footerTotal: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  footerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.calendar.uncategorized,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING[2],
  },
  footerCtaDisabled: { backgroundColor: COLORS.gray[300] },
  footerCtaCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  footerCtaLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
