import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  withAlpha,
} from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { DatePickerField } from '@/components/common/DatePickerField';
import { TextInput } from '@/components/common/TextInput';
import { ImagePreviewModal } from '@/components/common/ImagePreviewModal';
import { CategoryPickerSheet } from '@/components/categories';
import {
  useTransactionById,
  useWallets,
  useUpdateTransaction,
  useDeleteTransaction,
  useCreateRule,
  useCategorizeTransaction,
  useOverrideCategorization,
} from '@/hooks';
import { getCategoryTypeForTransaction } from '@/constants/categories';
import { useCategoryCatalog } from '@/hooks/useCategoryCatalog';
import { formatVND } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/errors';
import { deleteReceiptImage, getReceiptImageUri } from '@/lib/receiptImageStorage';
import { TX_DETAIL_STRINGS as S } from '@/data/transactionDetailData';
import { AiSuggestionCard, getStoredAiSuggestion, type AiSuggestion } from '@/components/transaction/AiSuggestionCard';

// ───────────────────────────────────────────────────────────────────────────
// Route: /transactions/[id]?mode=full|category&returnTo=history
//   mode=full     → basic wallet, all fields editable
//   mode=category → linked wallet, category only (per SePay edit rule)
// ───────────────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { id, mode, returnTo } = useLocalSearchParams<{
    id: string;
    mode?: string;
    returnTo?: string;
  }>();

  if (!id) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} title={S.titleNotFound} />
        <EmptyState icon="error" title={S.missingIdTitle} subtitle={S.missingIdSubtitle} />
      </SafeAreaView>
    );
  }

  return <DetailBody txId={id} modeParam={mode} returnTo={returnTo} />;
}

