import React, { useCallback, useEffect, useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CategoryPickerSheet } from '@/components/categories';
import { useWallets } from '@/hooks/useWallets';
import { useCreateTransaction, useTransactions } from '@/hooks/useTransactions';
import { useRules } from '@/hooks';
import { getCategoryById } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import type { Wallet, Transaction, Rule } from '@/types';
import { getApiErrorMessage } from '@/utils/errors';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Nhập từ file CSV',
  back: 'arrow_back_ios_new',
  uploadTitle: 'Chọn file CSV từ máy.',
  uploadSubtitle: 'Cần có cột ngày, nội dung/diễn giải và số tiền',
  uploadIcon: 'cloud_upload',
  templateBtn: 'Tải file mẫu .csv',
  templateIcon: 'download',
  aiBadge: 'Tự động gợi ý danh mục dựa trên quy tắc đã lưu',
  aiBadgeIcon: 'auto_awesome',
  guideTitle: 'Hướng dẫn xuất file',
  guideHelp: 'help',
  guideSteps: [
    { title: 'Đăng nhập Internet Banking', body: 'Truy cập vào website ngân hàng trực tuyến của bạn trên máy tính.' },
    { title: 'Tra cứu lịch sử giao dịch', body: 'Vào mục Tài khoản > Lịch sử giao dịch, chọn khoảng thời gian cần xuất.' },
    { title: 'Tải xuống định dạng CSV', body: 'Tìm nút "Xuất file" hoặc "Tải xuống" và chọn định dạng Excel/CSV.' },
  ],
  confirmBtn: 'Chấp nhận tất cả',
  cancelBtn: 'Huỷ',
  duplicate: 'Có thể trùng',
  uncategorized: 'Chưa phân loại',
  pickCategory: 'Chọn danh mục',
  successMsg: (n: number) => `Đã nhập ${n} giao dịch thành công`,
  noWallets: 'Không có ví nào',
  selectWalletFirst: 'Vui lòng chọn ví trước',
  importError: 'Không thể nhập giao dịch.',
  startBtn: 'Chọn file & phân tích',
  step2Title: 'Chọn ví',
  step2Hint: 'Giao dịch sẽ được nhập vào ví này',
  step3Title: 'Xem trước dữ liệu',
  step3Hint: 'Kiểm tra và xác nhận trước khi nhập',
  pickerError: 'Không thể đọc file. Vui lòng thử lại.',
  parseErrorTitle: 'Không đọc được file CSV',
  parseErrorNoColumns: 'Không tìm thấy cột ngày hoặc số tiền. Hãy dùng file mẫu để đúng định dạng.',
  parseErrorNoRows: 'Không tìm thấy giao dịch hợp lệ nào trong file.',
  templateErrorTitle: 'Không thể tạo file mẫu',
  templateShareTitle: 'File mẫu CSV',
};

const TEMPLATE_CSV =
  'Ngày,Nội dung,Số tiền\n' +
  '2026-08-01,Cà phê Highlands,-45000\n' +
  '2026-08-05,Lương tháng 8,12000000\n';

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

// ─── CSV parsing ──────────────────────────────────────────────────────────────
// Header-based, not a real spreadsheet parser — good enough for the common
// single-sheet bank/e-wallet export shape, not arbitrary CSV/Excel dialects.

