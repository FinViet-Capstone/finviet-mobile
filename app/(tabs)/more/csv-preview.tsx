import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { CATEGORIES } from '@/constants/categories';
import { useCreateTransaction, useWallets } from '@/hooks';
import { formatVND } from '@/utils/formatters';

interface ParsedRow {
  id: string;
  date: string;        // DD/MM/YYYY for display
  description: string;
  merchant: string | null;
  amount: number;
  type: 'expense' | 'income';
  aiCategoryId: string | null;
  aiConfidence: number;  // 0..1
  selected: boolean;
}

const MOCK_PARSED_ROWS: ParsedRow[] = [
  { id: 'r1', date: '01/05/2026', description: 'CHUYEN KHOAN LUONG T5', merchant: 'CTY ABC', amount: 12_000_000, type: 'income', aiCategoryId: 'cat_income', aiConfidence: 0.99, selected: true },
  { id: 'r2', date: '03/05/2026', description: 'COFFEE HIGHLANDS', merchant: 'Highlands Coffee', amount: 65_000, type: 'expense', aiCategoryId: 'cat_food', aiConfidence: 0.94, selected: true },
  { id: 'r3', date: '05/05/2026', description: 'GRAB FOOD GD0501', merchant: 'Grab Food', amount: 95_000, type: 'expense', aiCategoryId: 'cat_food', aiConfidence: 0.91, selected: true },
  { id: 'r4', date: '07/05/2026', description: 'DIEN NUOC THANG 4', merchant: 'EVN HCMC', amount: 350_000, type: 'expense', aiCategoryId: 'cat_bills', aiConfidence: 0.96, selected: true },
  { id: 'r5', date: '10/05/2026', description: 'PETROL', merchant: 'Petrolimex', amount: 100_000, type: 'expense', aiCategoryId: null, aiConfidence: 0.42, selected: true },
  { id: 'r6', date: '12/05/2026', description: 'SHOPEE PAY ORDER', merchant: 'Shopee', amount: 320_000, type: 'expense', aiCategoryId: 'cat_shopping', aiConfidence: 0.88, selected: true },
  { id: 'r7', date: '15/05/2026', description: 'NETFLIX MONTHLY', merchant: 'Netflix', amount: 149_000, type: 'expense', aiCategoryId: 'cat_entertain', aiConfidence: 0.99, selected: true },
  { id: 'r8', date: '18/05/2026', description: 'BACHHOAXANH SAIGON', merchant: 'Bách Hóa Xanh', amount: 185_000, type: 'expense', aiCategoryId: 'cat_food', aiConfidence: 0.78, selected: true },
];

const UNCERTAIN_THRESHOLD = 0.7;

/** Convert "DD/MM/YYYY" → "YYYY-MM-DD". */
function displayToIso(display: string): string {
  const [d, m, y] = display.split('/');
  return `${y}-${m}-${d}`;
}

