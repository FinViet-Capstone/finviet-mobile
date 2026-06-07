import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { useTransactions, useWallets } from '@/hooks';
import type { Transaction } from '@/types';
import { formatVND, formatVNDCompact } from '@/utils/formatters';

// ─── Constants ────────────────────────────────────────────────────────────────

const VI_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function isoDate(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function todayISO() {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function sectionLabel(iso: string): string {
  const date = new Date(iso + 'T12:00:00');
  const dows = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const [, , d] = iso.split('-');
  return `${parseInt(d, 10)}, ${dows[date.getDay()]}`;
}

function signedCompact(amount: number): string {
  return (amount >= 0 ? '+' : '-') + formatVNDCompact(Math.abs(amount));
}

function pctChange(curr: number, prev: number): string {
  if (prev === 0) return '—';
  return `${Math.round((Math.abs(curr - prev) / prev) * 100)}%`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TxSection {
  title: string;       // ISO date "YYYY-MM-DD"
  data: Transaction[];
  dayNet: number;      // positive = income > expense
}

interface DayCell {
  iso: string;
  day: number;
  net: number;
  hasActivity: boolean;
  hasUncategorized: boolean;
  isToday: boolean;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const router = useRouter();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [lastTap, setLastTap] = useState<{ iso: string; at: number } | null>(null);

  const sectionListRef = useRef<SectionList<Transaction, TxSection>>(null);

  // ── Date ranges ─────────────────────────────────────────────────────────────

  const monthStart = isoDate(year, monthIdx, 1);
  const monthEnd = isoDate(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate());

  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  const prevStart = isoDate(prevYear, prevMonthIdx, 1);
  const prevEnd = isoDate(prevYear, prevMonthIdx, new Date(prevYear, prevMonthIdx + 1, 0).getDate());

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: txData, isLoading } = useTransactions({
    startDate: monthStart,
    endDate: monthEnd,
    walletId: selectedWalletId ?? undefined,
  });
  const { data: prevTxData } = useTransactions({
    startDate: prevStart,
    endDate: prevEnd,
    walletId: selectedWalletId ?? undefined,
  });
  const { data: walletsData } = useWallets();

  const transactions = txData ?? [];
  const prevTransactions = prevTxData ?? [];
  const wallets = walletsData?.wallets ?? [];
  const totalBalance = walletsData?.totalBalance ?? 0;
  const selectedWallet = wallets.find(w => w.id === selectedWalletId) ?? null;

  // ── Aggregates ────────────────────────────────────────────────────────────

  const { income, expense } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') inc += tx.amount;
      else if (tx.type === 'expense') exp += tx.amount;
    }
    return { income: inc, expense: exp };
  }, [transactions]);

  const { prevIncome, prevExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const tx of prevTransactions) {
      if (tx.type === 'income') inc += tx.amount;
      else if (tx.type === 'expense') exp += tx.amount;
    }
    return { prevIncome: inc, prevExpense: exp };
  }, [prevTransactions]);

  const monthNet = income - expense;

  const uncategorizedCount = useMemo(
    () => transactions.filter(tx => !tx.categoryId).length,
    [transactions],
  );

  // ── SectionList sections ──────────────────────────────────────────────────

  const sections = useMemo((): TxSection[] => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const list = map.get(tx.transactionDate) ?? [];
      list.push(tx);
      map.set(tx.transactionDate, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => {
        let net = 0;
        for (const tx of data) {
          if (tx.type === 'income') net += tx.amount;
          else if (tx.type === 'expense') net -= tx.amount;
        }
        return { title: date, data, dayNet: net };
      });
  }, [transactions]);

  // ── Calendar cells ────────────────────────────────────────────────────────

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const dayCells = useMemo((): DayCell[] => {
    const dayMap = new Map<string, { net: number; hasUncategorized: boolean }>();
    for (const tx of transactions) {
      if (tx.type === 'transfer_out' || tx.type === 'transfer_in') continue;
      const cur = dayMap.get(tx.transactionDate) ?? { net: 0, hasUncategorized: false };
      if (tx.type === 'income') cur.net += tx.amount;
      else cur.net -= tx.amount;
      if (!tx.categoryId) cur.hasUncategorized = true;
      dayMap.set(tx.transactionDate, cur);
    }
    const today = todayISO();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const iso = isoDate(year, monthIdx, i + 1);
      const agg = dayMap.get(iso);
      return {
        iso,
        day: i + 1,
        net: agg?.net ?? 0,
        hasActivity: !!agg,
        hasUncategorized: agg?.hasUncategorized ?? false,
        isToday: iso === today,
      };
    });
  }, [transactions, year, monthIdx, daysInMonth]);

  // First day offset (Monday = 0)
  const leadingBlanks = (new Date(year, monthIdx, 1).getDay() + 6) % 7;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePrevMonth = () => {
    if (monthIdx === 0) { setYear(y => y - 1); setMonthIdx(11); }
    else setMonthIdx(m => m - 1);
    setSelectedISO('');
  };

  const handleNextMonth = () => {
    if (monthIdx === 11) { setYear(y => y + 1); setMonthIdx(0); }
    else setMonthIdx(m => m + 1);
    setSelectedISO('');
  };

  const handleDayPress = (cell: DayCell) => {
    const at = Date.now();
    if (lastTap?.iso === cell.iso && at - lastTap.at < 300) {
      // Double-tap: open manual entry only for basic wallets
      setLastTap(null);
      if (selectedWallet?.type === 'linked') return;
      router.push(`/(tabs)/entry/manual?date=${cell.iso}` as never);
      return;
    }
    setLastTap({ iso: cell.iso, at });
    setSelectedISO(cell.iso);

    const idx = sections.findIndex(s => s.title === cell.iso);
    if (idx >= 0) {
      try {
        sectionListRef.current?.scrollToLocation({
          sectionIndex: idx,
          itemIndex: 0,
          animated: true,
          viewOffset: 0,
        });
      } catch {
        // section may not be rendered if off-screen — ignore
      }
    }
  };

  const handleTxPress = (tx: Transaction) => {
    const wallet = wallets.find(w => w.id === tx.walletId);
    const mode = wallet?.type === 'basic' ? 'full' : 'category';
    router.push(`/(tabs)/transactions/edit-entry?id=${tx.id}&mode=${mode}` as never);
  };

  const handleWalletSelect = (id: string | null) => {
    setSelectedWalletId(id);
    setWalletModalVisible(false);
  };

  // Stable ref: scroll position → calendar highlight
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find(v => v.isViewable);
      if (!first) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const section = (first as any).section as TxSection | undefined;
      if (section?.title) setSelectedISO(section.title);
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 150,
  }).current;

  if (isLoading) return <LoadingSpinner />;

  // ── Sub-renders ───────────────────────────────────────────────────────────

  // useCallback gives SectionList a stable ListHeaderComponent reference so it
  // does not unmount/remount the header on every parent render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const renderListHeader = useCallback(() => (
    <>
      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.75} style={styles.navBtn}>
          <MaterialIcon name="chevron_left" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{VI_MONTHS[monthIdx]}, {year}</Text>
        <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.75} style={styles.navBtn}>
          <MaterialIcon name="chevron_right" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Summary banner */}
      <View style={styles.summaryBanner}>
        {/* Thu nhập — no sign */}
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>{'Thu nhập'}</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.tertiary }]}>
            {formatVNDCompact(income)}
          </Text>
          <View style={styles.trendRow}>
            <MaterialIcon
              name={income >= prevIncome ? 'arrow_upward' : 'arrow_downward'}
              size={11}
              color={income >= prevIncome ? COLORS.tertiary : COLORS.error}
            />
            <Text style={[styles.trendText, {
              color: income >= prevIncome ? COLORS.tertiary : COLORS.error,
            }]}>
              {pctChange(income, prevIncome)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        {/* Chi tiêu — no sign */}
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>{'Chi tiêu'}</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.error }]}>
            {formatVNDCompact(expense)}
          </Text>
          <View style={styles.trendRow}>
            <MaterialIcon
              name={expense <= prevExpense ? 'arrow_downward' : 'arrow_upward'}
              size={11}
              color={expense <= prevExpense ? COLORS.tertiary : COLORS.error}
            />
            <Text style={[styles.trendText, {
              color: expense <= prevExpense ? COLORS.tertiary : COLORS.error,
            }]}>
              {pctChange(expense, prevExpense)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        {/* Tổng — with sign */}
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>{'Tổng'}</Text>
          <Text style={[styles.summaryAmount, {
            color: monthNet >= 0 ? COLORS.tertiary : COLORS.error,
          }]}>
            {signedCompact(monthNet)}
          </Text>
          <View style={styles.trendRow}>
            <MaterialIcon
              name={monthNet >= (prevIncome - prevExpense) ? 'arrow_upward' : 'arrow_downward'}
              size={11}
              color={COLORS.onSurfaceVariant}
            />
          </View>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarCard}>
        {/* Day-of-week header */}
        <View style={styles.dowRow}>
          {VI_DAYS.map(d => (
            <Text key={d} style={[styles.dowLabel, d === 'CN' && { color: COLORS.error }]}>
              {d}
            </Text>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <View key={`b${i}`} style={styles.cell} />
          ))}
          {dayCells.map(cell => {
            const isSelected = cell.iso === selectedISO;
            const amtColor = cell.net >= 0 ? COLORS.tertiary : COLORS.error;
            return (
              <TouchableOpacity
                key={cell.iso}
                style={styles.cell}
                onPress={() => handleDayPress(cell)}
                activeOpacity={0.75}
              >
                <View style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                  cell.isToday && !isSelected && styles.dayCircleToday,
                ]}>
                  <Text style={[
                    styles.dayNumber,
                    isSelected && { color: COLORS.onPrimary, fontWeight: FONT_WEIGHT.bold },
                    cell.isToday && !isSelected && { color: COLORS.primary },
                  ]}>
                    {cell.day}
                  </Text>
                  {cell.hasUncategorized && <View style={styles.uncatDot} />}
                </View>
                {cell.hasActivity && (
                  <Text style={[styles.dayAmt, { color: amtColor }]} numberOfLines={1}>
                    {formatVNDCompact(Math.abs(cell.net))}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Section list label */}
      {sections.length > 0 && (
        <Text style={styles.listLabel}>{'LỊCH SỬ GIAO DỊCH'}</Text>
      )}
    </>
  // deps: everything the header reads from component scope
  ), [year, monthIdx, income, expense, prevIncome, prevExpense, monthNet,
      dayCells, leadingBlanks, sections.length, selectedISO,
      handlePrevMonth, handleNextMonth, handleDayPress]);

  const renderListEmpty = React.useCallback(() => (
    <View style={styles.emptyState}>
      <MaterialIcon name="receipt_long" size={40} color={COLORS.outlineVariant} />
      <Text style={styles.emptyText}>{'Không có giao dịch trong tháng này'}</Text>
      <Text style={styles.emptyHint}>{'Nhấn đúp vào ngày để nhập giao dịch'}</Text>
    </View>
  ), []);

  const renderSectionHeader = ({ section }: { section: TxSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{sectionLabel(section.title)}</Text>
      <Text style={[styles.sectionNet, {
        color: section.dayNet >= 0 ? COLORS.tertiary : COLORS.error,
      }]}>
        {signedCompact(section.dayNet)}
      </Text>
    </View>
  );

  const renderItem = ({ item: tx }: { item: Transaction }) => {
    const category = tx.categoryId ? getCategoryById(tx.categoryId) : undefined;
    const iconName = getCategoryIcon(category?.icon);
    const catColor = category?.color ?? COLORS.outlineVariant;
    const isUncategorized = !tx.categoryId;
    const isIncome = tx.type === 'income';
    const walletName = wallets.find(w => w.id === tx.walletId)?.name ?? '';

    return (
      <TouchableOpacity
        style={[styles.txRow, isUncategorized && styles.txRowUncat]}
        onPress={() => handleTxPress(tx)}
        activeOpacity={0.75}
      >
        <View style={[styles.txIcon, { backgroundColor: `${catColor}26` }]}>
          <MaterialIcon
            name={isUncategorized ? 'help_outline' : iconName}
            size={20}
            color={isUncategorized ? COLORS.secondary : catColor}
          />
        </View>

        <View style={styles.txMeta}>
          <View style={styles.txTitleRow}>
            <Text style={styles.txTitle} numberOfLines={1}>
              {tx.merchant ?? tx.description ?? (isUncategorized ? 'Chưa phân loại' : 'Giao dịch')}
            </Text>
            {tx.aiSuggestedCategoryId && !tx.aiOverridden && (
              <View style={styles.aiBadge}>
                <MaterialIcon name="auto_awesome" size={10} color={COLORS.primary} />
                <Text style={styles.aiBadgeText}>{'AI'}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.txSubtitle, isUncategorized && { color: COLORS.secondary }]}
            numberOfLines={1}>
            {isUncategorized ? 'Phân loại ngay →' : (category?.nameVi ?? walletName)}
          </Text>
        </View>

        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: isIncome ? COLORS.tertiary : COLORS.onSurface }]}>
            {isIncome ? `+${formatVNDCompact(tx.amount)}` : formatVNDCompact(tx.amount)}
          </Text>
          <Text style={styles.txWalletLabel} numberOfLines={1}>{walletName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.walletPill}
          onPress={() => setWalletModalVisible(true)}
          activeOpacity={0.75}
        >
          <MaterialIcon name="account_balance_wallet" size={14} color={COLORS.primary} />
          <Text style={styles.walletPillText} numberOfLines={1}>
            {selectedWallet?.name ?? 'Tất cả ví'}
          </Text>
          <MaterialIcon name="expand_more" size={14} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
            <MaterialIcon name="search" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
            <MaterialIcon name="tune" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SectionList — flex: 1 is required so RN can bound its height and enable scrolling */}
      <SectionList<Transaction, TxSection>
        ref={sectionListRef}
        style={styles.sectionList}
        sections={sections}
        keyExtractor={tx => tx.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Uncategorized floating pill */}
      {uncategorizedCount > 0 && (
        <TouchableOpacity style={styles.uncatPill} activeOpacity={0.85}>
          <MaterialIcon name="error_outline" size={15} color={COLORS.onSecondary} />
          <Text style={styles.uncatPillText}>
            {`${uncategorizedCount} chưa phân loại`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Wallet picker modal */}
      <Modal
        visible={walletModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setWalletModalVisible(false)}
        />
        <View style={styles.walletModal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{'Chọn ví'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* All wallets */}
            <TouchableOpacity
              style={[styles.walletOption, selectedWalletId === null && styles.walletOptionActive]}
              onPress={() => handleWalletSelect(null)}
              activeOpacity={0.75}
            >
              <View style={styles.walletIconWrap}>
                <MaterialIcon name="account_balance_wallet" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletName}>{'Tất cả ví'}</Text>
                <Text style={styles.walletBalance}>{formatVND(totalBalance)}</Text>
              </View>
              {selectedWalletId === null && (
                <MaterialIcon name="check_circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            <Text style={styles.walletSectionLabel}>{'VÍ CỦA TÔI'}</Text>

            {wallets.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[styles.walletOption, selectedWalletId === w.id && styles.walletOptionActive]}
                onPress={() => handleWalletSelect(w.id)}
                activeOpacity={0.75}
              >
                <View style={styles.walletIconWrap}>
                  <MaterialIcon
                    name={w.type === 'linked' ? 'link' : 'account_balance_wallet'}
                    size={20}
                    color={w.type === 'linked' ? COLORS.secondary : COLORS.primary}
                  />
                </View>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletName}>{w.name}</Text>
                  <Text style={styles.walletBalance}>{formatVND(w.balance)}</Text>
                </View>
                {selectedWalletId === w.id && (
                  <MaterialIcon name="check_circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    maxWidth: 180,
  },
  walletPillText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  // flex: 1 is REQUIRED — without it the SectionList tries to expand to its full
  // content height and the parent SafeAreaView clips the overflow. Nothing scrolls
  // and the ListHeaderComponent (calendar) never leaves the screen.
  sectionList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING[16],
  },

  // ── Month Navigator ──────────────────────────────────────────────────────────
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    backgroundColor: COLORS.surfaceContainerLow,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  monthLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },

  // ── Summary Banner ───────────────────────────────────────────────────────────
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
    gap: SPACING[2],
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[3],
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
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
    // no visible divider — gap handles spacing
  },

  // ── Calendar ─────────────────────────────────────────────────────────────────
  calendarCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[4],
    marginBottom: SPACING[2],
  },
  dowRow: {
    flexDirection: 'row',
    paddingVertical: SPACING[2],
  },
  dowLabel: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285714%',
    alignItems: 'center',
    paddingVertical: SPACING[1],
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCircleSelected: {
    backgroundColor: COLORS.primaryContainer,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
  },
  uncatDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
  },
  dayAmt: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Section List ─────────────────────────────────────────────────────────────
  listLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    letterSpacing: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.background,
  },
  sectionDate: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  sectionNet: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },

  // ── Transaction Row ───────────────────────────────────────────────────────────
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.surfaceContainerLow,
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[2],
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING[3],
  },
  txRowUncat: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txMeta: {
    flex: 1,
    gap: 2,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  txTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${COLORS.primaryContainer}33`,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  txSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  txAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  txWalletLabel: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
    maxWidth: 80,
  },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
    gap: SPACING[2],
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.medium,
  },
  emptyHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.outlineVariant,
  },

  // ── Floating pill ─────────────────────────────────────────────────────────────
  uncatPill: {
    position: 'absolute',
    bottom: SPACING[5],
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
  },
  uncatPillText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSecondary,
  },

  // ── Wallet modal ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  walletModal: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    paddingBottom: SPACING[10],
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[4],
  },
  walletSectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
    paddingHorizontal: SPACING[2],
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: COLORS.surfaceContainer,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[2],
  },
  walletOptionActive: {
    backgroundColor: `${COLORS.primaryContainer}22`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
  },
  walletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: {
    flex: 1,
    gap: 2,
  },
  walletName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  walletBalance: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
});
