import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CategoryPickerSheet } from '@/components/categories';
import { useWallets } from '@/hooks/useWallets';
import { useCreateTransaction, useTransactions } from '@/hooks/useTransactions';
import { useRules, useExtractFromCsv } from '@/hooks';
import { getCategoryById } from '@/constants/categories';
import type { Wallet, Transaction, Rule } from '@/types';
import { getApiErrorMessage } from '@/utils/errors';
import { scheduleCsvImportReadyNotification } from '@/lib/notifications';
import { useEphemeralBannerStore } from '@/stores/ephemeralBannerStore';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Xác nhận giao dịch',
  back: 'arrow_back_ios_new',
  loadingTitle: 'AI đang phân loại giao dịch...',
  loadingSubtitle: 'Có thể mất chút thời gian nếu file có nhiều giao dịch.',
  errorTitle: 'Không đọc được file CSV',
  parseErrorNoRows: "Không tìm thấy giao dịch hợp lệ nào trong file. Vui lòng đảm bảo file CSV của bạn có các cột 'Ngày', 'Nội dung' và 'Số tiền' giống với file mẫu.",
  genericError: 'Không thể phân tích file. Vui lòng thử lại.',
  goBack: 'Quay lại',
  confirmBtn: (n: number) => `Nhập ${n} giao dịch đã chọn`,
  cancelBtn: 'Huỷ',
  selectAll: 'Chọn tất cả',
  deselectAll: 'Bỏ chọn tất cả',
  duplicate: 'Có thể trùng',
  uncategorized: 'Chưa phân loại',
  aiCategorizeFailed: 'AI không phân loại được — chạm để chọn',
  pickCategory: 'Chọn danh mục',
  amountLabel: 'Số tiền',
  categoryLabel: 'Danh mục',
  dateLabel: 'Ngày',
  successMsg: (n: number) => `Đã nhập ${n} giao dịch thành công`,
  noWallets: 'Không có ví nào',
  selectWalletFirst: 'Vui lòng chọn ví trước',
  importError: 'Không thể nhập giao dịch.',
  importPartialTitle: 'Nhập một phần giao dịch',
  importPartialMsg: (imported: number, total: number) => `Đã nhập ${imported}/${total} giao dịch. Các giao dịch sau không nhập được:`,
  step2Title: 'Chọn ví',
  step2Hint: 'Giao dịch sẽ được nhập vào ví này',
  step3Title: 'Xem trước dữ liệu',
  step3Hint: 'Kiểm tra và xác nhận trước khi nhập',
  notifyReadyTitle: 'Phân loại xong',
  notifyReadyBody: (n: number) => `AI đã phân loại xong ${n} giao dịch. Chạm để xem kết quả.`,
  contentLabel: 'Nội dung',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  id: string;
  date: string;
  merchant: string;
  /** Raw transaction description, when distinct from `merchant` (a real counterparty name was
   * parsed separately) — shown as its own field instead of being silently dropped. */
  description: string | null;
  amount: number;
  type: 'expense' | 'income';
  suggestedCategoryId: string | null;
  /** How suggestedCategoryId was chosen — cleared once the user manually overrides it via the
   * category picker, so only genuine AI/rule decisions get logged as a categorization decision. */
  categorySource: 'ai' | 'client_rule' | null;
  /** AI confidence for suggestedCategoryId, 0-1 — only set when categorySource is 'ai'. */
  confidence: number | null;
  isDuplicate: boolean;
  selected: boolean;
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

function formatVND(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function WalletCard({ wallet, selected, onPress }: { wallet: Wallet; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.walletCard, selected && styles.walletCardActive]} onPress={onPress}>
      <MaterialIcon name="account_balance_wallet" size={18} color={selected ? colors.primary : colors.onSurfaceVariant} />
      <View style={styles.walletCardText}>
        <Text style={[styles.walletCardName, selected && { color: colors.primary }]} numberOfLines={1}>{wallet.name}</Text>
        <Text style={styles.walletCardBalance}>{formatVND(wallet.balance)}</Text>
      </View>
      {selected && <MaterialIcon name="check_circle" size={16} color={colors.primary} />}
    </TouchableOpacity>
  );
}