export default function CSVPreviewScreen() {
  const router = useRouter();
  const { bank, fileName } = useLocalSearchParams<{
    bank?: string;
    fileName?: string;
  }>();
  const createMutation = useCreateTransaction();
  const { data: walletData } = useWallets();

  const [rows, setRows] = useState<ParsedRow[]>(MOCK_PARSED_ROWS);
  const [pickerForId, setPickerForId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = rows.filter((r) => r.selected).length;
  const totalAmount = rows
    .filter((r) => r.selected && r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0);

  const toggleRow = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)),
    );
  };

  const setRowCategory = (id: string, categoryId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, aiCategoryId: categoryId, aiConfidence: 1 }
          : r,
      ),
    );
    setPickerForId(null);
  };

  const handleConfirm = async () => {
    if (selectedCount === 0) {
      Alert.alert('Chưa chọn giao dịch', 'Vui lòng chọn ít nhất một giao dịch.');
      return;
    }
    const wallets = walletData?.wallets ?? [];
    const targetWallet = wallets.find((w) => w.isPrimary) ?? wallets[0];
    if (!targetWallet) {
      Alert.alert('Chưa có ví', 'Hãy tạo ít nhất một ví trước khi nhập CSV.');
      return;
    }
    setSubmitting(true);
    try {
      const selected = rows.filter((r) => r.selected);
      // Sequential to avoid race conditions on the in-memory store; fast enough for the row counts we expect.
      let inserted = 0;
      for (const r of selected) {
        await createMutation.mutateAsync({
          walletId: targetWallet.id,
          categoryId: r.aiCategoryId,
          amount: r.amount,
          type: r.type,
          description: r.description,
          merchant: r.merchant,
          transactionDate: displayToIso(r.date),
          aiSuggestedCategoryId: r.aiCategoryId,
          aiOverridden: r.aiConfidence === 1,
          entryMethod: 'csv_import',
        });
        inserted += 1;
      }
      Alert.alert(
        'Nhập thành công',
        `${inserted} giao dịch đã được thêm vào ví "${targetWallet.name}".`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/more') }],
      );
    } catch {
      Alert.alert('Lỗi', 'Không nhập được tất cả giao dịch. Hãy thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Xem trước CSV</Text>
          <Text style={styles.headerSubtitle}>
            {fileName ?? 'transactions.csv'} · {bank?.toUpperCase() ?? 'BANK'}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* Summary bar */}
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Đã chọn</Text>
          <Text style={styles.summaryValue}>
            {selectedCount}/{rows.length}
          </Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Tổng chi</Text>
          <Text style={styles.summaryValue}>{formatVND(totalAmount)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((r) => {
          const cat = r.aiCategoryId
            ? CATEGORIES.find((c) => c.id === r.aiCategoryId)
            : null;
          const isUncertain =
            r.aiCategoryId === null || r.aiConfidence < UNCERTAIN_THRESHOLD;
          return (
            <View key={r.id} style={styles.row}>
              <TouchableOpacity
                style={[styles.checkbox, r.selected && styles.checkboxOn]}
                onPress={() => toggleRow(r.id)}
                activeOpacity={0.75}
              >
                {r.selected ? (
                  <Text style={styles.checkboxMark}>✓</Text>
                ) : null}
              </TouchableOpacity>

              <View style={styles.rowMain}>
                <Text style={styles.rowDate}>{r.date}</Text>
                <Text style={styles.rowDesc} numberOfLines={1}>
                  {r.description}
                </Text>
                {r.merchant ? (
                  <Text style={styles.rowMerchant}>{r.merchant}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    isUncertain && styles.categoryChipUncertain,
                  ]}
                  onPress={() => setPickerForId(r.id)}
                  activeOpacity={0.75}
                >
                  {cat ? (
                    <View style={styles.chipInner}>
                      <View
                        style={[styles.chipDot, { backgroundColor: cat.color }]}
                      />
                      <Text style={styles.chipText}>{cat.nameVi}</Text>
                    </View>
                  ) : (
                    <Text style={styles.chipUncertainText}>? Chưa phân loại</Text>
                  )}
                  {isUncertain ? (
                    <Text style={styles.chipBadge}>?</Text>
                  ) : null}
                </TouchableOpacity>
              </View>

              <View style={styles.rowRight}>
                <Text
                  style={[
                    styles.rowAmount,
                    {
                      color:
                        r.type === 'income' ? COLORS.success : COLORS.danger,
                    },
                  ]}
                >
                  {r.type === 'income' ? '+' : '−'}
                  {formatVND(r.amount)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={`Nhập ${selectedCount} giao dịch`}
          onPress={handleConfirm}
          loading={submitting}
          disabled={selectedCount === 0}
        />
      </View>

      {/* Category picker modal */}
      <Modal
        visible={pickerForId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerForId(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerForId(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sửa danh mục</Text>
            <FlatList
              data={[...CATEGORIES]}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => {
                    if (pickerForId) setRowCategory(pickerForId, item.id);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dotMd, { backgroundColor: item.color }]} />
                  <Text style={styles.listRowText}>{item.nameVi}</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { padding: SPACING[3], paddingBottom: SPACING[6] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  headerSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },

  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.brand[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.brand[100],
  },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.brand[600] },
  summaryValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[700],
    marginTop: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    gap: SPACING[3],
    ...SHADOW.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: COLORS.brand[500], borderColor: COLORS.brand[500] },
  checkboxMark: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },

  rowMain: { flex: 1, gap: 2 },
  rowDate: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },
  rowDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[800],
    fontWeight: FONT_WEIGHT.medium,
  },
  rowMerchant: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },

  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[50],
    marginTop: SPACING[1],
    gap: SPACING[1],
  },
  categoryChipUncertain: {
    borderColor: COLORS.calendar.uncategorized,
    backgroundColor: '#FFF7ED',
  },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: FONT_SIZE.xs, color: COLORS.gray[700], fontWeight: FONT_WEIGHT.medium },
  chipUncertainText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.calendar.uncategorized,
    fontWeight: FONT_WEIGHT.semibold,
  },
  chipBadge: {
    marginLeft: 4,
    fontSize: FONT_SIZE.xs,
    color: COLORS.calendar.uncategorized,
    fontWeight: FONT_WEIGHT.bold,
  },

  rowRight: { alignItems: 'flex-end', minWidth: 100 },
  rowAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },

  footer: {
    padding: SPACING[4],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[5],
    maxHeight: '72%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[300],
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[3],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING[3],
  },
  dotMd: { width: 14, height: 14, borderRadius: 7 },
  listRowText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[800] },
});
