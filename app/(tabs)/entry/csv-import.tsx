import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DraggableSheet } from '@/components/common/DraggableSheet';
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
  uploadSubtitle: 'Hỗ trợ mọi định dạng .csv — AI tự nhận diện cột',
  uploadIcon: 'cloud_upload',
  templateBtn: 'Tải file mẫu .csv',
  templateIcon: 'download',
  aiBadge: 'AI tự phân loại mọi định dạng CSV',
  aiBadgeIcon: 'auto_awesome',
  guideTitle: 'Hướng dẫn xuất file',
  guideHelp: 'help',
  guideSteps: [
    { title: 'Đăng nhập Internet Banking', body: 'Truy cập vào website ngân hàng trực tuyến của bạn trên máy tính.' },
    { title: 'Tra cứu lịch sử giao dịch', body: 'Vào mục Tài khoản > Lịch sử giao dịch, chọn khoảng thời gian cần xuất.' },
    { title: 'Tải xuống định dạng CSV', body: 'Tìm nút "Xuất file" hoặc "Tải xuống" và chọn định dạng Excel/CSV.' },
  ],
  parseBtn: 'Phân tích CSV (Demo)',
  confirmBtn: 'Chấp nhận tất cả',
  cancelBtn: 'Huỷ',
  duplicate: 'Có thể trùng',
  uncategorized: 'Chưa phân loại',
  pickCategory: 'Chọn danh mục',
  successMsg: (n: number) => `Đã nhập ${n} giao dịch thành công`,
  noWallets: 'Không có ví nào',
  selectWalletFirst: 'Vui lòng chọn ví trước',
  startBtn: 'Chọn file & phân tích',
  step2Title: 'Chọn ví',
  step2Hint: 'Giao dịch sẽ được nhập vào ví này',
  step3Title: 'Xem trước dữ liệu',
  step3Hint: 'Kiểm tra và xác nhận trước khi nhập',
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

function mockParseCsv(): ParsedRow[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return [
    { id: 'csv_01', date: today,     merchant: 'Circle K',          amount: 45_000,     type: 'expense', suggestedCategoryId: 'cat_food',      isDuplicate: false, selected: true },
    { id: 'csv_02', date: today,     merchant: 'Grab',              amount: 65_000,     type: 'expense', suggestedCategoryId: 'cat_transport',  isDuplicate: false, selected: true },
    { id: 'csv_03', date: yesterday, merchant: 'VNPAY',             amount: 250_000,    type: 'expense', suggestedCategoryId: null,             isDuplicate: false, selected: true },
    { id: 'csv_04', date: yesterday, merchant: 'Grab Food',         amount: 85_000,     type: 'expense', suggestedCategoryId: 'cat_dining',     isDuplicate: true,  selected: false },
    { id: 'csv_05', date: yesterday, merchant: 'Cty TNHH ABC',      amount: 12_000_000, type: 'income',  suggestedCategoryId: 'cat_income',    isDuplicate: false, selected: true },
  ];
}

