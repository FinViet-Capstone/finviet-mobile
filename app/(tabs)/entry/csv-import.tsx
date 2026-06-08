import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { useWallets } from '@/hooks/useWallets';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { getCategoryById, CATEGORIES } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import type { Wallet } from '@/types/wallet';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Nhập từ CSV',
  back: 'arrow_back',
  step1Title: 'Chọn ngân hàng',
  step1Hint: 'Chọn định dạng file CSV ngân hàng của bạn',
  step2Title: 'Chọn ví',
  step2Hint: 'Giao dịch sẽ được nhập vào ví này',
  step3Title: 'Xem trước dữ liệu',
  step3Hint: 'Kiểm tra và xác nhận trước khi nhập',
  parseBtn: 'Phân tích CSV (Demo)',
  confirmBtn: 'Nhập tất cả',
  cancelBtn: 'Huỷ',
  duplicate: 'Có thể trùng',
  uncategorized: 'Chưa phân loại',
  successMsg: (n: number) => `Đã nhập ${n} giao dịch thành công`,
  noWallets: 'Không có ví nào',
  selectWalletFirst: 'Vui lòng chọn ví trước',
  banks: [
    { id: 'vietcombank', label: 'Vietcombank', icon: 'account_balance' },
    { id: 'bidv', label: 'BIDV', icon: 'account_balance' },
    { id: 'vietinbank', label: 'VietinBank', icon: 'account_balance' },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  type: 'expense' | 'income';
  suggestedCategoryId: string | null;
  isDuplicate: boolean;
  selected: boolean;
}

// ─── Mock CSV parser ──────────────────────────────────────────────────────────

