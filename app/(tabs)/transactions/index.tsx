import React, { useCallback, useRef, useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcon } from "@/components/common/MaterialIcon";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { MonthNavigator } from "@/components/transaction/MonthNavigator";
import { TransactionSummaryBanner } from "@/components/transaction/TransactionSummaryBanner";
import { TransactionCalendar } from "@/components/transaction/TransactionCalendar";
import { TransactionCard } from "@/components/transaction/TransactionCard";
import { WalletPickerSheet } from "@/components/transaction/WalletPickerSheet";
import { UncategorizedPill } from "@/components/transaction/UncategorizedPill";
import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";
import {
  useMonthlyTransactions,
  type TxSection,
  type DayCell,
} from "@/hooks/useMonthlyTransactions";
import { sectionLabel, todayISO } from "@/utils/date";
import { signedCompact } from "@/utils/formatters";
import type { Transaction } from "@/types";

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 30,
  minimumViewTime: 150,
};

export default function TransactionsScreen() {
  const router = useRouter();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [lastTap, setLastTap] = useState<{ iso: string; at: number } | null>(null);

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterVisible, setFilterVisible] = useState(false);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);

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
  } = useMonthlyTransactions(
    year,
    monthIdx,
    selectedWalletId,
    searchQuery,
    filterType,
    null,
    uncategorizedOnly,
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (!first) return;
      const section = (first as ViewToken & { section?: TxSection }).section;
      if (section?.title) setSelectedISO(section.title);
    },
    [],
  );

  const handlePrevMonth = () => {
    if (monthIdx === 0) {
      setYear((y) => y - 1);
      setMonthIdx(11);
    } else setMonthIdx((m) => m - 1);
    setSelectedISO("");
  };

  const handleNextMonth = () => {
    if (monthIdx === 11) {
      setYear((y) => y + 1);
      setMonthIdx(0);
    } else setMonthIdx((m) => m + 1);
    setSelectedISO("");
  };

  const handleDayPress = useCallback(
    (cell: DayCell) => {
      const at = Date.now();
      if (lastTap?.iso === cell.iso && at - lastTap.at < 300) {
        setLastTap(null);
        if (selectedWallet?.type === "linked") return;
        router.push({
          pathname: "/(tabs)/entry/manual",
          params: { date: cell.iso },
        });
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
          // section may not be rendered if off-screen -- ignore
        }
      }
    },
    [lastTap, selectedWallet, router, sections],
  );

  const handleTxPress = useCallback(
    (tx: Transaction) => {
      const wallet = wallets.find((w) => w.id === tx.walletId);
      const mode = wallet?.type === "basic" ? "full" : "category";
      router.push({
        pathname: "/(tabs)/transactions/[id]",
        params: { id: tx.id, mode },
      });
    },
    [wallets, router],
  );

  const handleWalletSelect = useCallback((id: string | null) => {
    setSelectedWalletId(id);
    setWalletModalVisible(false);
  }, []);

  const handleUncategorizedPillPress = useCallback(() => {
    setUncategorizedOnly((v) => !v);
  }, []);

  const handleSearchToggle = useCallback(() => {
    setSearchVisible((v) => {
      if (v) setSearchQuery("");
      return !v;
    });
  }, []);

  const handleFilterToggle = useCallback(() => {
    setFilterVisible((v) => !v);
  }, []);

  const handleFilterType = useCallback((type: "all" | "income" | "expense") => {
    setFilterType(type);
  }, []);

  const renderListHeader = useCallback(
    () =>
      sections.length > 0 ? (
        <Text style={styles.listLabel}>{"LỊCH SỬ GIAO DỊCH"}</Text>
      ) : null,
    [sections.length],
  );

  const renderListEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <MaterialIcon name="receipt_long" size={40} color={COLORS.outlineVariant} />
        <Text style={styles.emptyText}>{"Không có giao dịch trong tháng này"}</Text>
        <Text style={styles.emptyHint}>{"Nhấn đúp vào ngày để nhập giao dịch"}</Text>
      </View>
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TxSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionDate}>{sectionLabel(section.title)}</Text>
        <Text style={[styles.sectionNet, { color: section.dayNet >= 0 ? COLORS.tertiary : COLORS.error }]}>
          {signedCompact(section.dayNet)}
        </Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item: tx }: { item: Transaction }) => (
      <TransactionCard
        transaction={tx}
        walletName={wallets.find((w) => w.id === tx.walletId)?.name ?? ""}
        onPress={() => handleTxPress(tx)}
      />
    ),
    [wallets, handleTxPress],
  );

  if (isLoading) return <LoadingSpinner />;

  const isFiltered = filterType !== "all" || uncategorizedOnly || searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.walletPill}
          onPress={() => setWalletModalVisible(true)}
          activeOpacity={0.75}
        >
          <MaterialIcon name="account_balance_wallet" size={14} color={COLORS.primary} />
          <Text style={styles.walletPillText} numberOfLines={1}>
            {selectedWallet?.name ?? "Tất cả ví"}
          </Text>
          <MaterialIcon name="expand_more" size={14} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, searchVisible && styles.iconBtnActive]}
            activeOpacity={0.75}
            onPress={handleSearchToggle}
          >
            <MaterialIcon name="search" size={22} color={searchVisible ? COLORS.primary : COLORS.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, isFiltered && styles.iconBtnActive]}
            activeOpacity={0.75}
            onPress={handleFilterToggle}
          >
            <MaterialIcon name="tune" size={22} color={isFiltered ? COLORS.primary : COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {searchVisible && (
        <View style={styles.searchBar}>
          <MaterialIcon name="search" size={18} color={COLORS.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo tên merchant..."
            placeholderTextColor={COLORS.onSurfaceVariant}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery("")}>
              <MaterialIcon name="close" size={18} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {filterVisible && (
        <View style={styles.filterRow}>
          {(["all", "income", "expense"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              activeOpacity={0.7}
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => handleFilterType(type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {type === "all" ? "Tất cả" : type === "income" ? "Thu nhập" : "Chi tiêu"}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.filterChip, uncategorizedOnly && styles.filterChipActive]}
            onPress={() => setUncategorizedOnly((v) => !v)}
          >
            <Text style={[styles.filterChipText, uncategorizedOnly && styles.filterChipTextActive]}>
              Chưa phân loại
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sticky header: month nav + summary banner + calendar grid (all pinned) */}
      <View style={styles.stickyHeader}>
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
      </View>

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
        viewabilityConfig={VIEWABILITY_CONFIG}
      />

      <UncategorizedPill count={uncategorizedCount} onPress={handleUncategorizedPillPress} />

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  stickyHeader: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
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
  headerActions: { flexDirection: "row", gap: SPACING[1] },
  iconBtn: { width: 40, height: 40, borderRadius: BORDER_RADIUS.full, alignItems: "center", justifyContent: "center" },
  iconBtnActive: { backgroundColor: `${COLORS.primary}15` },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.onSurface, height: 36, padding: 0 },
  filterRow: {
    flexDirection: "row",
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  filterChipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: `${COLORS.primary}50` },
  filterChipText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  filterChipTextActive: { color: COLORS.primary },
  sectionList: { flex: 1 },
  listContent: { paddingBottom: SPACING[16] },
  listLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    letterSpacing: 0.8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.background,
  },
  sectionDate: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  sectionNet: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  emptyState: { alignItems: "center", paddingVertical: SPACING[10], gap: SPACING[2] },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, fontWeight: FONT_WEIGHT.medium },
  emptyHint: { fontSize: FONT_SIZE.xs, color: COLORS.outlineVariant },
});