function formatVND(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function PreviewRow({ row, onToggle, onEditCategory }: { row: ParsedRow; onToggle: () => void; onEditCategory: () => void }) {
  const cat = row.suggestedCategoryId ? getCategoryById(row.suggestedCategoryId) : null;
  const icon = cat ? getCategoryIcon(cat.icon) : 'more_horiz';
  const isIncome = row.type === 'income';
  const needsCategoryEdit = !row.suggestedCategoryId;

  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.previewRow, !row.selected && styles.previewRowDeselected, row.isDuplicate && styles.previewRowDuplicate]} onPress={onToggle}>
      {/* Checkbox */}
      <MaterialIcon name={row.selected ? 'check_box' : 'check_box_outline_blank'} size={20} color={row.selected ? COLORS.primary : COLORS.onSurfaceVariant} />
      {/* Category icon — tappable if uncategorized */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={needsCategoryEdit ? onEditCategory : undefined}
        style={[styles.rowIconWrap, { backgroundColor: cat ? `${cat.color}25` : `${COLORS.secondary}20` }, needsCategoryEdit && styles.rowIconWrapUncategorized]}
      >
        <MaterialIcon name={icon} size={14} color={needsCategoryEdit ? COLORS.secondary : (cat?.color ?? COLORS.onSurfaceVariant)} />
      </TouchableOpacity>
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
        {needsCategoryEdit && (
          <TouchableOpacity activeOpacity={0.7} onPress={onEditCategory} style={styles.uncatBadge}>
            <Text style={styles.uncatBadgeText}>{S.uncategorized}</Text>
          </TouchableOpacity>
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

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    setIsParsing(true);
    setTimeout(() => { setRows(mockParseCsv()); setIsParsing(false); }, 800);
  }, []);

  const handleToggleRow = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
  }, []);

  const handleEditCategory = useCallback((id: string) => {
    setEditingRowId(id);
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setRows((prev) => prev.map((r) => r.id === editingRowId ? { ...r, suggestedCategoryId: categoryId } : r));
    setEditingRowId(null);
  }, [editingRowId]);

  const handleImport = useCallback(async () => {
    if (!selectedWalletId) { Alert.alert('', S.selectWalletFirst); return; }
    const toImport = rows.filter((r) => r.selected);
    if (!toImport.length) return;
    setIsImporting(true);
    try {
      for (const row of toImport) {
        await createTx.mutateAsync({ walletId: selectedWalletId, categoryId: row.suggestedCategoryId, amount: row.amount, type: row.type, description: null, merchant: row.merchant, transactionDate: row.date, entryMethod: 'csv_import' });
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
        <TouchableOpacity activeOpacity={0.75} style={styles.uploadArea} onPress={handleParse} disabled={isParsing}>
          <View style={styles.uploadIconWrap}>
            {isParsing
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <MaterialIcon name={S.uploadIcon} size={32} color={COLORS.primary} />}
          </View>
          <Text style={styles.uploadTitle}>{S.uploadTitle}</Text>
          <Text style={styles.uploadSubtitle}>{S.uploadSubtitle}</Text>
        </TouchableOpacity>

        {/* AI badge — AI is the categorisation engine, any CSV format works */}
        <View style={styles.aiBadge}>
          <MaterialIcon name={S.aiBadgeIcon} size={16} color={COLORS.primary} />
          <Text style={styles.aiBadgeText}>{S.aiBadge}</Text>
        </View>

        {/* Template link */}
        <TouchableOpacity activeOpacity={0.7} style={styles.templateBtn}>
          <MaterialIcon name={S.templateIcon} size={16} color={COLORS.primary} />
          <Text style={styles.templateBtnText}>{S.templateBtn}</Text>
        </TouchableOpacity>

        {/* Step: Wallet */}
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
              <PreviewRow key={row.id} row={row} onToggle={() => handleToggleRow(row.id)} onEditCategory={() => handleEditCategory(row.id)} />
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
            style={[styles.startBtn, isParsing && styles.confirmBtnDisabled]}
            disabled={isParsing}
            onPress={handleParse}
          >
            {isParsing
              ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
              : <Text style={styles.confirmText}>{S.startBtn}</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Category picker for uncategorized rows */}
      <DraggableSheet visible={editingRowId !== null} onClose={() => setEditingRowId(null)}>
        <View style={styles.catSheetContent}>
          <Text style={styles.catSheetTitle}>{S.pickCategory}</Text>
          <FlatList
            data={[...CATEGORIES]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const editing = rows.find((r) => r.id === editingRowId);
              const selected = editing?.suggestedCategoryId === item.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.catRow, selected && styles.catRowSelected]}
                  onPress={() => handleCategorySelect(item.id)}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: `${item.color}25` }]}>
                    <MaterialIcon name={getCategoryIcon(item.icon)} size={16} color={item.color} />
                  </View>
                  <Text style={styles.catRowText}>{item.nameVi}</Text>
                  {selected && <MaterialIcon name="check" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </DraggableSheet>
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
  stepTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepHint: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginTop: -SPACING[2] },
  selectedCount: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },

  // AI badge
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    alignSelf: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
  },
  aiBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },

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
  rowIconWrapUncategorized: { borderWidth: 1, borderColor: `${COLORS.secondary}50`, borderStyle: 'dashed' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowMerchant: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.onSurface },
  rowDate: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  dimText: { color: COLORS.onSurfaceVariant },
  rowRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  rowAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  dupBadge: { backgroundColor: `${COLORS.secondary}20`, paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  dupBadgeText: { fontSize: 10, color: COLORS.secondary, fontWeight: FONT_WEIGHT.semibold },
  uncatBadge: { backgroundColor: `${COLORS.secondary}20`, paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  uncatBadgeText: { fontSize: 10, color: COLORS.secondary, fontWeight: FONT_WEIGHT.semibold },

  // Category picker sheet
  catSheetContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[8], maxHeight: '70%' },
  catSheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, marginBottom: SPACING[3] },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  catRowSelected: { backgroundColor: `${COLORS.primaryContainer}22`, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING[2], borderBottomWidth: 0, marginVertical: SPACING[1] },
  catIconWrap: { width: 32, height: 32, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  catRowText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.onSurface },

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
