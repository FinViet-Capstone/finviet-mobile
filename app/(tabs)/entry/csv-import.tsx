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
  title: 'Nhập từ file CSV',
  back: 'arrow_back_ios_new',
  uploadTitle: 'Chọn file CSV từ máy hoặc kéo thả vào đây.',
  uploadSubtitle: 'Hỗ trợ định dạng .csv, tối đa 10MB',
  uploadIcon: 'cloud_upload',
  templateBtn: 'Tải file mẫu .csv',
  templateIcon: 'download',
  banksSection: 'Ngân hàng hỗ trợ tự động',
  guideTitle: 'Hướng dẫn xuất file',
  guideHelp: 'help',
  guideSteps: [
    { title: 'Đăng nhập Internet Banking', body: 'Truy cập vào website ngân hàng trực tuyến của bạn trên máy tính.' },
    { title: 'Tra cứu lịch sử giao dịch', body: 'Vào mục Tài khoản > Lịch sử giao dịch, chọn khoảng thời gian cần xuất.' },
    { title: 'Tải xuống định dạng CSV', body: 'Tìm nút "Xuất file" hoặc "Tải xuống" và chọn định dạng Excel/CSV.' },
  ],
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
  startBtn: 'Bắt đầu nhập',
  banks: [
    { id: 'vietcombank', label: 'Vietcombank', icon: 'account_balance' },
    { id: 'bidv',        label: 'BIDV',        icon: 'account_balance' },
    { id: 'vietinbank', label: 'VietinBank',  icon: 'account_balance' },
    { id: 'techcombank',label: 'Techcombank', icon: 'account_balance' },
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
    { id: 'csv_01', date: today,     merchant: 'Circle K',          amount: 45_000,     type: 'expense', suggestedCategoryId: 'cat_food',      isDuplicate: false, selected: true },
    { id: 'csv_02', date: today,     merchant: 'Grab',              amount: 65_000,     type: 'expense', suggestedCategoryId: 'cat_transport',  isDuplicate: false, selected: true },
    { id: 'csv_03', date: yesterday, merchant: 'VNPAY',             amount: 250_000,    type: 'expense', suggestedCategoryId: null,             isDuplicate: false, selected: true },
    { id: 'csv_04', date: yesterday, merchant: 'Grab Food',         amount: 85_000,     type: 'expense', suggestedCategoryId: 'cat_dining',     isDuplicate: true,  selected: false },
    { id: 'csv_05', date: yesterday, merchant: `Cty ${bankId.toUpperCase()}`, amount: 12_000_000, type: 'income',  suggestedCategoryId: 'cat_income',    isDuplicate: false, selected: true },
  ];
}

