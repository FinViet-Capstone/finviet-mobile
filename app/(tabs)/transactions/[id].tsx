import React, { useEffect, useState } from 'react';
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
} from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { DatePickerField } from '@/components/common/DatePickerField';
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
        <EmptyState
          icon="error"
          title={S.missingIdTitle}
          subtitle={S.missingIdSubtitle}
        />
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

  useEffect(() => {
    if (!tx) return;
    setAmountRaw(String(tx.amount));
    setDescription(tx.description ?? '');
    setMerchant(tx.merchant ?? '');
    setCategoryId(tx.categoryId);
    setWalletId(tx.walletId);
    setDateIso(tx.transactionDate);
  }, [tx]);

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
  const selectedCategory =
    categoryId ? CATEGORIES.find((c) => c.id === categoryId) ?? null : null;
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? null;

  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
  // Linked wallets (and any explicit mode=category) restrict editing to the
  // category only. Basic wallets in mode=full can edit everything.
  const categoryOnly =
    modeParam === 'category' || selectedWallet?.type === 'linked';
  const fieldsLocked = isTransfer || categoryOnly;

  const offerRuleThenLeave = (merchantName: string, catId: string) => {
    const catName =
      CATEGORIES.find((c) => c.id === catId)?.nameVi ?? S.categoryLabel;
    Alert.alert(S.ruleTitle, S.ruleMessage(merchantName, catName), [
      { text: S.ruleSkip, style: 'cancel', onPress: () => router.back() },
      {
        text: S.ruleConfirm,
        onPress: () =>
          createRuleMutation.mutate(
            { merchantKeyword: merchantName, categoryId: catId },
            {
              onSuccess: (res) =>
                Alert.alert(
                  S.ruleAppliedTitle,
                  S.ruleAppliedMessage(res.appliedCount),
                  [{ text: S.ok, onPress: () => router.back() }],
                ),
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
      if (amount <= 0) {
        setAmountError(S.amountPositiveError);
        return;
      }
      if (!walletId) {
        Alert.alert(S.noWalletTitle, S.noWalletMsg);
        return;
      }
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
          const categoryChanged =
            !isTransfer && categoryId !== null && categoryId !== originalCategoryId;
          const merchantName = merchant.trim();
          if (categoryChanged && merchantName) {
            offerRuleThenLeave(merchantName, categoryId);
          } else {
            Alert.alert(S.savedTitle, S.savedMsg, [
              { text: S.ok, onPress: () => router.back() },
            ]);
          }
        },
        onError: () => Alert.alert(S.saveErrorTitle, S.saveErrorMsg),
      },
    );
  };

  const handleDelete = () => {
    Alert.alert(
      S.deleteTitle,
      isTransfer ? S.deleteMsgTransfer : S.deleteMsg,
      [
        { text: S.cancel, style: 'cancel' },
        {
          text: S.confirmDelete,
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(txId, {
              onSuccess: () =>
                Alert.alert(S.deletedTitle, S.deletedMsg, [
                  { text: S.ok, onPress: () => router.back() },
                ]),
              onError: () => Alert.alert(S.saveErrorTitle, S.deleteErrorMsg),
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title={S.titleEdit} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Amount */}
          <View style={styles.card}>
            <TextInput
              label={S.amountLabel}
              value={amountRaw}
              onChangeText={(t) => {
                setAmountRaw(t.replace(/\D/g, ''));
                if (amountError) setAmountError(undefined);
              }}
              keyboardType="numeric"
              placeholder="0"
              error={amountError}
              editable={!fieldsLocked}
            />
            <Text style={styles.amountPreview}>
              {formatVND(parseInt(amountRaw, 10) || 0)}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <TextInput
              label={S.descriptionLabel}
              value={description}
              onChangeText={setDescription}
              placeholder={S.descriptionPlaceholder}
              editable={!fieldsLocked}
            />
          </View>

          {/* Merchant (skip for transfers) */}
          {!isTransfer ? (
            <View style={styles.card}>
              <TextInput
                label={S.merchantLabel}
                value={merchant}
                onChangeText={setMerchant}
                placeholder={S.merchantPlaceholder}
                editable={!fieldsLocked}
              />
            </View>
          ) : null}

          {/* Category (skip for transfers; always editable otherwise) */}
          {!isTransfer ? (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>{S.categoryLabel}</Text>
              <TouchableOpacity
                style={[
                  styles.selectRow,
                  categoryId === null && styles.selectRowUncategorized,
                ]}
                onPress={() => setShowCategoryModal(true)}
                activeOpacity={0.75}
              >
                {selectedCategory ? (
                  <View style={styles.selectRowLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${selectedCategory.color}26` }]}>
                      <MaterialIcon
                        name={getCategoryIcon(selectedCategory.icon)}
                        size={18}
                        color={selectedCategory.color}
                      />
                    </View>
                    <Text style={styles.selectValue}>{selectedCategory.nameVi}</Text>
                  </View>
                ) : (
                  <Text style={styles.selectPlaceholder}>{S.categoryPlaceholder}</Text>
                )}
                <MaterialIcon name="chevron_right" size={22} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Wallet */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{S.walletLabel}</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowWalletModal(true)}
              activeOpacity={0.75}
              disabled={fieldsLocked}
            >
              <View style={styles.selectRowLeft}>
                <MaterialIcon
                  name={selectedWallet?.type === 'linked' ? 'link' : 'account_balance_wallet'}
                  size={18}
                  color={selectedWallet?.type === 'linked' ? COLORS.secondary : COLORS.primary}
                />
                <Text style={styles.selectValue}>
                  {selectedWallet?.name ?? S.walletUnknown}
                </Text>
              </View>
              {!fieldsLocked ? (
                <MaterialIcon name="chevron_right" size={22} color={COLORS.onSurfaceVariant} />
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Date */}
          <View style={styles.card}>
            <DatePickerField
              label={S.dateLabel}
              value={dateIso || tx.transactionDate}
              onChange={setDateIso}
              disabled={fieldsLocked}
            />
          </View>

          <Button
            title={S.save}
            onPress={handleSave}
            loading={updateMutation.isPending || createRuleMutation.isPending}
            style={styles.submit}
          />
          <Button
            title={S.delete}
            variant="ghost"
            onPress={handleDelete}
            loading={deleteMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker */}
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
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{S.pickCategory}</Text>
          <FlatList
            data={[...CATEGORIES]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listRow, categoryId === item.id && styles.listRowSelected]}
                onPress={() => {
                  setCategoryId(item.id);
                  setShowCategoryModal(false);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}26` }]}>
                  <MaterialIcon name={getCategoryIcon(item.icon)} size={18} color={item.color} />
                </View>
                <Text style={styles.listRowText}>{item.nameVi}</Text>
                {categoryId === item.id ? (
                  <MaterialIcon name="check" size={20} color={COLORS.primary} />
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Wallet picker */}
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
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{S.pickWallet}</Text>
          <FlatList
            data={wallets}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listRow, walletId === item.id && styles.listRowSelected]}
                onPress={() => {
                  setWalletId(item.id);
                  setShowWalletModal(false);
                }}
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
                {walletId === item.id ? (
                  <MaterialIcon name="check" size={20} color={COLORS.primary} />
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  kav: { flex: 1 },
  scroll: { padding: SPACING[4], paddingBottom: SPACING[12] },

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
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  bannerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSecondaryContainer,
    lineHeight: 20,
  },

  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
  },
  fieldLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountPreview: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    textAlign: 'right',
    marginTop: SPACING[2],
  },

  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    minHeight: 48,
  },
  selectRowUncategorized: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  selectRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], flex: 1 },
  selectValue: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.onSurface },
  selectPlaceholder: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
  },

  submit: { marginTop: SPACING[2], marginBottom: SPACING[2] },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[5],
    maxHeight: '72%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
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
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  listRowSelected: {
    backgroundColor: `${COLORS.primaryContainer}22`,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
  },
  listRowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
  },
});