/** Labeled-field card, matching photo-confirm's ReviewRow layout (Số tiền / Danh mục / Ngày as
 * label-left value-right rows) so both entry methods read the same way — just without a photo
 * thumbnail, since CSV rows don't have one; the merchant serves as the row's title instead. */
function PreviewRow({ row, onToggle, onEditCategory }: { row: ParsedRow; onToggle: () => void; onEditCategory: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cat = row.suggestedCategoryId ? getCategoryById(row.suggestedCategoryId) : null;
  const isIncome = row.type === 'income';
  const needsCategoryEdit = !row.suggestedCategoryId;
  // Income rows are never sent for AI categorization by design (only expenses are), so a
  // missing category there is expected, not a failure — only flag it for expense rows.
  const aiFailedToCategorize = needsCategoryEdit && !isIncome;

  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.previewRow, !row.selected && styles.previewRowDeselected, row.isDuplicate && styles.previewRowDuplicate]} onPress={onToggle}>
      {/* Top: checkbox + merchant (title) + duplicate badge */}
      <View style={styles.rowTopRow}>
        <View style={styles.rowTopLeft}>
          <MaterialIcon name={row.selected ? 'check_box' : 'check_box_outline_blank'} size={20} color={row.selected ? colors.primary : colors.onSurfaceVariant} />
          <Text style={[styles.rowMerchant, !row.selected && styles.dimText]}>{row.merchant}</Text>
        </View>
        {row.isDuplicate && <View style={styles.dupBadge}><Text style={styles.dupBadgeText}>{S.duplicate}</Text></View>}
      </View>

      {/* Số tiền */}
      <View style={styles.rowField}>
        <Text style={styles.rowFieldLabel}>{S.amountLabel}</Text>
        <Text style={[styles.rowFieldValue, { color: isIncome ? colors.tertiary : colors.onSurface }]}>
          {isIncome ? '+' : '-'}{formatVND(row.amount)}
        </Text>
      </View>

      {/* Nội dung — only shown when it's genuinely distinct info from the merchant title above
          (a real counterparty name was parsed separately from the transaction description) */}
      {row.description && (
        <View style={styles.rowField}>
          <Text style={styles.rowFieldLabel}>{S.contentLabel}</Text>
          <Text style={styles.rowFieldValue} numberOfLines={3}>{row.description}</Text>
        </View>
      )}

      {/* Danh mục — tappable */}
      <TouchableOpacity activeOpacity={0.7} style={styles.rowField} onPress={onEditCategory}>
        <Text style={styles.rowFieldLabel}>{S.categoryLabel}</Text>
        <View style={styles.rowCategoryRight}>
          {cat ? (
            <>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={styles.rowFieldValue}>{cat.nameVi}</Text>
            </>
          ) : aiFailedToCategorize ? (
            <>
              <MaterialIcon name="error_outline" size={12} color={colors.error} />
              <Text style={styles.aiFailedText}>{S.aiCategorizeFailed}</Text>
            </>
          ) : (
            <Text style={styles.uncategorizedText}>{S.uncategorized}</Text>
          )}
          <MaterialIcon name="chevron_right" size={16} color={aiFailedToCategorize ? colors.error : needsCategoryEdit ? colors.secondary : colors.onSurfaceVariant} />
        </View>
      </TouchableOpacity>

      {/* Ngày */}
      <View style={styles.rowField}>
        <Text style={styles.rowFieldLabel}>{S.dateLabel}</Text>
        <Text style={styles.rowFieldValue}>{row.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CsvReviewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { fileUri, fileName } = useLocalSearchParams<{ fileUri: string; fileName: string }>();
  const { data: walletsData } = useWallets();
  const { data: existingTx } = useTransactions();
  const { data: rules } = useRules();
  const createTx = useCreateTransaction();
  const extractCsv = useExtractFromCsv();

  const wallets = (walletsData as any)?.wallets ?? (Array.isArray(walletsData) ? walletsData : []) as Wallet[];

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState(S.genericError);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Switching tabs doesn't unmount this screen (no unmountOnBlur), so the extraction call
  // below keeps running and updating state even when the user isn't looking at it — this ref
  // lets that async completion know whether to notify instead of just updating a hidden screen.
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  useEffect(() => { isFocusedRef.current = isFocused; }, [isFocused]);

  const showBackNotification = useEphemeralBannerStore((state) => state.show);
  const notifyIfOffScreen = useCallback((title: string, body: string) => {
    if (isFocusedRef.current) return;
    const goBackToReview = () => router.navigate({
      pathname: '/(tabs)/entry/csv-review',
      params: { fileUri: fileUri ?? '', fileName: fileName ?? 'statement.csv' },
    });
    if (AppState.currentState === 'active') {
      showBackNotification({ title, body, onPress: goBackToReview });
    } else {
      scheduleCsvImportReadyNotification({ title, body, fileUri: fileUri ?? '', fileName: fileName ?? 'statement.csv' })
        .catch(() => {}); // best-effort — missing notification permission shouldn't break extraction
    }
  }, [fileUri, fileName, router, showBackNotification]);

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

  // Runs the (potentially slow — one AI call per row) categorization extraction once,
  // as soon as this screen mounts, so the loading state below is what the user sees
  // while it's in flight rather than a blank inline spinner buried in the upload screen.
  useEffect(() => {
    if (!fileUri) { setStatus('error'); return; }
    let cancelled = false;
    (async () => {
      try {
        const response = await extractCsv.mutateAsync({ fileUri, fileName: fileName ?? 'statement.csv' });
        if (cancelled) return;
        if (response.rows.length === 0) {
          setErrorMsg(S.parseErrorNoRows);
          setStatus('error');
          notifyIfOffScreen(S.errorTitle, S.parseErrorNoRows);
          return;
        }
        const existing = (existingTx ?? []) as Transaction[];
        const parsed: ParsedRow[] = response.rows.map((row, i) => {
          const merchant = row.merchant || 'Không rõ nội dung';
          const isDuplicate = existing.some(
            (t) => t.transactionDate === row.transactionDate && t.amount === row.amount
              && (t.merchant ?? '').toLowerCase() === merchant.toLowerCase(),
          );
          // Only worth its own field when it actually adds information — most rows have no
          // distinct correspondent column, so merchant/description end up identical.
          const description = row.description && row.description !== row.merchant ? row.description : null;
          const clientRuleCategoryId = row.type === 'expense' ? suggestCategoryFromMerchant(merchant, rules ?? []) : null;
          return {
            id: `csv_${i}_${row.transactionDate}_${row.amount}`,
            date: row.transactionDate,
            merchant,
            description,
            amount: row.amount,
            type: row.type,
            suggestedCategoryId: row.categoryId ?? clientRuleCategoryId,
            categorySource: row.categoryId ? 'ai' : clientRuleCategoryId ? 'client_rule' : null,
            confidence: row.categoryId ? row.confidence : null,
            isDuplicate,
            selected: !isDuplicate,
          };
        });
        setRows(parsed);
        setStatus('ready');
        notifyIfOffScreen(S.notifyReadyTitle, S.notifyReadyBody(parsed.length));
      } catch (err) {
        if (cancelled) return;
        const message = getApiErrorMessage(err, S.genericError);
        setErrorMsg(message);
        setStatus('error');
        notifyIfOffScreen(S.errorTitle, message);
      }
    })();
    return () => { cancelled = true; };
    // Runs exactly once per mount — re-running on every rules/existingTx refetch would
    // re-trigger the (expensive) extraction call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUri, fileName]);

  const handleToggleRow = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
  }, []);

  const handleToggleAll = useCallback(() => {
    setRows((prev) => {
      const shouldSelectAll = !prev.every((r) => r.selected);
      return prev.map((r) => ({ ...r, selected: shouldSelectAll }));
    });
  }, []);

  const handleEditCategory = useCallback((id: string) => {
    setEditingRowId(id);
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    // Manual pick overrides whatever suggested it — clear categorySource/confidence so the
    // import doesn't log a stale AI/rule decision for a category the user chose themselves.
    setRows((prev) => prev.map((r) => r.id === editingRowId
      ? { ...r, suggestedCategoryId: categoryId, categorySource: null, confidence: null }
      : r));
    setEditingRowId(null);
  }, [editingRowId]);

  const handleImport = useCallback(async () => {
    if (!selectedWalletId) { Alert.alert('', S.selectWalletFirst); return; }
    const toImport = rows.filter((r) => r.selected);
    if (!toImport.length) return;
    setIsImporting(true);
    let imported = 0;
    const failures: string[] = [];
    // Continue past a failed row instead of aborting the whole import — a single insufficient-
    // balance or validation error on one row shouldn't silently drop the rest.
    for (const row of toImport) {
      try {
        await createTx.mutateAsync({
          walletId: selectedWalletId,
          categoryId: row.suggestedCategoryId,
          amount: row.amount,
          type: row.type,
          description: row.description,
          merchant: row.merchant,
          transactionDate: row.date,
          entryMethod: 'csv_import',
          aiSource: row.categorySource === 'ai' ? 'AI_BATCH' : row.categorySource === 'client_rule' ? 'RULE' : undefined,
          aiConfidence: row.categorySource === 'ai' ? (row.confidence ?? undefined) : undefined,
        });
        imported++;
      } catch (err) {
        failures.push(`${row.merchant}: ${getApiErrorMessage(err, S.importError)}`);
      }
    }
    setIsImporting(false);

    if (failures.length === 0) {
      Alert.alert('', S.successMsg(imported), [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }
    const summary = failures.slice(0, 5).join('\n') + (failures.length > 5 ? `\n… (+${failures.length - 5})` : '');
    Alert.alert(
      S.importPartialTitle,
      `${S.importPartialMsg(imported, toImport.length)}\n\n${summary}`,
      [{ text: 'OK', onPress: () => { if (imported > 0) router.back(); } }],
    );
  }, [selectedWalletId, rows, createTx, router]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const noneSelected = selectedCount === 0;
  const canStart = !!selectedWalletId && selectedCount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — back is disabled while extracting: leaving via the stack (unlike switching
          tabs) really does unmount this screen, silently dropping the in-flight result. */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerBtn}
          onPress={status === 'loading' ? undefined : () => router.back()}
          disabled={status === 'loading'}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialIcon name={S.back} size={20} color={status === 'loading' ? colors.onSurfaceVariant : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      {status === 'loading' ? (
        <View style={styles.centerState}>
          <View style={styles.loadingIconWrap}>
            <MaterialIcon name="auto_awesome" size={36} color={colors.primary} />
          </View>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: SPACING[4] }} />
          <Text style={styles.loadingTitle}>{S.loadingTitle}</Text>
          <Text style={styles.loadingSubtitle}>{S.loadingSubtitle}</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.centerState}>
          <MaterialIcon name="error_outline" size={40} color={colors.error} />
          <Text style={styles.errorTitle}>{S.errorTitle}</Text>
          <Text style={styles.loadingSubtitle}>{errorMsg}</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{S.goBack}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Step: Wallet */}
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

            {/* Step: Preview */}
            <View style={styles.section}>
              <View style={styles.stepTitleRow}>
                <Text style={styles.stepTitle}>{S.step3Title}</Text>
                <Text style={styles.selectedCount}>{selectedCount}/{rows.length} được chọn</Text>
              </View>
              <Text style={styles.stepHint}>{S.step3Hint}</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.selectAllRow} onPress={handleToggleAll}>
                <MaterialIcon
                  name={allSelected ? 'check_box' : noneSelected ? 'check_box_outline_blank' : 'indeterminate_check_box'}
                  size={20}
                  color={noneSelected ? colors.onSurfaceVariant : colors.primary}
                />
                <Text style={styles.selectAllText}>{allSelected ? S.deselectAll : S.selectAll}</Text>
              </TouchableOpacity>
              {rows.map((row) => (
                <PreviewRow key={row.id} row={row} onToggle={() => handleToggleRow(row.id)} onEditCategory={() => handleEditCategory(row.id)} />
              ))}
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom action */}
          <View style={styles.bottomBar}>
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
                ? <ActivityIndicator size="small" color={colors.onBackground} />
                : <Text style={styles.confirmText}>{S.confirmBtn(selectedCount)}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING[4],
      height: 56,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.primary },

    // Loading / error center state
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING[8], gap: SPACING[1] },
    loadingIconWrap: {
      width: 72, height: 72, borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.primary, 0.08),
      alignItems: 'center', justifyContent: 'center',
    },
    loadingTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, marginTop: SPACING[4], textAlign: 'center' },
    loadingSubtitle: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: SPACING[1] },
    errorTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, marginTop: SPACING[3], textAlign: 'center' },
    backBtn: {
      marginTop: SPACING[5], paddingHorizontal: SPACING[6], height: 48, borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.inversePrimary, alignItems: 'center', justifyContent: 'center',
    },
    backBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: colors.onBackground },

    scroll: { flex: 1 },
    content: { paddingHorizontal: SPACING[4], paddingTop: SPACING[4], gap: SPACING[4] },

    // Section
    section: { gap: SPACING[3] },
    stepTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stepHint: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginTop: -SPACING[2] },
    selectedCount: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
    emptyText: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
    selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], paddingVertical: SPACING[1] },
    selectAllText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },

    // Wallets
    walletList: { gap: SPACING[2] },
    walletCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[3],
      padding: SPACING[3],
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      minHeight: 56,
    },
    walletCardActive: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.08) },
    walletCardText: { flex: 1 },
    walletCardName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
    walletCardBalance: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },

    // Preview rows — labeled-field cards, matching photo-confirm's ReviewRow layout
    previewRow: {
      gap: SPACING[2],
      padding: SPACING[3],
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    previewRowDeselected: { opacity: 0.5 },
    previewRowDuplicate: { borderColor: withAlpha(colors.secondary, 0.31), backgroundColor: withAlpha(colors.secondary, 0.03) },
    dimText: { color: colors.onSurfaceVariant },

    rowTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING[2] },
    rowTopLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2], flex: 1, minWidth: 0 },
    rowMerchant: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface, lineHeight: 18 },
    dupBadge: { backgroundColor: withAlpha(colors.secondary, 0.13), paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: BORDER_RADIUS.full, flexShrink: 0 },
    dupBadgeText: { fontSize: 10, color: colors.secondary, fontWeight: FONT_WEIGHT.semibold },

    rowField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 },
    rowFieldLabel: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, flex: 1 },
    rowFieldValue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface, flex: 2, textAlign: 'right' },
    rowCategoryRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 2, justifyContent: 'flex-end' },
    catDot: { width: 8, height: 8, borderRadius: BORDER_RADIUS.full },
    uncategorizedText: { fontSize: FONT_SIZE.xs, color: colors.secondary, fontStyle: 'italic' },
    aiFailedText: { fontSize: FONT_SIZE.xs, color: colors.error, fontWeight: FONT_WEIGHT.semibold },

    // Bottom bar
    bottomBar: {
      flexDirection: 'row',
      gap: SPACING[3],
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[3],
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
      backgroundColor: colors.background,
    },
    cancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant },
    confirmBtn: {
      flex: 2,
      height: 52,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.inversePrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnDisabled: { opacity: 0.45 },
    confirmText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: colors.onBackground },
  });
}
