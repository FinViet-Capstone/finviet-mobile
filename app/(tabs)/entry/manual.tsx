/**
 * ManualEntryScreen — app/(tabs)/entry/manual.tsx
 *
 * Fields: Amount · Description (+ AI suggestion) · Category · Wallet · Date · Type
 * Accepts optional `date` query-param ("YYYY-MM-DD") from Calendar double-tap flow.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SHADOW,
  SPACING,
} from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import type { Category } from '@/constants/categories';
import { TextInput } from '@/components/common/TextInput';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWallets, useCreateTransaction } from '@/hooks';
import type { Wallet } from '@/types/wallet';
import { formatVND } from '@/utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType = 'expense' | 'income';

type FormErrors = {
  amount?: string;
  description?: string;
};

// ─── Validation schema ────────────────────────────────────────────────────────

const entrySchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền' })
    .positive('Số tiền phải lớn hơn 0'),
  description: z.string().min(1, 'Vui lòng nhập mô tả'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD". */
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Converts "YYYY-MM-DD" → "DD/MM/YYYY" for display. */
function isoToDisplay(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Converts "DD/MM/YYYY" → "YYYY-MM-DD". */
function displayToIso(display: string): string {
  const parts = display.split('/');
  if (parts.length !== 3) return todayISO();
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ManualEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { data: walletData, isLoading } = useWallets();
  const createMutation = useCreateTransaction();

  const initialISO = dateParam ?? todayISO();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [dateDisplay] = useState<string>(isoToDisplay(initialISO));
  const [entryType, setEntryType] = useState<EntryType>('expense');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  if (isLoading || !walletData) return <LoadingSpinner />;

  const wallets: Wallet[] = walletData.wallets;
  const primaryWalletId =
    wallets.find((w) => w.isPrimary)?.id ?? wallets[0].id;
  const effectiveWalletId = selectedWalletId ?? primaryWalletId;

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedCategory: Category | null = selectedCategoryId
    ? (CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null)
    : null;

  const selectedWallet: Wallet =
    wallets.find((w) => w.id === effectiveWalletId) ?? wallets[0];

  // ── AI suggestion debounce (600 ms) ─────────────────────────────────────────
  useEffect(() => {
    const trimmed = description.trim().toLowerCase();
    if (trimmed.length < 2) {
      setAiSuggestion(null);
      return;
    }
    const timer = setTimeout(() => {
      const match = [...CATEGORIES].find(
        (c) =>
          c.nameVi.toLowerCase().includes(trimmed) ||
          trimmed.includes(c.nameVi.toLowerCase()),
      );
      setAiSuggestion(match ?? null);
    }, 600);
    return () => clearTimeout(timer);
  }, [description]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAmountChange = (text: string) => {
    setAmountRaw(text.replace(/\D/g, ''));
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
  };

  const handleAcceptSuggestion = () => {
    if (!aiSuggestion) return;
    setSelectedCategoryId(aiSuggestion.id);
    setAiSuggestion(null);
  };

  const handleDismissSuggestion = () => setAiSuggestion(null);

  const handleDatePress = () => {
    Alert.alert('Chọn ngày', 'Tính năng chọn ngày sẽ sớm ra mắt.');
  };

  const handleSubmit = () => {
    const digits = amountRaw.replace(/\D/g, '');
    const amountNum = digits ? parseInt(digits, 10) : 0;

    const result = entrySchema.safeParse({
      amount: amountNum,
      description: description.trim(),
    });

    if (!result.success) {
      const fe = result.error.flatten().fieldErrors;
      setErrors({
        amount: fe.amount?.[0],
        description: fe.description?.[0],
      });
      return;
    }

    setErrors({});
    createMutation.mutate(
      {
        walletId: effectiveWalletId,
        categoryId: selectedCategoryId,
        amount: amountNum,
        type: entryType,
        description: description.trim(),
        merchant: null,
        transactionDate: displayToIso(dateDisplay),
        aiSuggestedCategoryId: aiSuggestion?.id ?? null,
        aiOverridden:
          selectedCategoryId !== null &&
          aiSuggestion !== null &&
          selectedCategoryId !== aiSuggestion.id,
        entryMethod: 'manual',
      },
      {
        onSuccess: () =>
          Alert.alert('Đã lưu!', 'Giao dịch đã được ghi lại thành công.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () =>
          Alert.alert('Không lưu được', 'Hãy thử lại sau.'),
      },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{'Nhập Tay'}</Text>
          {/* Mirror of backBtn to keep title centered */}
          <View style={styles.backBtn} />
        </View>

        {/* ── Scrollable form ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─ Amount ─ */}
          <View style={styles.card}>
            <TextInput
              label="Số tiền"
              value={amountRaw}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              autoFocus={true}
              placeholder="0"
              error={errors.amount}
              containerStyle={styles.amountInputContainer}
            />
            <Text style={styles.amountPreview}>{formatVND(parseInt(amountRaw, 10) || 0)}</Text>
          </View>

          {/* ─ Description ─ */}
          <View style={styles.card}>
            <TextInput
              label="Mô tả"
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Ăn trưa, xăng xe, mua sắm ..."
              error={errors.description}
              returnKeyType="next"
            />

            {/* AI suggestion chip */}
            {aiSuggestion !== null ? (
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionLabel}>{'Gợi ý AI:'}</Text>
                <TouchableOpacity
                  style={[styles.suggestionChip, { borderColor: aiSuggestion.color }]}
                  onPress={handleAcceptSuggestion}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dot, { backgroundColor: aiSuggestion.color }]} />
                  <Text style={[styles.chipText, { color: aiSuggestion.color }]}>
                    {aiSuggestion.nameVi}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={handleDismissSuggestion}
                >
                  <Text style={styles.dismissIcon}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* ─ Category ─ */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{'Danh mục'}</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.75}
            >
              {selectedCategory !== null ? (
                <View style={styles.selectRowLeft}>
                  <View style={[styles.dot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={styles.selectValue}>{selectedCategory.nameVi}</Text>
                </View>
              ) : (
                <Text style={styles.selectPlaceholder}>{'Chọn danh mục'}</Text>
              )}
              <Text style={styles.chevron}>{'›'}</Text>
            </TouchableOpacity>
          </View>

          {/* ─ Wallet ─ */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{'Ví'}</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowWalletModal(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.selectValue}>{selectedWallet.name}</Text>
              <Text style={styles.chevron}>{'›'}</Text>
            </TouchableOpacity>
          </View>

          {/* ─ Date ─ */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{'Ngày'}</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={handleDatePress}
              activeOpacity={0.75}
            >
              <Text style={styles.selectValue}>{dateDisplay}</Text>
              <Text style={styles.chevron}>{'›'}</Text>
            </TouchableOpacity>
          </View>

          {/* ─ Type toggle ─ */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{'Loại giao dịch'}</Text>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  entryType === 'expense' && styles.typeOptionExpenseActive,
                ]}
                onPress={() => setEntryType('expense')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    entryType === 'expense' && styles.typeOptionTextActive,
                  ]}
                >
                  {'Chi tiêu'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  entryType === 'income' && styles.typeOptionIncomeActive,
                ]}
                onPress={() => setEntryType('income')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    entryType === 'income' && styles.typeOptionTextActive,
                  ]}
                >
                  {'Thu nhập'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─ Submit ─ */}
          <Button
            title="Lưu giao dịch"
            onPress={handleSubmit}
            loading={createMutation.isPending}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ════ Category modal ════ */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        {/* Outer tap area closes the sheet */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          {/* Inner touch absorbs taps so the sheet doesn't close itself */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { /* absorb */ }}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{'Chọn danh mục'}</Text>
            <FlatList
              data={[...CATEGORIES]}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listRow,
                    selectedCategoryId === item.id && styles.listRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(item.id);
                    setShowCategoryModal(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dotMd, { backgroundColor: item.color }]} />
                  <Text style={styles.listRowText}>{item.nameVi}</Text>
                  {selectedCategoryId === item.id ? (
                    <Text style={styles.checkmark}>{'✓'}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ════ Wallet modal ════ */}
      <Modal
        visible={showWalletModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWalletModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowWalletModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { /* absorb */ }}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{'Chọn ví'}</Text>
            <FlatList
              data={wallets}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listRow,
                    selectedWalletId === item.id && styles.listRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedWalletId(item.id);
                    setShowWalletModal(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.walletEmoji}>
                    {item.type === 'cash'
                      ? '💵'
                      : item.type === 'momo'
                      ? '📱'
                      : '🏦'}
                  </Text>
                  <Text style={styles.listRowText}>{item.name}</Text>
                  {selectedWalletId === item.id ? (
                    <Text style={styles.checkmark}>{'✓'}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Root
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  kav: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    lineHeight: 32,
    color: COLORS.gray[700],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[5],
    paddingBottom: SPACING[12],
  },

  // Card wrapper for each field group
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },

  // Amount
  amountInputContainer: {
    marginBottom: SPACING[2],
  },
  amountPreview: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  // Field label (for non-TextInput fields)
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Select row (Category / Wallet / Date)
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  selectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectValue: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[400],
    flex: 1,
  },
  chevron: {
    fontSize: FONT_SIZE['2xl'],
    color: COLORS.gray[400],
    lineHeight: 28,
    marginLeft: SPACING[2],
  },

  // AI suggestion
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[3],
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  suggestionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[400],
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    gap: SPACING[1],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  dismissBtn: {
    padding: SPACING[1],
  },
  dismissIcon: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
  },

  // Type toggle (segmented control)
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[1],
  },
  typeOption: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  typeOptionExpenseActive: {
    backgroundColor: COLORS.danger,
    ...SHADOW.sm,
  },
  typeOptionIncomeActive: {
    backgroundColor: COLORS.brand[500],
    ...SHADOW.sm,
  },
  typeOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
  },
  typeOptionTextActive: {
    color: COLORS.white,
  },

  // Submit
  submitBtn: {
    marginTop: SPACING[2],
  },

  // Modal overlay
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

  // List rows inside modals
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  listRowSelected: {
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
    marginVertical: SPACING[1],
  },
  listRowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[800],
    marginLeft: SPACING[3],
  },
  checkmark: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  dotMd: {
    width: 14,
    height: 14,
    borderRadius: BORDER_RADIUS.full,
  },
  walletEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
});
