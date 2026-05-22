import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { useBudgets } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EXPENSE_CATEGORIES, getCategoryById } from '@/constants/categories';
import { formatVND } from '@/utils/formatters';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreateBudgetScreen() {
  const router = useRouter();
  const { data: budgets, isLoading } = useBudgets();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isLoading || !budgets) return <LoadingSpinner />;

  const usedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = EXPENSE_CATEGORIES.filter(
    (c) => !usedCategoryIds.has(c.id),
  );
  const selectedCategory = categoryId ? getCategoryById(categoryId) : null;

  const limitNum = parseInt(limit, 10) || 0;
  const warningAt80 = Math.round(limitNum * 0.8);

  const canSubmit =
    categoryId !== null && limitNum > 0 && availableCategories.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePickCategory = (id: string) => {
    setCategoryId(id);
    setShowCategoryPicker(false);
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedCategory) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Đã tạo ngân sách',
        `Ngân sách ${formatVND(limitNum)} cho "${selectedCategory.nameVi}" đã được áp dụng cho tháng này.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }, 500);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ngân sách mới</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {availableCategories.length === 0 ? (
            <View style={styles.fullCard}>
              <Text style={styles.fullEmoji}>🎉</Text>
              <Text style={styles.fullTitle}>Đã đặt ngân sách cho mọi danh mục</Text>
              <Text style={styles.fullBody}>
                Bạn đã có ngân sách cho tất cả các danh mục chi tiêu. Hãy quay lại
                để chỉnh sửa các ngân sách hiện có.
              </Text>
              <Button
                title="Quay lại"
                variant="secondary"
                onPress={() => router.back()}
              />
            </View>
          ) : (
            <>
              {/* Category picker */}
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Danh mục</Text>
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => setShowCategoryPicker(true)}
                  activeOpacity={0.75}
                >
                  {selectedCategory ? (
                    <>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: selectedCategory.color },
                        ]}
                      />
                      <Text style={styles.pickerValue}>
                        {selectedCategory.nameVi}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.pickerValue, styles.pickerPlaceholder]}>
                      Chọn danh mục cần đặt ngân sách
                    </Text>
                  )}
                  <Text style={styles.pickerChevron}>›</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  Chỉ hiển thị các danh mục chưa có ngân sách.
                </Text>
              </View>

              {/* Limit */}
              <View style={styles.card}>
                <TextInput
                  label="Hạn mức tháng (VND)"
                  value={limit}
                  onChangeText={(t) => setLimit(t.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  placeholder="0"
                  containerStyle={styles.field}
                />
                {limitNum > 0 ? (
                  <Text style={styles.preview}>{formatVND(limitNum)}</Text>
                ) : null}
              </View>

              {/* Threshold preview */}
              {limitNum > 0 ? (
                <View style={styles.thresholdCard}>
                  <Text style={styles.thresholdTitle}>
                    Cảnh báo khi chi đến
                  </Text>
                  <Text style={styles.thresholdAmount}>
                    {formatVND(warningAt80)}
                  </Text>
                  <Text style={styles.thresholdSub}>
                    (80% hạn mức) — bạn sẽ nhận thông báo đẩy
                  </Text>

                  <View style={styles.thresholdRow}>
                    <View style={[styles.tier, styles.tierGreen]}>
                      <Text style={styles.tierLabel}>An toàn</Text>
                      <Text style={styles.tierRange}>{'<60%'}</Text>
                    </View>
                    <View style={[styles.tier, styles.tierAmber]}>
                      <Text style={styles.tierLabel}>Cảnh báo</Text>
                      <Text style={styles.tierRange}>60–80%</Text>
                    </View>
                    <View style={[styles.tier, styles.tierRed]}>
                      <Text style={styles.tierLabel}>Vượt</Text>
                      <Text style={styles.tierRange}>{'>80%'}</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <Button
                title="Tạo ngân sách"
                onPress={handleSubmit}
                loading={loading}
                disabled={!canSubmit}
                style={styles.submit}
              />

              {!canSubmit ? (
                <Text style={styles.disabledHint}>
                  Hãy chọn danh mục và nhập hạn mức để tiếp tục.
                </Text>
              ) : null}

              <Text style={styles.note}>
                Ngân sách được đặt lại vào ngày 1 hàng tháng. Tạo giữa tháng vẫn
                áp dụng đầy đủ hạn mức cho tháng này (không chia tỉ lệ).
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn danh mục</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.modalRow}
                  onPress={() => handlePickCategory(cat.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[styles.colorDot, { backgroundColor: cat.color }]}
                  />
                  <Text style={styles.modalRowLabel}>{cat.nameVi}</Text>
                  {cat.id === categoryId ? (
                    <Text style={styles.modalCheck}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  kav: { flex: 1 },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  field: { marginBottom: 0 },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    minHeight: 48,
    gap: SPACING[3],
  },
  pickerValue: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[900] },
  pickerPlaceholder: { color: COLORS.gray[400] },
  pickerChevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  helperText: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 16,
  },

  preview: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  // Threshold preview card
  thresholdCard: {
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    alignItems: 'center',
    ...SHADOW.md,
  },
  thresholdTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
  },
  thresholdAmount: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginTop: SPACING[1],
  },
  thresholdSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand[100],
    marginTop: 2,
    marginBottom: SPACING[4],
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    alignSelf: 'stretch',
  },
  tier: {
    flex: 1,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  tierGreen: { backgroundColor: COLORS.budget.safe },
  tierAmber: { backgroundColor: COLORS.budget.warning },
  tierRed: { backgroundColor: COLORS.budget.danger },
  tierLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
  tierRange: {
    fontSize: 10,
    color: COLORS.white,
    marginTop: 2,
  },

  submit: { marginTop: SPACING[2] },
  disabledHint: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  note: {
    marginTop: SPACING[5],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    paddingHorizontal: SPACING[2],
  },

  // Empty / "all categories used" state
  fullCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOW.sm,
  },
  fullEmoji: { fontSize: 48, marginBottom: SPACING[3] },
  fullTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  fullBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING[5],
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[6],
    maxHeight: '70%',
    ...SHADOW.lg,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray[300],
    marginBottom: SPACING[3],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  modalClose: { fontSize: FONT_SIZE.xl, color: COLORS.gray[500] },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    gap: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalRowLabel: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[800],
  },
  modalCheck: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.bold,
  },
});