/** Splits one CSV line into fields, honoring double-quoted fields with embedded commas. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

const BOM_CHAR = String.fromCharCode(0xfeff);
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function splitCsvLines(text: string): string[] {
  const stripped = text.startsWith(BOM_CHAR) ? text.slice(1) : text;
  return stripped.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
}

/** Lowercases and strips Vietnamese diacritics so header matching is accent-insensitive. */
function normalizeHeader(s: string): string {
  return s.normalize('NFD').replace(COMBINING_DIACRITICS, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

const DATE_HEADERS = ['ngay', 'date', 'thoi gian'];
const DESC_HEADERS = ['noi dung', 'dien giai', 'description', 'mo ta', 'chi tiet'];
const AMOUNT_HEADERS = ['so tien', 'amount', 'gia tri'];
const DEBIT_HEADERS = ['ghi no', 'debit', 'phat sinh no'];
const CREDIT_HEADERS = ['ghi co', 'credit', 'phat sinh co'];

function findColumn(header: string[], candidates: string[]): number {
  return header.findIndex((h) => candidates.some((c) => h.includes(c)));
}

/** Accepts "2026-08-01", "01/08/2026", "01-08-2026" (with or without a trailing time). */
function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim().split(/\s+/)[0];
  let m = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Strips currency symbols/thousand-separators; keeps a leading minus sign. */
function normalizeAmount(raw: string): number {
  const isNegative = /^\s*-|^\s*\(.*\)\s*$/.test(raw);
  const digits = raw.replace(/[^\d]/g, '');
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 0;
  return isNegative ? -n : n;
}

/** Longest-keyword-wins substring match against the customer's saved merchant rules. */
function suggestCategoryFromMerchant(merchant: string, rules: Rule[]): string | null {
  const lower = merchant.toLowerCase();
  let best: Rule | null = null;
  for (const rule of rules) {
    if (lower.includes(rule.merchantKeyword.toLowerCase())) {
      if (!best || rule.merchantKeyword.length > best.merchantKeyword.length) best = rule;
    }
  }
  return best?.categoryId ?? null;
}

interface CsvParseOutcome {
  rows: ParsedRow[];
  /** Header row didn't contain a recognizable date or amount column at all. */
  missingColumns: boolean;
}

function parseCsvContent(text: string, rules: Rule[], existingTx: Transaction[]): CsvParseOutcome {
  const lines = splitCsvLines(text);
  if (lines.length < 2) return { rows: [], missingColumns: true };

  const header = parseCsvLine(lines[0]).map(normalizeHeader);
  const dateIdx = findColumn(header, DATE_HEADERS);
  const descIdx = findColumn(header, DESC_HEADERS);
  const amountIdx = findColumn(header, AMOUNT_HEADERS);
  const debitIdx = findColumn(header, DEBIT_HEADERS);
  const creditIdx = findColumn(header, CREDIT_HEADERS);

  if (dateIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) {
    return { rows: [], missingColumns: true };
  }

  const rows: ParsedRow[] = [];
  lines.slice(1).forEach((line, i) => {
    const cols = parseCsvLine(line);
    const date = normalizeDate(cols[dateIdx] ?? '');
    const merchant = (descIdx >= 0 ? cols[descIdx] : '')?.trim() || 'Không rõ nội dung';

    let amount = 0;
    let type: 'expense' | 'income' = 'expense';
    if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = debitIdx >= 0 ? Math.abs(normalizeAmount(cols[debitIdx] ?? '')) : 0;
      const credit = creditIdx >= 0 ? Math.abs(normalizeAmount(cols[creditIdx] ?? '')) : 0;
      if (credit > 0) { amount = credit; type = 'income'; } else { amount = debit; type = 'expense'; }
    } else {
      const raw = normalizeAmount(cols[amountIdx] ?? '');
      amount = Math.abs(raw);
      // No sign in the source column defaults to expense — the far more common
      // case in a personal transaction export. The sample template shows a
      // signed column so a real bank export usually disambiguates this.
      type = raw < 0 ? 'expense' : raw > 0 ? 'income' : 'expense';
    }

    if (!date || amount <= 0) return;

    const isDuplicate = existingTx.some(
      (t) => t.transactionDate === date && t.amount === amount
        && (t.merchant ?? '').toLowerCase() === merchant.toLowerCase(),
    );

    rows.push({
      id: `csv_${i}_${date}_${amount}`,
      date,
      merchant,
      amount,
      type,
      suggestedCategoryId: type === 'expense' ? suggestCategoryFromMerchant(merchant, rules) : null,
      isDuplicate,
      selected: !isDuplicate,
    });
  });

  return { rows, missingColumns: false };
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
  const { data: existingTx } = useTransactions();
  const { data: rules } = useRules();
  const createTx = useCreateTransaction();

  const wallets = (walletsData as any)?.wallets ?? (Array.isArray(walletsData) ? walletsData : []) as Wallet[];

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Only basic wallets can receive imported rows — bank-linked wallets are read-only
  // (their transactions come from provider sync).
  const importableWallets = wallets.filter((w: Wallet) => w.type !== 'linked');

  // Auto-select the first importable wallet so the "Accept" button isn't stuck disabled.
  useEffect(() => {
    if (!selectedWalletId && importableWallets.length > 0) {
      setSelectedWalletId(importableWallets[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importableWallets.length]);

  const handleParse = useCallback(async () => {
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
    } catch {
      Alert.alert(S.parseErrorTitle, S.pickerError);
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;

    setIsParsing(true);
    try {
      const text = await new File(result.assets[0].uri).text();
      const { rows: parsed, missingColumns } = parseCsvContent(
        text,
        rules ?? [],
        (existingTx ?? []) as Transaction[],
      );
      if (missingColumns) {
        Alert.alert(S.parseErrorTitle, S.parseErrorNoColumns);
        return;
      }
      if (parsed.length === 0) {
        Alert.alert(S.parseErrorTitle, S.parseErrorNoRows);
        return;
      }
      setRows(parsed);
    } catch {
      Alert.alert(S.parseErrorTitle, S.pickerError);
    } finally {
      setIsParsing(false);
    }
  }, [rules, existingTx]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      const dir = new Directory(Paths.cache, 'exports');
      if (!dir.exists) dir.create({ intermediates: true });
      const file = new File(dir, 'finviet_mau_giao_dich.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(BOM_CHAR + TEMPLATE_CSV);
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: S.templateShareTitle });
      } else {
        Alert.alert(S.templateShareTitle, file.uri);
      }
    } catch {
      Alert.alert(S.templateErrorTitle, S.pickerError);
    }
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
    let imported = 0;
    try {
      for (const row of toImport) {
        await createTx.mutateAsync({ walletId: selectedWalletId, categoryId: row.suggestedCategoryId, amount: row.amount, type: row.type, description: null, merchant: row.merchant, transactionDate: row.date, entryMethod: 'csv_import' });
        imported++;
      }
      Alert.alert('', S.successMsg(toImport.length), [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      // Surface the backend reason (e.g. insufficient balance) and report partial progress.
      Alert.alert('', `${getApiErrorMessage(err, S.importError)} (${imported}/${toImport.length})`);
    } finally { setIsImporting(false); }
  }, [selectedWalletId, rows, createTx, router]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const canStart = !!selectedWalletId && selectedCount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Quay lại">
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
        <TouchableOpacity activeOpacity={0.7} style={styles.templateBtn} onPress={handleDownloadTemplate}>
          <MaterialIcon name={S.templateIcon} size={16} color={COLORS.primary} />
          <Text style={styles.templateBtnText}>{S.templateBtn}</Text>
        </TouchableOpacity>

        {/* Step: Wallet */}
        {rows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>{S.step2Title}</Text>
            <Text style={styles.stepHint}>{S.step2Hint}</Text>
            {importableWallets.length === 0
              ? <Text style={styles.emptyText}>{S.noWallets}</Text>
              : (
                <View style={styles.walletList}>
                  {importableWallets.map((w: Wallet) => (
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
      <CategoryPickerSheet
        visible={editingRowId !== null}
        onClose={() => setEditingRowId(null)}
        title={S.pickCategory}
        entryType={rows.find((r) => r.id === editingRowId)?.type ?? 'expense'}
        selectedCategoryId={rows.find((r) => r.id === editingRowId)?.suggestedCategoryId}
        onSelect={handleCategorySelect}
      />
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
