import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CalendarDays, List, ChevronDown } from 'lucide-react-native';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useTransactions, useBudgets, useUser, useWallets } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { formatVND, formatVNDCompact } from '@/utils/formatters';
import type { Transaction, Wallet } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const VI_DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

type ViewMode = 'list' | 'calendar';
type Period = 'last_month' | 'this_month' | 'future';

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

export default function TransactionsScreen() {
  const router = useRouter();
  const today = new Date();

  // View toggle: list or calendar
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Period selection for list view
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('this_month');

  // Wallet selector modal
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Calendar viewport
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());
  const [lastTap, setLastTap] = useState<{ iso: string; at: number } | null>(null);

  const { data: walletsData } = useWallets();
  const wallets = walletsData?.wallets ?? [];
  const totalBalance = walletsData?.totalBalance ?? 0;

  // Calculate date ranges based on period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (selectedPeriod === 'last_month') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return {
        startDate: isoDate(lastMonthYear, lastMonth, 1),
        endDate: isoDate(lastMonthYear, lastMonth, new Date(lastMonthYear, lastMonth + 1, 0).getDate()),
      };
    } else if (selectedPeriod === 'this_month') {
      return {
        startDate: isoDate(currentYear, currentMonth, 1),
        endDate: isoDate(currentYear, currentMonth, new Date(currentYear, currentMonth + 1, 0).getDate()),
      };
    } else {
      // future
      return {
        startDate: isoDate(currentYear, currentMonth, now.getDate() + 1),
        endDate: isoDate(currentYear + 1, 11, 31),
      };
    }
  }, [selectedPeriod]);

  const monthStartISO = isoDate(year, monthIdx, 1);
  const monthEndISO = isoDate(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate());

  const { data: transactions, isLoading } = useTransactions({
    startDate: viewMode === 'list' ? startDate : monthStartISO,
    endDate: viewMode === 'list' ? endDate : monthEndISO,
    walletId: selectedWalletId ?? undefined,
  });

  // Dedicated single-day query for calendar day detail panel
  const { data: selectedDayTxs } = useTransactions({
    startDate: selectedISO,
    endDate: selectedISO,
  });

  const { data: budgets } = useBudgets();
  const { data: user } = useUser();

  // Calculate opening and ending balance for list view
  const { openingBalance, endingBalance, netChange } = useMemo(() => {
    if (!transactions) return { openingBalance: 0, endingBalance: 0, netChange: 0 };

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const net = income - expense;

    // For simplicity, calculate based on current balance
    const currentBalance = selectedWalletId
      ? wallets.find(w => w.id === selectedWalletId)?.balance ?? 0
      : totalBalance;

    return {
      openingBalance: currentBalance - net,
      endingBalance: currentBalance,
      netChange: net,
    };
  }, [transactions, selectedWalletId, wallets, totalBalance]);

  // Group transactions by date for list view
  const groupedTransactions = useMemo(() => {
    if (!transactions) return [];

    const groups = new Map<string, Transaction[]>();
    transactions.forEach(tx => {
      const existing = groups.get(tx.transactionDate) ?? [];
      existing.push(tx);
      groups.set(tx.transactionDate, existing);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, txs]) => ({
        date,
        transactions: txs,
        total: txs.reduce((sum, t) => {
          if (t.type === 'income') return sum + t.amount;
          if (t.type === 'expense') return sum - t.amount;
          return sum;
        }, 0),
      }));
  }, [transactions]);

  // Count uncategorized transactions
  const uncategorizedCount = useMemo(() => {
    if (!transactions) return 0;
    return transactions.filter(tx => !tx.categoryId).length;
  }, [transactions]);

  // Calendar-specific calculations
  const monthlyLimit = useMemo(
    () => (budgets ?? []).reduce((sum, b) => sum + b.monthlyLimit, 0),
    [budgets],
  );

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
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
      const iso = isoDate(year, monthIdx, day);
      const agg = dayMap.get(iso);
      const total = agg?.total ?? 0;
      const hasUncategorized = agg?.hasUncategorized ?? false;
      const hasActivity = total > 0;
      const isOverBudget = dailyAvgLimit > 0 && hasActivity && total > dailyAvgLimit;
      cells.push({ iso, dayOfMonth: day, total, hasUncategorized, isOverBudget, hasActivity, isToday: iso === todayISO() });
    }
    return cells;
  }, [dayMap, daysInMonth, dailyAvgLimit, year, monthIdx]);

  const sundayOffset = new Date(year, monthIdx, 1).getDay();
  const firstDOW = (sundayOffset + 6) % 7;
  const leadingBlanks = Array.from({ length: firstDOW }, () => null);

  const monthExpenses = (transactions ?? []).filter((t) => t.type === 'expense');
  const monthTotal = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // The day panel uses its own query result for calendar view
  const dayTransactions = viewMode === 'calendar' ? (selectedDayTxs ?? []) : [];

  const selectedWallet = selectedWalletId
    ? wallets.find(w => w.id === selectedWalletId)
    : null;

  const handleWalletSelect = (walletId: string | null) => {
    setSelectedWalletId(walletId);
    setWalletModalVisible(false);
  };

  const handleFixUncategorized = () => {
    // Navigate to first uncategorized transaction
    const firstUncategorized = transactions?.find(tx => !tx.categoryId);
    if (firstUncategorized) {
      router.push(`/(tabs)/transactions/edit-entry?id=${firstUncategorized.id}` as never);
    }
  };

  // Calendar event handlers
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
    const DOUBLE_TAP_MS = 300;
    if (lastTap && lastTap.iso === cell.iso && now - lastTap.at < DOUBLE_TAP_MS) {
      router.push(`/(tabs)/entry?date=${cell.iso}` as never);
      setLastTap(null);
      return;
    }
    setSelectedISO(cell.iso);
    setLastTap({ iso: cell.iso, at: now });
  };

  const handleEntryTap = (txId: string) => router.push(`/(tabs)/transactions/edit-entry?id=${txId}` as never);

  if (isLoading) return <LoadingSpinner />;

  // ── Render ──────────────────────────────────────────────────────────────────

  const WALLET_ICON: Record<string, string> = {
    basic: '💵',
    linked: '🔗',
    goal: '🎯',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giao dịch</Text>

        {/* View toggle */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <List
              size={18}
              color={viewMode === 'list' ? COLORS.white : COLORS.gray[500]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'calendar' && styles.segmentBtnActive]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.8}
          >
            <CalendarDays
              size={18}
              color={viewMode === 'calendar' ? COLORS.white : COLORS.gray[500]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Wallet Selector ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.walletSelector}
        onPress={() => setWalletModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.walletSelectorContent}>
          <Text style={styles.walletSelectorIcon}>🌐</Text>
          <Text style={styles.walletSelectorText}>
            {selectedWallet ? selectedWallet.name : 'Total'}
          </Text>
          <ChevronDown size={16} color={COLORS.gray[400]} />
        </View>
      </TouchableOpacity>

      {viewMode === 'list' ? (
        /* ── LIST VIEW ──────────────────────────────────────────────────── */
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Balance Summary */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatVND(selectedWallet?.balance ?? totalBalance)}
              </Text>
            </View>

            {/* Period Tabs */}
            <View style={styles.periodTabs}>
              <TouchableOpacity
                style={[styles.periodTab, selectedPeriod === 'last_month' && styles.periodTabActive]}
                onPress={() => setSelectedPeriod('last_month')}
              >
                <Text style={[styles.periodTabText, selectedPeriod === 'last_month' && styles.periodTabTextActive]}>
                  LAST MONTH
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodTab, selectedPeriod === 'this_month' && styles.periodTabActive]}
                onPress={() => setSelectedPeriod('this_month')}
              >
                <Text style={[styles.periodTabText, selectedPeriod === 'this_month' && styles.periodTabTextActive]}>
                  THIS MONTH
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodTab, selectedPeriod === 'future' && styles.periodTabActive]}
                onPress={() => setSelectedPeriod('future')}
              >
                <Text style={[styles.periodTabText, selectedPeriod === 'future' && styles.periodTabTextActive]}>
                  FUTURE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Opening/Ending Balance */}
            <View style={styles.balanceSummary}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceSummaryLabel}>Opening balance</Text>
                <Text style={styles.balanceSummaryValue}>{formatVND(openingBalance)}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceSummaryLabel}>Ending balance</Text>
                <Text style={styles.balanceSummaryValue}>{formatVND(endingBalance)}</Text>
              </View>
              <View style={styles.balanceDivider} />
              <Text style={[styles.balanceSummaryValue, styles.balanceNet]}>
                {netChange >= 0 ? '+' : ''}{formatVND(netChange)}
              </Text>
            </View>

            {/* Grouped Transactions */}
            {groupedTransactions.map(group => (
              <View key={group.date} style={styles.transactionGroup}>
                <View style={styles.transactionGroupHeader}>
                  <Text style={styles.transactionGroupDate}>
                    {formatVietnameseDate(group.date)}
                  </Text>
                  <Text style={[styles.transactionGroupTotal, group.total >= 0 ? styles.incomeText : styles.expenseText]}>
                    {group.total >= 0 ? '+' : ''}{formatVND(Math.abs(group.total))}
                  </Text>
                </View>
                {group.transactions.map(tx => (
                  <TouchableOpacity
                    key={tx.id}
                    onPress={() => router.push(`/(tabs)/transactions/edit-entry?id=${tx.id}` as never)}
                    activeOpacity={0.7}
                  >
                    <TransactionCard transaction={tx} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Fixed Footer with uncategorized count */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>Tổng giao dịch</Text>
              <Text style={styles.footerTotal}>{transactions?.length ?? 0}</Text>
            </View>
            <TouchableOpacity
              style={[styles.footerCta, uncategorizedCount === 0 && styles.footerCtaDisabled]}
              onPress={handleFixUncategorized}
              disabled={uncategorizedCount === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.footerCtaCount}>{uncategorizedCount}</Text>
              <Text style={styles.footerCtaLabel}>Cần phân loại</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ── CALENDAR VIEW ──────────────────────────────────────────────── */
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                <View key={d} style={styles.dowCell}>
                  <Text style={styles.dowLabel}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {leadingBlanks.map((_, idx) => (
                <View key={`blank-${idx}`} style={styles.cell} />
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
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.calendar.withinBudget }]} />
                <Text style={styles.legendLabel}>Trong ngân sách</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.calendar.overBudget }]} />
                <Text style={styles.legendLabel}>Vượt ngân sách</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.calendar.uncategorized }]} />
                <Text style={styles.legendLabel}>Chưa phân loại</Text>
              </View>
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

          {/* Footer for calendar view */}
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
        </>
      )}

      {/* ── Wallet Selector Modal ──────────────────────────────────────────── */}
      <Modal
        visible={walletModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Wallet</Text>
              <TouchableOpacity>
                <Text style={styles.modalEdit}>Edit</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Total Option */}
              <TouchableOpacity
                style={[styles.walletOption, selectedWalletId === null && styles.walletOptionActive]}
                onPress={() => handleWalletSelect(null)}
              >
                <View style={styles.walletOptionLeft}>
                  <View style={styles.walletOptionIcon}>
                    <Text style={styles.walletOptionIconText}>🌐</Text>
                  </View>
                  <View>
                    <Text style={styles.walletOptionName}>Total</Text>
                    <Text style={styles.walletOptionBalance}>{formatVND(totalBalance)}</Text>
                  </View>
                </View>
                {selectedWalletId === null && (
                  <Text style={styles.walletOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.walletSectionTitle}>INCLUDED IN TOTAL</Text>

              {/* Individual Wallets */}
              {wallets.map(wallet => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[styles.walletOption, selectedWalletId === wallet.id && styles.walletOptionActive]}
                  onPress={() => handleWalletSelect(wallet.id)}
                >
                  <View style={styles.walletOptionLeft}>
                    <View style={styles.walletOptionIcon}>
                      <Text style={styles.walletOptionIconText}>
                        {WALLET_ICON[wallet.type] || '💵'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.walletOptionName}>{wallet.name}</Text>
                      <Text style={styles.walletOptionBalance}>{formatVND(wallet.balance)}</Text>
                    </View>
                  </View>
                  {selectedWalletId === wallet.id && (
                    <Text style={styles.walletOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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

  // Wallet selector
  walletSelector: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  walletSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.full,
  },
  walletSelectorIcon: {
    fontSize: FONT_SIZE.base,
  },
  walletSelectorText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },

  // List view
  content: { flex: 1 },
  balanceCard: {
    backgroundColor: COLORS.white,
    padding: SPACING[6],
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  balanceLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
  },
  balanceAmount: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  periodTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    marginBottom: SPACING[4],
  },
  periodTab: {
    flex: 1,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  periodTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand[500],
  },
  periodTabText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
  },
  periodTabTextActive: {
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.bold,
  },

  balanceSummary: {
    backgroundColor: COLORS.white,
    padding: SPACING[5],
    marginBottom: SPACING[4],
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  balanceSummaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
  },
  balanceSummaryValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  balanceDivider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING[3],
  },
  balanceNet: {
    fontSize: FONT_SIZE.lg,
    textAlign: 'right',
  },

  transactionGroup: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING[3],
    padding: SPACING[4],
  },
  transactionGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  transactionGroupDate: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[700],
  },
  transactionGroupTotal: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  incomeText: {
    color: COLORS.success,
  },
  expenseText: {
    color: COLORS.danger,
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.gray[900],
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING[5],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[700],
  },
  modalClose: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[400],
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  modalEdit: {
    fontSize: FONT_SIZE.base,
    color: COLORS.brand[400],
  },
  modalScroll: {
    padding: SPACING[4],
  },

  walletOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.gray[800],
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[3],
  },
  walletOptionActive: {
    backgroundColor: COLORS.gray[700],
  },
  walletOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  walletOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletOptionIconText: {
    fontSize: FONT_SIZE.xl,
  },
  walletOptionName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
    marginBottom: SPACING[1],
  },
  walletOptionBalance: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[400],
  },
  walletOptionCheck: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.brand[400],
  },
  walletSectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    marginTop: SPACING[4],
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[2],
  },

  // Wallet filter (old - can be removed later)
  walletFilter: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    paddingVertical: SPACING[3],
  },
  walletFilterScroll: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
  },
  walletFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[100],
    gap: SPACING[1],
  },
  walletFilterChipActive: {
    backgroundColor: COLORS.brand[500],
  },
  walletFilterIcon: {
    fontSize: FONT_SIZE.sm,
  },
  walletFilterText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[700],
  },
  walletFilterTextActive: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
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
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.white,
  },
  dowCell: {
    width: '14.285714%',
    alignItems: 'center',
  },
  dowLabel: {
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
    paddingBottom: SPACING[3],
    backgroundColor: COLORS.white,
  },
  cell: {
    width: '14.285714%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
