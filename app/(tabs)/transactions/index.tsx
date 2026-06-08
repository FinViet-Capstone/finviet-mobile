import React, { useCallback, useRef, useState } from 'react';
import {
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
import { MonthNavigator } from '@/components/transaction/MonthNavigator';
import { TransactionSummaryBanner } from '@/components/transaction/TransactionSummaryBanner';
import { TransactionCalendar } from '@/components/transaction/TransactionCalendar';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { WalletPickerSheet } from '@/components/transaction/WalletPickerSheet';
import { UncategorizedPill } from '@/components/transaction/UncategorizedPill';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { useMonthlyTransactions, type TxSection, type DayCell } from '@/hooks/useMonthlyTransactions';
import { sectionLabel, todayISO } from '@/utils/date';
import { signedCompact } from '@/utils/formatters';
import type { Transaction } from '@/types';

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

  const {
    isLoading,
    wallets,
    totalBalance,
    selectedWallet,
    income,
    expense,
    prevIncome,
    prevExpense,
    monthNet,
    uncategorizedCount,
    sections,
    dayCells,
    leadingBlanks,
  } = useMonthlyTransactions(year, monthIdx, selectedWalletId);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePrevMonth = () => {
    if (monthIdx === 0) { setYear((y) => y - 1); setMonthIdx(11); }
    else setMonthIdx((m) => m - 1);
    setSelectedISO('');
  };

  const handleNextMonth = () => {
    if (monthIdx === 11) { setYear((y) => y + 1); setMonthIdx(0); }
    else setMonthIdx((m) => m + 1);
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

    const idx = sections.findIndex((s) => s.title === cell.iso);
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
    const wallet = wallets.find((w) => w.id === tx.walletId);
    const mode = wallet?.type === 'basic' ? 'full' : 'category';
    router.push(`/(tabs)/transactions/${tx.id}?mode=${mode}` as never);
  };

  const handleWalletSelect = (id: string | null) => {
    setSelectedWalletId(id);
    setWalletModalVisible(false);
  };

  // Stable ref: scroll position → calendar highlight
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
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

  // ── Sub-renders ─────────────────────────────────────────────────────────────

  // useCallback gives SectionList a stable ListHeaderComponent reference so it
  // does not unmount/remount the header on every parent render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const renderListHeader = useCallback(() => (
    <>
      <MonthNavigator
        monthIdx={monthIdx}
        year={year}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />
      <TransactionSummaryBanner
        income={income}
        expense={expense}
        monthNet={monthNet}
        prevIncome={prevIncome}
        prevExpense={prevExpense}
      />
      <TransactionCalendar
        dayCells={dayCells}
        selectedISO={selectedISO}
        leadingBlanks={leadingBlanks}
        onDayPress={handleDayPress}
      />
      {sections.length > 0 && (
        <Text style={styles.listLabel}>{'LỊCH SỬ GIAO DỊCH'}</Text>
      )}
    </>
  ), [year, monthIdx, income, expense, prevIncome, prevExpense, monthNet,
      dayCells, leadingBlanks, sections.length, selectedISO,
      handlePrevMonth, handleNextMonth, handleDayPress]);

  const renderListEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <MaterialIcon name="receipt_long" size={40} color={COLORS.outlineVariant} />
      <Text style={styles.emptyText}>{'Không có giao dịch trong tháng này'}</Text>
      <Text style={styles.emptyHint}>{'Nhấn đúp vào ngày để nhập giao dịch'}</Text>
    </View>
  ), []);

  const renderSectionHeader = ({ section }: { section: TxSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{sectionLabel(section.title)}</Text>
      <Text style={[styles.sectionNet, { color: section.dayNet >= 0 ? COLORS.tertiary : COLORS.error }]}>
        {signedCompact(section.dayNet)}
      </Text>
    </View>
  );

  const renderItem = ({ item: tx }: { item: Transaction }) => (
    <TransactionCard
      transaction={tx}
      walletName={wallets.find((w) => w.id === tx.walletId)?.name ?? ''}
      onPress={() => handleTxPress(tx)}
    />
  );

  if (isLoading) return <LoadingSpinner />;

  // ── Main render ────────────────────────────────────────────────────────────

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
        keyExtractor={(tx) => tx.id}
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

      <UncategorizedPill count={uncategorizedCount} />

      <WalletPickerSheet
        visible={walletModalVisible}
        wallets={wallets}
        selectedWalletId={selectedWalletId}
        totalBalance={totalBalance}
        onSelect={handleWalletSelect}
        onClose={() => setWalletModalVisible(false)}
      />
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
  sectionList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING[16],
  },
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
});
