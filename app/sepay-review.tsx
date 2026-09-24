import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { CategoryPickerSheet } from '@/components/categories';
import { SepayReviewCard } from '@/components/transaction/SepayReviewCard';
import { useAiPreferences, useCreateRule, useReviewOverride, useSepayReviewQueue, useWallets } from '@/hooks';
import { useCategoryCatalog } from '@/hooks/useCategoryCatalog';
import { useEphemeralBannerStore } from '@/stores/ephemeralBannerStore';
import { SEPAY_REVIEW_STRINGS as S } from '@/data/sepayReviewData';
import { TX_DETAIL_STRINGS as TX } from '@/data/transactionDetailData';
import type { Transaction } from '@/types';

// Route: /sepay-review?walletId=<id> - walletId is optional and preselects a wallet chip.

export default function SepayReviewScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ walletId?: string }>();
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(params.walletId || undefined);
  const [pickerTx, setPickerTx] = useState<Transaction | null>(null);

  const { data: walletData, isLoading: isWalletsLoading } = useWallets();
  const { data: aiPreferences, isLoading: isPreferencesLoading } = useAiPreferences();
  const catalog = useCategoryCatalog();
  const { mutate: createRule } = useCreateRule();
  const showBanner = useEphemeralBannerStore((state) => state.show);

  const linkedWallets = useMemo(
    () => (walletData?.wallets ?? []).filter((wallet) => wallet.type === 'linked'),
    [walletData],
  );
  const walletNames = useMemo(
    () => new Map(linkedWallets.map((wallet) => [wallet.id, wallet.name])),
    [linkedWallets],
  );
  const isAiOff = aiPreferences?.categorizationMode === 'off';
  // A preselected wallet only applies when it is a linked wallet and there are chips to change
  // it; otherwise a stale or single-wallet param would filter the inbox with no way to clear it.
  const walletId =
    linkedWallets.length >= 2 && linkedWallets.some((wallet) => wallet.id === selectedWalletId)
      ? selectedWalletId
      : undefined;
  const { data: rows, isLoading: isRowsLoading, isError, refetch } = useSepayReviewQueue(walletId);
  // Wait for the AI mode so suggestions are never offered for a moment and then withdrawn.
  const isLoading = isRowsLoading || isPreferencesLoading || isWalletsLoading;

  const offerRule = useCallback(
    (merchant: string, categoryId: string) => {
      const categoryName = catalog.get(categoryId)?.nameVi ?? TX.categoryLabel;
      Alert.alert(TX.ruleTitle, TX.ruleMessage(merchant, categoryName), [
        { text: TX.ruleSkip, style: 'cancel' },
        {
          text: TX.ruleConfirm,
          onPress: () =>
            createRule(
              { merchantKeyword: merchant, categoryId },
              {
                onSuccess: (res) =>
                  Alert.alert(TX.ruleAppliedTitle, TX.ruleAppliedMessage(res.appliedCount), [{ text: TX.ok }]),
                onError: () => showBanner({ title: S.ruleErrorTitle, body: S.ruleErrorBody, onPress: () => undefined }),
              },
            ),
        },
      ]);
    },
    [catalog, createRule, showBanner],
  );

  const overrideMutation = useReviewOverride({
    onSuccess: ({ merchant, offerRule: shouldOfferRule, categoryId }) => {
      const name = merchant?.trim();
      if (shouldOfferRule && name) offerRule(name, categoryId);
    },
    onError: () => showBanner({ title: S.errorToastTitle, body: S.errorToastBody, onPress: () => undefined }),
  });

  const { mutate: overrideCategory } = overrideMutation;
  const applyCategory = useCallback(
    (tx: Transaction, categoryId: string, shouldOfferRule: boolean) =>
      overrideCategory({
        transactionId: tx.id,
        categoryId,
        merchant: tx.merchant,
        offerRule: shouldOfferRule,
      }),
    [overrideCategory],
  );

  const handleAccept = useCallback(
    (tx: Transaction) => {
      if (tx.aiSuggestedCategoryId) applyCategory(tx, tx.aiSuggestedCategoryId, false);
    },
    [applyCategory],
  );
  const handleChange = useCallback((tx: Transaction) => setPickerTx(tx), []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <SepayReviewCard
        transaction={item}
        walletName={walletNames.get(item.walletId)}
        isAiOff={isAiOff}
        onAccept={handleAccept}
        onChange={handleChange}
      />
    ),
    [walletNames, isAiOff, handleAccept, handleChange],
  );

  const renderBody = () => {
    if (isLoading) return <LoadingSpinner />;
    if (isError) return <ErrorState message={S.loadErrorTitle} onRetry={() => void refetch()} />;
    return (
      <FlatList
        data={rows ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ListSeparator}
        ListEmptyComponent={<EmptyState icon="task_alt" title={S.emptyTitle} subtitle={S.emptySubtitle} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={S.title} showBack onBack={() => router.back()} />

      {isAiOff && (
        <View style={styles.offBanner}>
          <Text style={styles.offBannerText}>{S.offBannerText}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/settings/ai-preferences' })}
            accessibilityRole="link"
          >
            <Text style={styles.offBannerLink}>{S.offBannerLink}</Text>
          </TouchableOpacity>
        </View>
      )}

      {linkedWallets.length >= 2 && (
        <View style={styles.chips}>
          <WalletChip label={S.allWallets} selected={!walletId} onPress={() => setSelectedWalletId(undefined)} />
          {linkedWallets.map((wallet) => (
            <WalletChip
              key={wallet.id}
              label={wallet.name}
              selected={walletId === wallet.id}
              onPress={() => setSelectedWalletId(wallet.id)}
            />
          ))}
        </View>
      )}

      {renderBody()}

      <CategoryPickerSheet
        visible={pickerTx !== null}
        onClose={() => setPickerTx(null)}
        title={S.pickCategory}
        entryType="expense"
        selectedCategoryId={pickerTx?.categoryId}
        onSelect={(categoryId) => {
          const tx = pickerTx;
          setPickerTx(null);
          if (tx) applyCategory(tx, categoryId, true);
        }}
      />
    </SafeAreaView>
  );
}

function ListSeparator() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.separator} />;
}

function WalletChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { flexGrow: 1, padding: SPACING[4] },
    separator: { height: SPACING[3] },
    offBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[2],
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[3],
      backgroundColor: colors.secondaryContainer,
    },
    offBannerText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.onSecondaryContainer, lineHeight: 20 },
    offBannerLink: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], paddingHorizontal: SPACING[4], paddingTop: SPACING[3] },
    chip: {
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      maxWidth: '60%',
    },
    chipSelected: { backgroundColor: withAlpha(colors.primary, 0.12), borderColor: colors.primary },
    chipText: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
    chipTextSelected: { color: colors.primary, fontWeight: FONT_WEIGHT.semibold },
  });
}