function formatVND(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function BankCard({ bank, selected, onPress }: { bank: typeof S.banks[number]; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.bankCard, selected && styles.bankCardActive]} onPress={onPress}>
      <MaterialIcon name={bank.icon} size={22} color={selected ? COLORS.primary : COLORS.onSurfaceVariant} />
      <Text style={[styles.bankLabel, selected && { color: COLORS.primary }]}>{bank.label}</Text>
      {selected && <MaterialIcon name="check_circle" size={16} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

function WalletCard({ wallet, selected, onPress }: { wallet: Wallet; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.walletCard, selected && styles.walletCardActive]} onPress={onPress}>
      <MaterialIcon name="account_balance_wallet" size={18} color={selected ? COLORS.primary : COLORS.onSurfaceVariant} />
      <View style={styles.walletCardText}>
        <Text style={[styles.walletCardName, selected && { color: COLORS.primary }]} numberOfLines={1}>{wallet.name}</Text>
        <Text style={styles.walletCardBalance}>{formatVND(wallet.balance)}</Text>
      </View>
      {selected && <MaterialIcon name="check_circle" size={16} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

function PreviewRow({ row, onToggle }: { row: ParsedRow; onToggle: () => void }) {
  const cat = row.suggestedCategoryId ? getCategoryById(row.suggestedCategoryId) : null;
  const icon = cat ? getCategoryIcon(cat.icon) : 'more_horiz';
  const isIncome = row.type === 'income';

  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.previewRow, !row.selected && styles.previewRowDeselected, row.isDuplicate && styles.previewRowDuplicate]} onPress={onToggle}>
      {/* Checkbox */}
      <MaterialIcon name={row.selected ? 'check_box' : 'check_box_outline_blank'} size={20} color={row.selected ? COLORS.primary : COLORS.onSurfaceVariant} />
      {/* Category icon */}
      <View style={[styles.rowIconWrap, { backgroundColor: cat ? `${cat.color}25` : `${COLORS.outlineVariant}40` }]}>
        <MaterialIcon name={icon} size={14} color={cat?.color ?? COLORS.onSurfaceVariant} />
      </View>
      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowMerchant, !row.selected && styles.dimText]} numberOfLines={1}>{row.merchant}</Text>
        <Text style={styles.rowDate}>{row.date}</Text>
      </View>
      {/* Right */}
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: isIncome ? COLORS.tertiary : COLORS.onSurface }, !row.selected && styles.dimText]}>
          {isIncome ? '+' : '-'}{formatVND(row.amount)}
        </Text>
        {row.isDuplicate && <View style={styles.dupBadge}><Text style={styles.dupBadgeText}>{S.duplicate}</Text></View>}
        {!row.suggestedCategoryId && <View style={styles.uncatBadge}><Text style={styles.uncatBadgeText}>{S.uncategorized}</Text></View>}
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
    setTimeout(() => { setRows(mockParseCsv(selectedBank)); setIsParsing(false); }, 800);
  }, [selectedBank]);

  const handleToggleRow = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedWalletId) { Alert.alert('', S.selectWalletFirst); return; }
    const toImport = rows.filter((r) => r.selected);
    if (!toImport.length) return;
    setIsImporting(true);
    try {
      for (const row of toImport) {
        await createTx.mutateAsync({ walletId: selectedWalletId, categoryId: row.suggestedCategoryId, amount: row.amount, type: row.type, description: null, merchant: row.merchant, transactionDate: row.date, aiSuggestedCategoryId: row.suggestedCategoryId, aiOverridden: false, entryMethod: 'csv_import' });
      }
      Alert.alert('', S.successMsg(toImport.length), [{ text: 'OK', onPress: () => router.back() }]);
    } finally { setIsImporting(false); }
  }, [selectedWalletId, rows, createTx, router]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const canStart = !!selectedWalletId && selectedCount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcon name={S.back} size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Upload area */}
        <TouchableOpacity activeOpacity={0.75} style={styles.uploadArea}>
          <View style={styles.uploadIconWrap}>
            <MaterialIcon name={S.uploadIcon} size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.uploadTitle}>{S.uploadTitle}</Text>
          <Text style={styles.uploadSubtitle}>{S.uploadSubtitle}</Text>
        </TouchableOpacity>

        {/* Template link */}
        <TouchableOpacity activeOpacity={0.7} style={styles.templateBtn}>
          <MaterialIcon name={S.templateIcon} size={16} color={COLORS.primary} />
          <Text style={styles.templateBtnText}>{S.templateBtn}</Text>
        </TouchableOpacity>

        {/* Step 1: Bank */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.banksSection}</Text>
          <View style={styles.bankRow}>
            {S.banks.map((bank) => (
              <BankCard key={bank.id} bank={bank} selected={selectedBank === bank.id} onPress={() => { setSelectedBank(bank.id); setRows([]); }} />
            ))}
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.parseBtn, (!selectedBank || isParsing) && styles.parseBtnDisabled]}
            onPress={handleParse}
            disabled={!selectedBank || isParsing}
          >
            {isParsing
              ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
              : <Text style={styles.parseBtnText}>{S.parseBtn}</Text>}
          </TouchableOpacity>
        </View>

        {/* Step 2: Wallet */}
        {rows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>{S.step2Title}</Text>
            <Text style={styles.stepHint}>{S.step2Hint}</Text>
            {wallets.length === 0
              ? <Text style={styles.emptyText}>{S.noWallets}</Text>
              : (
                <View style={styles.walletList}>
                  {wallets.map((w: Wallet) => (
                    <WalletCard key={w.id} wallet={w} selected={selectedWalletId === w.id} onPress={() => setSelectedWalletId(w.id)} />
                  ))}
                </View>
              )}
          </View>
        )}

        {/* Step 3: Preview */}
        {rows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.stepTitleRow}>
              <Text style={styles.stepTitle}>{S.step3Title}</Text>
              <Text style={styles.selectedCount}>{selectedCount}/{rows.length} được chọn</Text>
            </View>
            <Text style={styles.stepHint}>{S.step3Hint}</Text>
            {rows.map((row) => (
              <PreviewRow key={row.id} row={row} onToggle={() => handleToggleRow(row.id)} />
            ))}
          </View>
        )}

        {/* Guide */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <MaterialIcon name={S.guideHelp} size={20} color={COLORS.primary} />
            <Text style={styles.guideTitle}>{S.guideTitle}</Text>
          </View>
          {S.guideSteps.map((step, i) => (
            <View key={i} style={styles.guideStep}>
              <View style={styles.guideStepNum}><Text style={styles.guideStepNumText}>{i + 1}</Text></View>
              <View style={styles.guideStepText}>
                <Text style={styles.guideStepTitle}>{step.title}</Text>
                <Text style={styles.guideStepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomBar}>
        {rows.length > 0 ? (
          <>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>{S.cancelBtn}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.confirmBtn, (!canStart || isImporting) && styles.confirmBtnDisabled]}
              onPress={handleImport}
              disabled={!canStart || isImporting}
            >
              {isImporting
                ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
                : <Text style={styles.confirmText}>{S.confirmBtn} ({selectedCount})</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.startBtn, !selectedBank && styles.confirmBtnDisabled]}
            disabled={!selectedBank}
            onPress={handleParse}
          >
            <Text style={[styles.confirmText, !selectedBank && { color: COLORS.onSurfaceVariant }]}>{S.startBtn}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },

  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING[4], paddingTop: SPACING[4], gap: SPACING[4] },

  // Upload area
  uploadArea: {
    backgroundColor: `${COLORS.surfaceContainer}99`,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
    paddingVertical: SPACING[6],
    alignItems: 'center',
    gap: SPACING[2],
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[1],
  },
  uploadTitle: { fontSize: FONT_SIZE.sm, color: COLORS.onSurface, textAlign: 'center', paddingHorizontal: SPACING[4] },
  uploadSubtitle: { fontSize: 11, color: COLORS.outline },

  // Template
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    alignSelf: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.primary}10`,
  },
  templateBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },

  // Section
  section: { gap: SPACING[3] },
  sectionLabel: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.2 },
  stepTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepHint: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginTop: -SPACING[2] },
  selectedCount: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },

  // Banks
  bankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2] + 2,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  bankCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  bankLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },

  parseBtn: {
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.inversePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parseBtnDisabled: { opacity: 0.45 },
  parseBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },

  // Wallets
  walletList: { gap: SPACING[2] },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minHeight: 56,
  },
  walletCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  walletCardText: { flex: 1 },
  walletCardName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  walletCardBalance: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },

  // Preview rows
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minHeight: 56,
  },
  previewRowDeselected: { opacity: 0.5 },
  previewRowDuplicate: { borderColor: `${COLORS.secondary}50`, backgroundColor: `${COLORS.secondary}08` },
  rowIconWrap: { width: 30, height: 30, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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

  // Guide
  guideCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING[4],
    overflow: 'hidden',
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  guideTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  guideStep: { flexDirection: 'row', gap: SPACING[3], alignItems: 'flex-start' },
  guideStepNum: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  guideStepNumText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  guideStepText: { flex: 1, gap: 2 },
  guideStepTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  guideStepBody: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING[3],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.background,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.inversePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
  startBtn: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.inversePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
