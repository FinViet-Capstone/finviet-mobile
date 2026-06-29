import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import {
  useTransactionById,
  useWallets,
  useUpdateTransaction,
  useDeleteTransaction,
  useCreateRule,
} from '@/hooks';
import { CATEGORIES } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { formatVND } from '@/utils/formatters';
import { TX_DETAIL_STRINGS as S } from '@/data/transactionDetailData';

// ───────────────────────────────────────────────────────────────────────────
// Route: /transactions/[id]?mode=full|category
//   mode=full     → basic wallet, all fields editable
//   mode=category → linked wallet, category only (per SePay edit rule)
// ───────────────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();

  if (!id) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} title={S.titleNotFound} />
        <EmptyState icon="error" title={S.missingIdTitle} subtitle={S.missingIdSubtitle} />
      </SafeAreaView>
    );
  }

  return <DetailBody txId={id} modeParam={mode} />;
}

function DetailBody({ txId, modeParam }: { txId: string; modeParam?: string }) {
  const router = useRouter();
  const { data: tx, isLoading, isError } = useTransactionById(txId);
  const { data: walletData } = useWallets();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const createRuleMutation = useCreateRule();

  const [amountRaw, setAmountRaw] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();
  const [amountFocused, setAmountFocused] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setAmountRaw(String(tx.amount));
    setDescription(tx.description ?? '');
    setMerchant(tx.merchant ?? '');
    setCategoryId(tx.categoryId);
    setWalletId(tx.walletId);
    setDateIso(tx.transactionDate);
  }, [tx]);

  // Hooks MUST run before the early returns below (rules of hooks) — these
  // useCallbacks previously sat after the loading/error guards and crashed
  // ("rendered more hooks than during the previous render") once tx loaded.
  const handleAmountNumberPress = useCallback((key: string) => {
    setAmountRaw((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
    if (amountError) setAmountError(undefined);
  }, [amountError]);

  const handleAmountBackspace = useCallback(() => setAmountRaw((prev) => prev.slice(0, -1)), []);
  const handleAmountClear = useCallback(() => setAmountRaw(''), []);

  if (isLoading) return <LoadingSpinner />;

  if (isError || !tx) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} title={S.titleNotFound} />
        <EmptyState
          icon="receipt_long"
          title={isError ? S.loadErrorTitle : S.notFoundTitle}
          subtitle={isError ? S.loadErrorSubtitle : S.notFoundSubtitle}
        />
      </SafeAreaView>
    );
  }

  const wallets = walletData?.wallets ?? [];
  const selectedCategory = categoryId ? CATEGORIES.find((c) => c.id === categoryId) ?? null : null;
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? null;

  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
  const categoryOnly = modeParam === 'category' || selectedWallet?.type === 'linked';
  const fieldsLocked = isTransfer || categoryOnly;

  const amountNum = parseInt(amountRaw, 10) || 0;
  const isIncome = tx.type === 'income';

  const offerRuleThenLeave = (merchantName: string, catId: string) => {
    const catName = CATEGORIES.find((c) => c.id === catId)?.nameVi ?? S.categoryLabel;
    Alert.alert(S.ruleTitle, S.ruleMessage(merchantName, catName), [
      { text: S.ruleSkip, style: 'cancel', onPress: () => router.back() },
      {
        text: S.ruleConfirm,
        onPress: () =>
          createRuleMutation.mutate(
            { merchantKeyword: merchantName, categoryId: catId },
            {
              onSuccess: (res) =>
                Alert.alert(S.ruleAppliedTitle, S.ruleAppliedMessage(res.appliedCount), [
                  { text: S.ok, onPress: () => router.back() },
                ]),
              onError: () => router.back(),
            },
          ),
      },
    ]);
  };

  const handleSave = () => {
    setAmountError(undefined);
    const amount = parseInt(amountRaw, 10) || 0;
    const originalCategoryId = tx.categoryId;

    if (!categoryOnly && !isTransfer) {
      if (amount <= 0) { setAmountError(S.amountPositiveError); return; }
      if (!walletId) { Alert.alert(S.noWalletTitle, S.noWalletMsg); return; }
    }

    const patch = categoryOnly
      ? { categoryId }
      : {
          amount,
          description: description.trim() || null,
          merchant: isTransfer ? null : merchant.trim() || null,
          categoryId: isTransfer ? null : categoryId,
          walletId: isTransfer ? undefined : walletId ?? undefined,
          transactionDate: dateIso,
        };

    updateMutation.mutate(
      { id: txId, patch },
      {
        onSuccess: () => {
          const categoryChanged = !isTransfer && categoryId !== null && categoryId !== originalCategoryId;
          const merchantName = merchant.trim();
          if (categoryChanged && merchantName) {
            offerRuleThenLeave(merchantName, categoryId);
          } else {
            Alert.alert(S.savedTitle, S.savedMsg, [{ text: S.ok, onPress: () => router.back() }]);
          }
        },
        onError: () => Alert.alert(S.saveErrorTitle, S.saveErrorMsg),
      },
    );
  };

  const handleDelete = () => {
    Alert.alert(S.deleteTitle, isTransfer ? S.deleteMsgTransfer : S.deleteMsg, [
      { text: S.cancel, style: 'cancel' },
      {
        text: S.confirmDelete,
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(txId, {
            onSuccess: () =>
              Alert.alert(S.deletedTitle, S.deletedMsg, [{ text: S.ok, onPress: () => router.back() }]),
            onError: () => Alert.alert(S.saveErrorTitle, S.deleteErrorMsg),
          }),
      },
    ]);
  };

  const formatDateDisplay = (iso: string) => {
    const p = iso.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title={S.titleEdit} />

      {/* Transfer / linked banner */}
      {isTransfer ? (
        <View style={styles.banner}>
          <MaterialIcon name="swap_horiz" size={18} color={COLORS.secondary} />
          <Text style={styles.bannerText}>{S.transferBanner}</Text>
        </View>
      ) : categoryOnly ? (
        <View style={styles.banner}>
          <MaterialIcon name="link" size={18} color={COLORS.secondary} />
          <Text style={styles.bannerText}>{S.linkedBanner}</Text>
        </View>
      ) : null}

      {/* Type badge + amount display */}
      <View style={styles.amountSection}>
        <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
          <Text style={[styles.typeBadgeText, { color: isIncome ? COLORS.tertiary : COLORS.error }]}>
            {isIncome ? S.income : isTransfer ? S.transfer : S.expense}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={fieldsLocked ? 1 : 0.7}
          onPress={() => { if (!fieldsLocked) setAmountFocused(true); }}
        >
          <Text style={[styles.amountDisplay, { color: isIncome ? COLORS.tertiary : COLORS.error }]}>
            {amountNum > 0 ? formatVND(amountNum) : '0 đ'}
          </Text>
        </TouchableOpacity>
        {amountError ? <Text style={styles.amountError}>{amountError}</Text> : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.fieldsContent, amountFocused && { paddingBottom: NUMPAD_HEIGHT }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Category */}
          {!isTransfer ? (
            <TouchableOpacity activeOpacity={0.7} style={styles.fieldRow} onPress={() => setShowCategoryModal(true)}>
              <View style={[styles.fieldIconWrap, { backgroundColor: selectedCategory ? `${selectedCategory.color}25` : `${COLORS.secondary}20` }]}>
                <MaterialIcon
                  name={selectedCategory ? getCategoryIcon(selectedCategory.icon) : 'category'}
                  size={20}
                  color={selectedCategory?.color ?? COLORS.secondary}
                />
              </View>
              <View style={styles.fieldTextWrap}>
                <Text style={styles.fieldLabel}>{S.categoryLabel}</Text>
                <Text style={[styles.fieldValue, !selectedCategory && styles.fieldPlaceholder]}>
                  {selectedCategory?.nameVi ?? S.categoryPlaceholder}
                </Text>
              </View>
              <MaterialIcon name="chevron_right" size={20} color={COLORS.outlineVariant} />
            </TouchableOpacity>
          ) : null}

          {/* Wallet */}
          <TouchableOpacity
            activeOpacity={fieldsLocked ? 1 : 0.7}
            style={styles.fieldRow}
            onPress={() => { if (!fieldsLocked) setShowWalletModal(true); }}
          >
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.primary}20` }]}>
              <MaterialIcon
                name={selectedWallet?.type === 'linked' ? 'link' : 'account_balance_wallet'}
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.walletLabel}</Text>
              <Text style={styles.fieldValue}>{selectedWallet?.name ?? S.walletUnknown}</Text>
            </View>
            {!fieldsLocked && <MaterialIcon name="chevron_right" size={20} color={COLORS.outlineVariant} />}
          </TouchableOpacity>

          {/* Date */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.primary}15` }]}>
              <MaterialIcon name="calendar_today" size={20} color={COLORS.onSurfaceVariant} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.dateLabel}</Text>
              <Text style={styles.fieldValue}>{formatDateDisplay(dateIso || tx.transactionDate)}</Text>
            </View>
          </View>

          {/* Merchant */}
          {!isTransfer ? (
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.outline}20` }]}>
                <MaterialIcon name="person" size={20} color={COLORS.outline} />
              </View>
              <View style={styles.fieldTextWrap}>
                <Text style={styles.fieldLabel}>{S.merchantLabel}</Text>
                <RNTextInput
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder={S.merchantPlaceholder}
                  placeholderTextColor={COLORS.outlineVariant}
                  style={styles.inlineInput}
                  editable={!fieldsLocked}
                />
              </View>
            </View>
          ) : null}

          {/* Description / note */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${COLORS.outline}20` }]}>
              <MaterialIcon name="notes" size={20} color={COLORS.outline} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.descriptionLabel}</Text>
              <RNTextInput
                value={description}
                onChangeText={setDescription}
                placeholder={S.descriptionPlaceholder}
                placeholderTextColor={COLORS.outlineVariant}
                style={styles.inlineInput}
                editable={!fieldsLocked}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.saveBtn, (updateMutation.isPending || createRuleMutation.isPending) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={updateMutation.isPending || createRuleMutation.isPending}
            >
              {updateMutation.isPending || createRuleMutation.isPending
                ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
                : <Text style={styles.saveBtnText}>{S.save}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.deleteBtn, deleteMutation.isPending && styles.btnDisabled]}
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? <ActivityIndicator size="small" color={COLORS.error} />
                : <Text style={styles.deleteBtnText}>{S.delete}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker */}
      <DraggableSheet visible={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>{S.pickCategory}</Text>
          <FlatList
            data={[...CATEGORIES]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listRow, categoryId === item.id && styles.listRowSelected]}
                onPress={() => { setCategoryId(item.id); setShowCategoryModal(false); }}
                activeOpacity={0.75}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}26` }]}>
                  <MaterialIcon name={getCategoryIcon(item.icon)} size={18} color={item.color} />
                </View>
                <Text style={styles.listRowText}>{item.nameVi}</Text>
                {categoryId === item.id ? <MaterialIcon name="check" size={20} color={COLORS.primary} /> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </DraggableSheet>

      {/* Wallet picker */}
      <DraggableSheet visible={showWalletModal} onClose={() => setShowWalletModal(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>{S.pickWallet}</Text>
          <FlatList
            data={wallets}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listRow, walletId === item.id && styles.listRowSelected]}
                onPress={() => { setWalletId(item.id); setShowWalletModal(false); }}
                activeOpacity={0.75}
              >
                <View style={styles.iconWrap}>
                  <MaterialIcon
                    name={item.type === 'linked' ? 'link' : 'account_balance_wallet'}
                    size={18}
                    color={item.type === 'linked' ? COLORS.secondary : COLORS.primary}
                  />
                </View>
                <Text style={styles.listRowText}>{item.name}</Text>
                {walletId === item.id ? <MaterialIcon name="check" size={20} color={COLORS.primary} /> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </DraggableSheet>

      <NumericKeypad
        visible={amountFocused}
        onClose={() => setAmountFocused(false)}
        onNumberPress={handleAmountNumberPress}
        onBackspace={handleAmountBackspace}
        onClear={handleAmountClear}
        onDone={() => setAmountFocused(false)}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.75}>
        <MaterialIcon name="arrow_back" size={24} color={COLORS.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface,
  },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
    borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant,
  },
  bannerText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.onSecondaryContainer, lineHeight: 20 },

  // Amount section
  amountSection: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    gap: SPACING[2],
  },
  typeBadge: {
    paddingHorizontal: SPACING[3], paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  typeBadgeIncome: { backgroundColor: `${COLORS.tertiary}15`, borderColor: `${COLORS.tertiary}40` },
  typeBadgeExpense: { backgroundColor: `${COLORS.error}15`, borderColor: `${COLORS.error}40` },
  typeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  amountDisplay: { fontSize: FONT_SIZE['4xl'], fontWeight: FONT_WEIGHT.bold, letterSpacing: -1 },
  amountError: { fontSize: FONT_SIZE.xs, color: COLORS.error },

  // Field rows (matches manual.tsx)
  fieldsContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], paddingTop: SPACING[3], gap: SPACING[2] },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], gap: SPACING[3], minHeight: 64,
  },
  fieldIconWrap: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fieldTextWrap: { flex: 1 },
  fieldLabel: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginBottom: 2 },
  fieldValue: { fontSize: FONT_SIZE.base, color: COLORS.onSurface, fontWeight: FONT_WEIGHT.medium },
  fieldPlaceholder: { color: COLORS.outlineVariant, fontWeight: FONT_WEIGHT.normal },
  inlineInput: { fontSize: FONT_SIZE.base, color: COLORS.onSurface, padding: 0, fontWeight: FONT_WEIGHT.medium },

  // Actions
  actions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[4] },
  saveBtn: {
    flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
  deleteBtn: {
    flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.error}50`,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.error },
  btnDisabled: { opacity: 0.5 },

  // Sheet
  sheetContent: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[8], maxHeight: '72%' },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, marginBottom: SPACING[3] },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
    paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant,
  },
  listRowSelected: {
    backgroundColor: `${COLORS.primaryContainer}22`, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2], borderBottomWidth: 0,
  },
  listRowText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.onSurface },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
  },
});