function mockParseCsv(bankId: string): ParsedRow[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return [
    {
      id: 'csv_01', date: today, merchant: 'Circle K',
      amount: 45_000, type: 'expense', suggestedCategoryId: 'cat_food',
      isDuplicate: false, selected: true,
    },
    {
      id: 'csv_02', date: today, merchant: 'Grab',
      amount: 65_000, type: 'expense', suggestedCategoryId: 'cat_transport',
      isDuplicate: false, selected: true,
    },
    {
      id: 'csv_03', date: yesterday, merchant: 'VNPAY',
      amount: 250_000, type: 'expense', suggestedCategoryId: null,
      isDuplicate: false, selected: true,
    },
    {
      id: 'csv_04', date: yesterday, merchant: 'Grab Food',
      amount: 85_000, type: 'expense', suggestedCategoryId: 'cat_dining',
      isDuplicate: true, selected: false,
    },
    {
      id: 'csv_05', date: yesterday, merchant: 'Cong ty ' + bankId.toUpperCase(),
      amount: 12_000_000, type: 'income', suggestedCategoryId: 'cat_income',
      isDuplicate: false, selected: true,
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BankCard({
  bank,
  selected,
  onPress,
}: {
  bank: typeof S.banks[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[styles.bankCard, selected && styles.bankCardActive]}
      onPress={onPress}>
      <MaterialIcon name={bank.icon} size={24}
        color={selected ? COLORS.primary : COLORS.onSurfaceVariant} />
      <Text style={[styles.bankLabel, selected && { color: COLORS.primary }]}>
        {bank.label}
      </Text>
      {selected && <MaterialIcon name="check_circle" size={18} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

function WalletCard({
  wallet,
  selected,
  onPress,
}: {
  wallet: Wallet;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[styles.walletCard, selected && styles.walletCardActive]}
      onPress={onPress}>
      <MaterialIcon name="account_balance_wallet" size={20}
        color={selected ? COLORS.primary : COLORS.onSurfaceVariant} />
      <View style={styles.walletCardText}>
        <Text style={[styles.walletCardName, selected && { color: COLORS.primary }]}
          numberOfLines={1}>{wallet.name}</Text>
        <Text style={styles.walletCardBalance}>
          {formatVND(wallet.balance)}
        </Text>
      </View>
      {selected && <MaterialIcon name="check_circle" size={18} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

function PreviewRow({
  row,
  onToggle,
  onChangeCategory,
}: {
  row: ParsedRow;
  onToggle: () => void;
  onChangeCategory: (id: string | null) => void;
}) {
  const cat = row.suggestedCategoryId ? getCategoryById(row.suggestedCategoryId) : null;
  const icon = cat ? getCategoryIcon(cat.icon) : 'more_horiz';
  const isIncome = row.type === 'income';

  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[
        styles.previewRow,
        !row.selected && styles.previewRowDeselected,
        row.isDuplicate && styles.previewRowDuplicate,
      ]}
      onPress={onToggle}>
      {/* Checkbox */}
      <MaterialIcon
        name={row.selected ? 'check_box' : 'check_box_outline_blank'}
        size={20}
        color={row.selected ? COLORS.primary : COLORS.onSurfaceVariant}
      />

      {/* Category icon */}
      <View style={[styles.rowIconWrap, { backgroundColor: cat ? `${cat.color}25` : `${COLORS.outlineVariant}40` }]}>
        <MaterialIcon name={icon} size={16} color={cat?.color ?? COLORS.onSurfaceVariant} />
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowMerchant, !row.selected && styles.dimText]} numberOfLines={1}>
          {row.merchant}
        </Text>
        <Text style={styles.rowDate}>{row.date}</Text>
      </View>

      {/* Right */}
      <View style={styles.rowRight}>
        <Text style={[
          styles.rowAmount,
          { color: isIncome ? COLORS.tertiary : COLORS.onSurface },
          !row.selected && styles.dimText,
        ]}>
          {isIncome ? '+' : '-'}{formatVND(row.amount)}
        </Text>
        {row.isDuplicate && (
          <View style={styles.dupBadge}>
            <Text style={styles.dupBadgeText}>{S.duplicate}</Text>
          </View>
        )}
        {!row.suggestedCategoryId && (
          <View style={styles.uncatBadge}>
            <Text style={styles.uncatBadgeText}>{S.uncategorized}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CsvImportScreen() {
  const router = useRouter();
  const { data: walletsData } = useWallets();
  const createTx = useCreateTransaction();

  const wallets = (walletsData as any)?.wallets ?? (Array.isArray(walletsData) ? walletsData : []) as Wallet[];

  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleParse = useCallback(() => {
    if (!selectedBank) return;
    setIsParsing(true);
    setTimeout(() => {
      setRows(mockParseCsv(selectedBank));
      setIsParsing(false);
    }, 800);
  }, [selectedBank]);

  const handleToggleRow = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedWalletId) {
      Alert.alert('', S.selectWalletFirst);
      return;
    }
    const toImport = rows.filter((r) => r.selected);
    if (!toImport.length) return;

    setIsImporting(true);
    try {
      for (const row of toImport) {
        await createTx.mutateAsync({
          walletId: selectedWalletId,
          categoryId: row.suggestedCategoryId,
          amount: row.amount,
          type: row.type,
          description: null,
          merchant: row.merchant,
          transactionDate: row.date,
          aiSuggestedCategoryId: row.suggestedCategoryId,
          aiOverridden: false,
          entryMethod: 'csv_import',
        });
      }
      Alert.alert('', S.successMsg(toImport.length), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setIsImporting(false);
    }
  }, [selectedWalletId, rows, createTx, router]);

  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcon name={S.back} size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Step 1: Bank */}
        <View style={styles.stepSection}>
          <Text style={styles.stepTitle}>{S.step1Title}</Text>
          <Text style={styles.stepHint}>{S.step1Hint}</Text>
          <View style={styles.bankRow}>
            {S.banks.map((bank) => (
              <BankCard key={bank.id} bank={bank}
                selected={selectedBank === bank.id}
                onPress={() => { setSelectedBank(bank.id); setRows([]); }} />
            ))}
          </View>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.parseBtn, (!selectedBank || isParsing) && styles.parseBtnDisabled]}
            onPress={handleParse} disabled={!selectedBank || isParsing}>
            {isParsing
              ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
              : <Text style={styles.parseBtnText}>{S.parseBtn}</Text>}
          </TouchableOpacity>
        </View>

        {/* Step 2: Wallet */}
        {rows.length > 0 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>{S.step2Title}</Text>
            <Text style={styles.stepHint}>{S.step2Hint}</Text>
            {wallets.length === 0 ? (
              <Text style={styles.emptyText}>{S.noWallets}</Text>
            ) : (
              <View style={styles.walletList}>
                {wallets.map((w: Wallet) => (
                  <WalletCard key={w.id} wallet={w}
                    selected={selectedWalletId === w.id}
                    onPress={() => setSelectedWalletId(w.id)} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 3: Preview */}
        {rows.length > 0 && (
          <View style={styles.stepSection}>
            <View style={styles.stepTitleRow}>
              <Text style={styles.stepTitle}>{S.step3Title}</Text>
              <Text style={styles.selectedCount}>{selectedCount}/{rows.length} được chọn</Text>
            </View>
            <Text style={styles.stepHint}>{S.step3Hint}</Text>
            {rows.map((row) => (
              <PreviewRow key={row.id} row={row}
                onToggle={() => handleToggleRow(row.id)}
                onChangeCategory={() => {}} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      {rows.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn}
            onPress={() => router.back()}>
            <Text style={styles.cancelText}>{S.cancelBtn}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.confirmBtn, (!selectedCount || !selectedWalletId || isImporting) && styles.confirmBtnDisabled]}
            onPress={handleImport} disabled={!selectedCount || !selectedWalletId || isImporting}>
            {isImporting
              ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
              : <Text style={styles.confirmText}>{S.confirmBtn} ({selectedCount})</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[5] },
  stepSection: { gap: SPACING[3] },
  stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  stepHint: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  selectedCount: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  // Bank
  bankRow: { flexDirection: 'row', gap: SPACING[2] },
  bankCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    padding: SPACING[3], borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainer, borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  bankCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  bankLabel: { flex: 1, fontSize: 11, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  parseBtn: {
    height: 48, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  parseBtnDisabled: { opacity: 0.5 },
  parseBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
  // Wallet
  walletList: { gap: SPACING[2] },
  walletCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
    padding: SPACING[3], borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainer, borderWidth: 1, borderColor: COLORS.outlineVariant,
    minHeight: 48,
  },
  walletCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  walletCardText: { flex: 1 },
  walletCardName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  walletCardBalance: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  // Preview rows
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    padding: SPACING[3], borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow, borderWidth: 1, borderColor: COLORS.outlineVariant,
    minHeight: 56,
  },
  previewRowDeselected: { opacity: 0.5 },
  previewRowDuplicate: { borderColor: `${COLORS.secondary}50`, backgroundColor: `${COLORS.secondary}08` },
  rowIconWrap: { width: 32, height: 32, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowMerchant: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.onSurface },
  rowDate: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  dimText: { color: COLORS.onSurfaceVariant },
  rowRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  rowAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  dupBadge: { backgroundColor: `${COLORS.secondary}20`, paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  dupBadgeText: { fontSize: 10, color: COLORS.secondary, fontWeight: FONT_WEIGHT.semibold },
  uncatBadge: { backgroundColor: `${COLORS.outlineVariant}40`, paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  uncatBadgeText: { fontSize: 10, color: COLORS.onSurfaceVariant },
  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: SPACING[3],
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
    borderTopWidth: 1, borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.background,
  },
  cancelBtn: { flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  confirmBtn: { flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
});