function DetailBody({
  txId,
  modeParam,
  returnTo,
}: {
  txId: string;
  modeParam?: string;
  returnTo?: string;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { data: tx, isLoading, isError } = useTransactionById(txId);
  const categoryCatalog = useCategoryCatalog();
  const { data: walletData } = useWallets();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const createRuleMutation = useCreateRule();
  const categorizeMutation = useCategorizeTransaction();
  const overrideMutation = useOverrideCategorization();

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
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [storedDismissed, setStoredDismissed] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setAmountRaw(String(tx.amount));
    setDescription(tx.description ?? '');
    setMerchant(tx.merchant ?? '');
    setCategoryId(tx.categoryId);
    setWalletId(tx.walletId);
    setDateIso(tx.transactionDate);
    setAiSuggestion(null);
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
  const handleLeave = useCallback(() => {
    if (returnTo === 'history') {
      router.replace('/(tabs)/transactions');
      return;
    }
    router.back();
  }, [returnTo, router]);

  useFocusEffect(
    useCallback(() => {
      if (returnTo !== 'history') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/(tabs)/transactions');
        return true;
      });
      return () => subscription.remove();
    }, [returnTo, router]),
  );

  if (isLoading) return <LoadingSpinner />;

  if (isError || !tx) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={handleLeave} title={S.titleNotFound} />
        <EmptyState
          icon="receipt_long"
          title={isError ? S.loadErrorTitle : S.notFoundTitle}
          subtitle={isError ? S.loadErrorSubtitle : S.notFoundSubtitle}
        />
      </SafeAreaView>
    );
  }

  const wallets = walletData?.wallets ?? [];
  const selectedCategory = categoryCatalog.get(categoryId) ?? null;
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? null;

  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
  const categoryOnly = modeParam === 'category' || selectedWallet?.type === 'linked';
  const fieldsLocked = isTransfer || categoryOnly;
  const receiptImageUri =
    tx.entryMethod === 'photo' ? getReceiptImageUri(txId) : undefined;

  const amountNum = parseInt(amountRaw, 10) || 0;
  const isIncome = tx.type === 'income';
  const categoryType = getCategoryTypeForTransaction(tx.type);

  const offerRuleThenLeave = (merchantName: string, catId: string) => {
    const catName = categoryCatalog.get(catId)?.nameVi ?? S.categoryLabel;
    Alert.alert(S.ruleTitle, S.ruleMessage(merchantName, catName), [
      { text: S.ruleSkip, style: 'cancel', onPress: handleLeave },
      {
        text: S.ruleConfirm,
        onPress: () =>
          createRuleMutation.mutate(
            { merchantKeyword: merchantName, categoryId: catId },
            {
              onSuccess: (res) =>
                Alert.alert(S.ruleAppliedTitle, S.ruleAppliedMessage(res.appliedCount), [
                  { text: S.ok, onPress: handleLeave },
                ]),
              onError: handleLeave,
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
            Alert.alert(S.savedTitle, S.savedMsg, [{ text: S.ok, onPress: handleLeave }]);
          }
        },
        onError: (error) =>
          Alert.alert(S.saveErrorTitle, getApiErrorMessage(error, S.saveErrorMsg)),
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
            onSuccess: () => {
              deleteReceiptImage(txId);
              Alert.alert(S.deletedTitle, S.deletedMsg, [{ text: S.ok, onPress: handleLeave }]);
            },
            onError: () => Alert.alert(S.saveErrorTitle, S.deleteErrorMsg),
          }),
      },
    ]);
  };

  const storedSuggestion = storedDismissed
    ? null
    : getStoredAiSuggestion(tx, categoryCatalog.get(tx.aiSuggestedCategoryId)?.nameVi);
  const activeSuggestion = aiSuggestion ?? storedSuggestion;

  const handleDismissSuggestion = () => {
    setAiSuggestion(null);
    setStoredDismissed(true);
  };

  const handleAiSuggest = () => {
    setAiSuggestion(null);
    categorizeMutation.mutate(txId, {
      onSuccess: (outcome) => {
        if (outcome.applied && outcome.categoryId) {
          setCategoryId(outcome.categoryId);
          const catName = categoryCatalog.get(outcome.categoryId)?.nameVi ?? outcome.categoryName ?? '';
          Alert.alert(S.aiSuggestAppliedTitle, S.aiSuggestAppliedMsg(catName));
          return;
        }
        if (outcome.source === 'AI_SUGGESTION' && outcome.suggestedCategoryId) {
          setAiSuggestion({
            categoryId: outcome.suggestedCategoryId,
            categoryName: outcome.suggestedCategoryName ?? '',
            confidence: outcome.confidence ?? null,
          });
          return;
        }
        if (outcome.source === 'OFF') {
          Alert.alert(S.aiSuggestOffTitle, S.aiSuggestOffMsg, [
            { text: S.aiSuggestOffSettingsBtn, onPress: () => router.push({ pathname: '/settings/ai-preferences' }) },
            { text: S.ok, style: 'cancel' },
          ]);
          return;
        }
        Alert.alert(S.aiSuggestErrorTitle, S.aiSuggestNoneMsg);
      },
      onError: (error) =>
        Alert.alert(S.aiSuggestErrorTitle, getApiErrorMessage(error, S.aiSuggestErrorMsg)),
    });
  };

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    const suggestedId = activeSuggestion.categoryId;
    overrideMutation.mutate(
      { transactionId: txId, categoryId: suggestedId },
      {
        onSuccess: () => {
          setCategoryId(suggestedId);
          setAiSuggestion(null);
          setStoredDismissed(true);
        },
        onError: (error) =>
          Alert.alert(S.aiSuggestErrorTitle, getApiErrorMessage(error, S.aiSuggestApplyErrorMsg)),
      },
    );
  };

  const formatDateDisplay = (iso: string) => {
    const p = iso.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={handleLeave} title={S.titleEdit} />

      {/* Transfer / linked banner */}
      {isTransfer ? (
        <View style={styles.banner}>
          <MaterialIcon name="swap_horiz" size={18} color={colors.secondary} />
          <Text style={styles.bannerText}>{S.transferBanner}</Text>
        </View>
      ) : categoryOnly ? (
        <View style={styles.banner}>
          <MaterialIcon name="link" size={18} color={colors.secondary} />
          <Text style={styles.bannerText}>{S.linkedBanner}</Text>
        </View>
      ) : null}

      {/* Type badge + amount display */}
      <View style={styles.amountSection}>
        <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
          <Text style={[styles.typeBadgeText, { color: isIncome ? colors.tertiary : colors.error }]}>
            {isIncome ? S.income : isTransfer ? S.transfer : S.expense}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={fieldsLocked ? 1 : 0.7}
          onPress={() => { if (!fieldsLocked) setAmountFocused(true); }}
        >
          <Text style={[styles.amountDisplay, { color: isIncome ? colors.tertiary : colors.error }]}>
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
          {receiptImageUri ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.receiptImageCard}
              onPress={() => setShowReceiptPreview(true)}
              accessibilityRole="imagebutton"
              accessibilityLabel={S.receiptImageHint}
            >
              <Image
                source={{ uri: receiptImageUri }}
                style={styles.receiptThumbnail}
                resizeMode="cover"
              />
              <View style={styles.receiptImageText}>
                <Text style={styles.receiptImageTitle}>{S.receiptImageLabel}</Text>
                <Text style={styles.receiptImageHint}>{S.receiptImageHint}</Text>
              </View>
              <MaterialIcon name="zoom_in" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : null}

          {/* Category */}
          {!isTransfer ? (
            <TouchableOpacity activeOpacity={0.7} style={styles.fieldRow} onPress={() => setShowCategoryModal(true)}>
              <View style={[styles.fieldIconWrap, { backgroundColor: selectedCategory ? `${selectedCategory.color}25` : withAlpha(colors.secondary, 0.13) }]}>
                <MaterialIcon
                  name={selectedCategory?.iconName ?? 'category'}
                  size={20}
                  color={selectedCategory?.color ?? colors.secondary}
                />
              </View>
              <View style={styles.fieldTextWrap}>
                <Text style={styles.fieldLabel}>{S.categoryLabel}</Text>
                <Text style={[styles.fieldValue, !selectedCategory && styles.fieldPlaceholder]}>
                  {selectedCategory?.nameVi ?? S.categoryPlaceholder}
                </Text>
              </View>
              <MaterialIcon name="chevron_right" size={20} color={colors.outlineVariant} />
            </TouchableOpacity>
          ) : null}

          {/* AI category suggestion — offered only while uncategorized (e.g. a SePay-synced
              transaction the backend's default suggest_only mode never auto-applied). */}
          {!isTransfer && !selectedCategory ? (
            activeSuggestion ? (
              <AiSuggestionCard
                suggestion={activeSuggestion}
                onApply={handleApplySuggestion}
                onDismiss={handleDismissSuggestion}
                isApplying={overrideMutation.isPending}
              />
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.aiSuggestButton}
                onPress={handleAiSuggest}
                disabled={categorizeMutation.isPending}
              >
                {categorizeMutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color={colors.tertiary} />
                    <Text style={styles.aiSuggestButtonText}>{S.aiSuggestLoading}</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="auto_awesome" size={18} color={colors.tertiary} />
                    <Text style={styles.aiSuggestButtonText}>{S.aiSuggestButton}</Text>
                  </>
                )}
              </TouchableOpacity>
            )
          ) : null}

          {/* Wallet */}
          <TouchableOpacity
            activeOpacity={fieldsLocked ? 1 : 0.7}
            style={styles.fieldRow}
            onPress={() => { if (!fieldsLocked) setShowWalletModal(true); }}
          >
            <View style={[styles.fieldIconWrap, { backgroundColor: withAlpha(colors.primary, 0.13) }]}>
              <MaterialIcon
                name={selectedWallet?.type === 'linked' ? 'link' : 'account_balance_wallet'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.walletLabel}</Text>
              <Text style={styles.fieldValue}>{selectedWallet?.name ?? S.walletUnknown}</Text>
            </View>
            {!fieldsLocked && <MaterialIcon name="chevron_right" size={20} color={colors.outlineVariant} />}
          </TouchableOpacity>

          {/* Date */}
          <DatePickerField
            value={dateIso || tx.transactionDate}
            onChange={setDateIso}
            disabled={fieldsLocked}
            customTrigger={(openPicker) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.fieldRow}
                onPress={openPicker}
                disabled={fieldsLocked}
              >
                <View style={[styles.fieldIconWrap, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
                  <MaterialIcon name="calendar_today" size={20} color={colors.onSurfaceVariant} />
                </View>
                <View style={styles.fieldTextWrap}>
                  <Text style={styles.fieldLabel}>{S.dateLabel}</Text>
                  <Text style={styles.fieldValue}>{formatDateDisplay(dateIso || tx.transactionDate)}</Text>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Merchant */}
          {!isTransfer ? (
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIconWrap, { backgroundColor: withAlpha(colors.outline, 0.13) }]}>
                <MaterialIcon name="person" size={20} color={colors.outline} />
              </View>
              <View style={styles.fieldTextWrap}>
                <Text style={styles.fieldLabel}>{S.merchantLabel}</Text>
                <TextInput
                  variant="inline"
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder={S.merchantPlaceholder}
                  editable={!fieldsLocked}
                />
              </View>
            </View>
          ) : null}

          {/* Description / note */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: withAlpha(colors.outline, 0.13) }]}>
              <MaterialIcon name="notes" size={20} color={colors.outline} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.descriptionLabel}</Text>
              <TextInput
                variant="inline"
                value={description}
                onChangeText={setDescription}
                placeholder={S.descriptionPlaceholder}
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
                ? <ActivityIndicator size="small" color={colors.onPrimary} />
                : <Text style={styles.saveBtnText}>{S.save}</Text>}
            </TouchableOpacity>
            {/* Bank-synced (linked-wallet) transactions are read-only and cannot be deleted. */}
            {selectedWallet?.type !== 'linked' && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.deleteBtn, deleteMutation.isPending && styles.btnDisabled]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Text style={styles.deleteBtnText}>{S.delete}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker */}
      <CategoryPickerSheet
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={S.pickCategory}
        entryType={categoryType ?? 'expense'}
        selectedCategoryId={categoryId}
        onSelect={(selectedCategoryId) => {
          setCategoryId(selectedCategoryId);
          setShowCategoryModal(false);
        }}
      />

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
                    color={item.type === 'linked' ? colors.secondary : colors.primary}
                  />
                </View>
                <Text style={styles.listRowText}>{item.name}</Text>
                {walletId === item.id ? <MaterialIcon name="check" size={20} color={colors.primary} /> : null}
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

      {showReceiptPreview && receiptImageUri ? (
        <ImagePreviewModal
          visible
          uri={receiptImageUri}
          title={S.receiptImageLabel}
          onClose={() => setShowReceiptPreview(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.75}
        accessibilityRole="button" accessibilityLabel="Quay lại">
        <MaterialIcon name="arrow_back" size={24} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[3],
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface,
  },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  bannerText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.onSecondaryContainer, lineHeight: 20 },

  // Amount section
  amountSection: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: SPACING[2],
  },
  typeBadge: {
    paddingHorizontal: SPACING[3], paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  typeBadgeIncome: { backgroundColor: withAlpha(colors.tertiary, 0.08), borderColor: withAlpha(colors.tertiary, 0.25) },
  typeBadgeExpense: { backgroundColor: withAlpha(colors.error, 0.08), borderColor: withAlpha(colors.error, 0.25) },
  typeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  amountDisplay: { fontSize: FONT_SIZE['4xl'], fontWeight: FONT_WEIGHT.bold, letterSpacing: -1 },
  amountError: { fontSize: FONT_SIZE.xs, color: colors.error },

  // Field rows (matches manual.tsx)
  fieldsContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], paddingTop: SPACING[3], gap: SPACING[2] },
  receiptImageCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.25),
    backgroundColor: withAlpha(colors.primary, 0.06),
  },
  receiptThumbnail: {
    width: 60,
    height: 76,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surfaceVariant,
  },
  receiptImageText: { flex: 1 },
  receiptImageTitle: {
    color: colors.onSurface,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING[1],
  },
  receiptImageHint: {
    color: colors.onSurfaceVariant,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], gap: SPACING[3], minHeight: 64,
  },
  fieldIconWrap: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fieldTextWrap: { flex: 1 },
  fieldLabel: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginBottom: 2 },
  fieldValue: { fontSize: FONT_SIZE.base, color: colors.onSurface, fontWeight: FONT_WEIGHT.medium },
  fieldPlaceholder: { color: colors.outlineVariant, fontWeight: FONT_WEIGHT.normal },

  // AI category suggestion
  aiSuggestButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2],
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderStyle: 'dashed',
    borderColor: withAlpha(colors.tertiary, 0.4), backgroundColor: withAlpha(colors.tertiary, 0.06),
    paddingVertical: SPACING[3],
  },
  aiSuggestButtonText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.tertiary },

  // Actions
  actions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[4] },
  saveBtn: {
    flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onPrimary },
  deleteBtn: {
    flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: withAlpha(colors.error, 0.31),
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: colors.error },
  btnDisabled: { opacity: 0.5 },

  // Sheet
  sheetContent: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[8], maxHeight: '72%' },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, marginBottom: SPACING[3] },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
    paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  listRowSelected: {
    backgroundColor: withAlpha(colors.primaryContainer, 0.13), borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2], borderBottomWidth: 0,
  },
  listRowText: { flex: 1, fontSize: FONT_SIZE.base, color: colors.onSurface },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  });
}
