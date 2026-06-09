/**
 * ManualEntryScreen — app/(tabs)/entry/manual.tsx
 *
 * Fields: Amount · Type toggle · Category · Wallet · Date · Payee · Note
 * Accepts optional `date` query-param ("YYYY-MM-DD") from Calendar double-tap.
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
import { TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import type { Category } from '@/constants/categories';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWallets, useCreateTransaction } from '@/hooks';
import type { Wallet } from '@/types/wallet';
import { formatVND } from '@/utils/formatters';
import { todayISO } from '@/utils/date';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType = 'expense' | 'income';

// ─── Validation ───────────────────────────────────────────────────────────────

const entrySchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền' })
    .positive('Số tiền phải lớn hơn 0'),
});

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  titleAdd: 'Thêm Giao Dịch',
  cancel: 'Hủy',
  save: 'Lưu',
  expense: 'Chi tiêu',
  income: 'Thu nhập',
  fieldWallet: 'Ví',
  fieldCategory: 'Danh mục',
  fieldDate: 'Ngày',
  fieldPayee: 'Tên thụ hưởng',
  fieldNote: 'Ghi chú',
  payeePlaceholder: 'Không bắt buộc',
  notePlaceholder: 'Không bắt buộc',
  pickCategory: 'Chọn danh mục',
  pickWallet: 'Chọn ví',
  sheetCategory: 'Chọn danh mục',
  sheetWallet: 'Chọn ví',
  saveSuccess: 'Giao dịch đã được lưu!',
  saveError: 'Không thể lưu. Hãy thử lại.',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ManualEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { data: walletData, isLoading } = useWallets();
  const createMutation = useCreateTransaction();

  const initialISO = dateParam ?? todayISO();

  // Form state
  const [amountRaw, setAmountRaw] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState(initialISO);
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();

  // Pre-select primary wallet
  useEffect(() => {
    if (walletData?.wallets && selectedWalletId === null) {
      const primary = walletData.wallets.find((w) => w.isPrimary) ?? walletData.wallets[0];
      setSelectedWalletId(primary?.id ?? null);
    }
  }, [walletData, selectedWalletId]);

  if (isLoading || !walletData) return <LoadingSpinner />;

  const wallets: Wallet[] = walletData.wallets;
  const effectiveWalletId = selectedWalletId ?? wallets[0]?.id;
  const selectedCategory = selectedCategoryId
    ? CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null
    : null;
  const selectedWallet = wallets.find((w) => w.id === effectiveWalletId) ?? wallets[0];

  const amountNum = parseInt(amountRaw.replace(/\D/g, '') || '0', 10);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAmountKey = (key: string) => {
    if (key === 'del') {
      setAmountRaw((prev) => prev.slice(0, -1));
    } else if (key === '000') {
      setAmountRaw((prev) => (prev === '0' ? prev : prev + '000'));
    } else {
      setAmountRaw((prev) => {
        if (prev === '0' && key !== '.') return key;
        return prev + key;
      });
    }
    if (amountError) setAmountError(undefined);
  };

  const handleSubmit = () => {
    const result = entrySchema.safeParse({ amount: amountNum });
    if (!result.success) {
      setAmountError(result.error.flatten().fieldErrors.amount?.[0]);
      return;
    }

    createMutation.mutate(
      {
        walletId: effectiveWalletId,
        categoryId: selectedCategoryId,
        amount: amountNum,
        type: entryType,
        description: note.trim() || null,
        merchant: payee.trim() || null,
        transactionDate: dateIso,
        aiSuggestedCategoryId: null,
        aiOverridden: false,
        entryMethod: 'manual',
      },
      {
        onSuccess: () =>
          Alert.alert('', S.saveSuccess, [{ text: 'OK', onPress: () => router.back() }]),
        onError: () => Alert.alert('', S.saveError),
      },
    );
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const formatDateDisplay = (iso: string) => {
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const isExpense = entryType === 'expense';
  const amountColor = isExpense ? COLORS.error : COLORS.tertiary;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.topBarBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.topBarCancel}>{S.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{S.titleAdd}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.topBarBtn}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          <Text style={[styles.topBarSave, createMutation.isPending && styles.disabled]}>
            {S.save}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type toggle */}
      <View style={styles.typeToggleWrap}>
        <View style={styles.typeToggle}>
          {(['expense', 'income'] as EntryType[]).map((t) => (
            <TouchableOpacity
              key={t}
              activeOpacity={0.7}
              style={[
                styles.typeOption,
                entryType === t && (t === 'expense' ? styles.typeExpenseActive : styles.typeIncomeActive),
              ]}
              onPress={() => setEntryType(t)}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  entryType === t && styles.typeOptionTextActive,
                  entryType === t && t === 'expense' && { color: COLORS.error },
                  entryType === t && t === 'income' && { color: COLORS.tertiary },
                ]}
              >
                {t === 'expense' ? S.expense : S.income}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount display */}
      <View style={styles.amountSection}>
        <Text style={[styles.amountDisplay, { color: amountColor }]}>
          {amountNum > 0 ? formatVND(amountNum) : '0 đ'}
        </Text>
        {amountError ? (
          <Text style={styles.amountError}>{amountError}</Text>
        ) : null}
      </View>

      {/* Form fields */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.fieldsScroll}
          contentContainerStyle={styles.fieldsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wallet */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.fieldRow}
            onPress={() => setShowWalletModal(true)}
          >
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.primary}20` }]}>
              <MaterialIcon name="account_balance_wallet" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldWallet}</Text>
              <Text style={styles.fieldValue}>
                {selectedWallet?.name ?? S.pickWallet}
              </Text>
            </View>
            <MaterialIcon name="chevron_right" size={20} color={COLORS.outlineVariant} />
          </TouchableOpacity>

          {/* Category */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.fieldRow}
            onPress={() => setShowCategoryModal(true)}
          >
            <View
              style={[
                styles.fieldIconWrap,
                { backgroundColor: selectedCategory ? `${selectedCategory.color}25` : `${COLORS.secondary}20` },
              ]}
            >
              <MaterialIcon
                name="category"
                size={20}
                color={selectedCategory?.color ?? COLORS.secondary}
              />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldCategory}</Text>
              <Text style={[styles.fieldValue, !selectedCategory && styles.fieldPlaceholder]}>
                {selectedCategory?.nameVi ?? S.pickCategory}
              </Text>
            </View>
            <MaterialIcon name="chevron_right" size={20} color={COLORS.outlineVariant} />
          </TouchableOpacity>

          {/* Date */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.primary}15` }]}>
              <MaterialIcon name="calendar_today" size={20} color={COLORS.onSurfaceVariant} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldDate}</Text>
              <Text style={styles.fieldValue}>{formatDateDisplay(dateIso)}</Text>
            </View>
          </View>

          {/* Payee */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.outline}20` }]}>
              <MaterialIcon name="person" size={20} color={COLORS.outline} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldPayee}</Text>
              <RNTextInput
                value={payee}
                onChangeText={setPayee}
                placeholder={S.payeePlaceholder}
                placeholderTextColor={COLORS.outlineVariant}
                style={styles.inlineInput}
              />
            </View>
          </View>

          {/* Note */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.outline}20` }]}>
              <MaterialIcon name="notes" size={20} color={COLORS.outline} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldNote}</Text>
              <RNTextInput
                value={note}
                onChangeText={setNote}
                placeholder={S.notePlaceholder}
                placeholderTextColor={COLORS.outlineVariant}
                style={styles.inlineInput}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom numpad */}
      <View style={styles.numpad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['000', '0', 'del'],
        ].map((row, ri) => (
          <View key={ri} style={styles.numpadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.6}
                style={styles.numpadKey}
                onPress={() => handleAmountKey(key)}
              >
                {key === 'del' ? (
                  <MaterialIcon name="backspace" size={20} color={COLORS.onSurfaceVariant} />
                ) : (
                  <Text style={styles.numpadKeyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* ── Category Modal ── */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{S.sheetCategory}</Text>
            <FlatList
              data={[...CATEGORIES]}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetRow,
                    selectedCategoryId === item.id && styles.sheetRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(item.id);
                    setShowCategoryModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sheetDot, { backgroundColor: item.color }]} />
                  <Text style={styles.sheetRowText}>{item.nameVi}</Text>
                  {selectedCategoryId === item.id && (
                    <MaterialIcon name="check" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Wallet Modal ── */}
      <Modal
        visible={showWalletModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowWalletModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{S.sheetWallet}</Text>
            <FlatList
              data={wallets}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sheetRow,
                    selectedWalletId === item.id && styles.sheetRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedWalletId(item.id);
                    setShowWalletModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcon
                    name="account_balance_wallet"
                    size={18}
                    color={COLORS.onSurfaceVariant}
                  />
                  <Text style={styles.sheetRowText}>{item.name}</Text>
                  {selectedWalletId === item.id && (
                    <MaterialIcon name="check" size={18} color={COLORS.primary} />
                  )}
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
  container: { flex: 1, backgroundColor: COLORS.background },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  topBarBtn: { minWidth: 56, alignItems: 'center' },
  topBarTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  topBarCancel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
  topBarSave: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  disabled: { opacity: 0.5 },

  // Type toggle
  typeToggleWrap: { paddingHorizontal: SPACING[4], paddingTop: SPACING[3] },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  typeExpenseActive: {
    backgroundColor: `${COLORS.error}20`,
  },
  typeIncomeActive: {
    backgroundColor: `${COLORS.tertiary}20`,
  },
  typeOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
  },
  typeOptionTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Amount
  amountSection: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  amountDisplay: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -1,
  },
  amountError: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.error,
    marginTop: SPACING[1],
  },

  // Fields scroll
  fieldsScroll: { flex: 1 },
  fieldsContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
    gap: SPACING[2],
  },

  // Field row
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[3],
    minHeight: 64,
  },
  fieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldTextWrap: { flex: 1 },
  fieldLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    fontWeight: FONT_WEIGHT.medium,
  },
  fieldPlaceholder: {
    color: COLORS.outlineVariant,
    fontWeight: FONT_WEIGHT.normal,
  },
  inlineInput: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    padding: 0,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Numpad
  numpad: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING[2],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  numpadRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  numpadKey: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeyText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[4],
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[3],
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    gap: SPACING[3],
  },
  sheetRowSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
    marginVertical: SPACING[1],
  },
  sheetDot: {
    width: 14,
    height: 14,
    borderRadius: BORDER_RADIUS.full,
    flexShrink: 0,
  },
  sheetRowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
  },
});
