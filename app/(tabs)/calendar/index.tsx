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

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useTransactions, useBudgets } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { formatVND } from '@/utils/formatters';
import type { Transaction } from '@/types';

const VI_DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const DOUBLE_TAP_MS = 300;

interface DayCell {
  iso: string;            // "YYYY-MM-DD"
  dayOfMonth: number;     // 1-31
  total: number;
  hasUncategorized: boolean;
  isOverBudget: boolean;
  hasActivity: boolean;
  isToday: boolean;
}

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

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();

  // Calendar viewport state
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());
  const [lastTap, setLastTap] = useState<{ iso: string; at: number } | null>(null);

  const monthStartISO = isoDate(year, monthIdx, 1);
  const monthEndISO = isoDate(
    year,
    monthIdx,
    new Date(year, monthIdx + 1, 0).getDate(),
  );

  const { data: transactions, isLoading } = useTransactions({
    startDate: monthStartISO,
    endDate: monthEndISO,
  });
  const { data: budgets } = useBudgets();

  const monthlyLimit = useMemo(() => {
    if (!budgets) return 0;
    return budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  }, [budgets]);

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dailyAvgLimit = monthlyLimit > 0 ? monthlyLimit / daysInMonth : 0;

  // Aggregate expenses per day (exclude transfers — ARCHITECTURE §5)
  const dayMap = useMemo(() => {
    const map = new Map<string, { total: number; hasUncategorized: boolean }>();
    if (!transactions) return map;
    for (const tx of transactions) {
      if (tx.type === 'transfer_in' || tx.type === 'transfer_out') continue;
      if (tx.type !== 'expense') continue;
      const cur = map.get(tx.transactionDate) ?? {
        total: 0,
        hasUncategorized: false,
      };
      cur.total += tx.amount;
      if (tx.categoryId === null) cur.hasUncategorized = true;
      map.set(tx.transactionDate, cur);
    }
    return map;
  }, [transactions]);

  const dayCells: DayCell[] = useMemo(() => {
    const cells: DayCell[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = isoDate(year, monthIdx, day);
      const agg = dayMap.get(iso);
      const total = agg?.total ?? 0;
      const hasUncategorized = agg?.hasUncategorized ?? false;
      const hasActivity = total > 0;
      const isOverBudget =
        dailyAvgLimit > 0 && hasActivity && total > dailyAvgLimit;
      cells.push({
        iso,
        dayOfMonth: day,
        total,
        hasUncategorized,
        isOverBudget,
        hasActivity,
        isToday: iso === todayISO(),
      });
    }
    return cells;
  }, [dayMap, daysInMonth, dailyAvgLimit, year, monthIdx]);

  // Pad leading blanks (Sunday = 0)
  const firstDOW = new Date(year, monthIdx, 1).getDay();
  const leadingBlanks: null[] = Array.from({ length: firstDOW }, () => null);

  const monthExpenses = (transactions ?? []).filter(
    (t) => t.type === 'expense',
  );
  const monthTotal = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const uncategorizedCount = monthExpenses.filter(
    (t) => t.categoryId === null,
  ).length;

  const dayTransactions = useMemo(
    () =>
      (transactions ?? []).filter((t) => t.transactionDate === selectedISO),
    [transactions, selectedISO],
  );

  const handlePrevMonth = () => {
    if (monthIdx === 0) {
      setYear(year - 1);
      setMonthIdx(11);
    } else setMonthIdx(monthIdx - 1);
  };

  const handleNextMonth = () => {
    if (monthIdx === 11) {
      setYear(year + 1);
      setMonthIdx(0);
    } else setMonthIdx(monthIdx + 1);
  };

  const handleDayTap = (cell: DayCell) => {
    const now = Date.now();
    if (lastTap && lastTap.iso === cell.iso && now - lastTap.at < DOUBLE_TAP_MS) {
      // Double tap on any day → entry chooser pre-filled with that date
      router.push(
        `/(tabs)/entry?date=${cell.iso}` as never,
      );
      setLastTap(null);
      return;
    }
    setSelectedISO(cell.iso);
    setLastTap({ iso: cell.iso, at: now });
  };

  const handleEntryTap = (txId: string) => {
    router.push(`/(tabs)/calendar/edit-entry?id=${txId}` as never);
  };

  const handleFixUncategorized = () => {
    router.push(
      `/(tabs)/calendar/edit-entry?uncategorized=1` as never,
    );
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch chi tiêu</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.75}
          >
            <Text style={styles.navIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {VI_MONTHS[monthIdx]} {year}
          </Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleNextMonth}
            activeOpacity={0.75}
          >
            <Text style={styles.navIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={styles.dowRow}>
          {VI_DAYS_OF_WEEK.map((d) => (
            <Text key={d} style={styles.dowLabel}>
              {d}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {leadingBlanks.map((_, idx) => (
            <View key={`b-${idx}`} style={styles.cell} />
          ))}
          {dayCells.map((cell) => {
            const isSelected = cell.iso === selectedISO;
            const dayBgColor = !cell.hasActivity
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
                    cell.isToday && styles.dayCircleToday,
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
          <Legend color={COLORS.calendar.withinBudget} label="Trong ngân sách" />
          <Legend color={COLORS.calendar.overBudget} label="Vượt ngân sách" />
          <Legend color={COLORS.calendar.uncategorized} label="Chưa phân loại" />
        </View>

        {/* Day detail panel */}
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
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleEntryTap(tx.id)}
                >
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

      {/* Footer summary */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerLabel}>Tổng chi tháng</Text>
          <Text style={styles.footerTotal}>{formatVND(monthTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.footerCta,
            uncategorizedCount === 0 && styles.footerCtaDisabled,
          ]}
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function formatVietnameseDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `Ngày ${parseInt(d, 10)} tháng ${parseInt(m, 10)}, ${y}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[16] },

  header: {
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
  dayNumber: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  dayNumberSelected: {
    fontWeight: FONT_WEIGHT.bold,
  },
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
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: FONT_SIZE.xs, color: COLORS.gray[600] },

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

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  footerLeft: { flex: 1 },
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
