import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { isAxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  useWalletById,
  useSyncSepayWallet,
  useDeleteWallet,
  useSepayLinks,
  useUnlinkSepayAccount,
} from '@/hooks/useWallets';
import { useTransactions } from '@/hooks';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { getApiErrorMessage, BUSINESS_RULE_MESSAGES_VI } from '@/utils/errors';
import type { Transaction } from '@/types';

const S = {
  back: 'arrow_back',
  edit: 'edit',
  delete: 'delete',
  basic: 'Ví cơ bản',
  linked: 'Ví liên kết',
  balance: 'Số dư',
  // Linked-wallet balances mirror what the bank reports, so they don't move with
  // each synced transaction — say so instead of letting it look like a bug.
  balanceSynced: 'Số dư đồng bộ từ ngân hàng',
  history: 'LỊCH SỬ GIAO DỊCH',
  empty: 'Chưa có giao dịch nào',
  syncOk: 'Đã đồng bộ',
  syncError: 'Lỗi kết nối',
  syncing: 'Đang đồng bộ',
  syncBtn: 'Đồng bộ ngay',
  syncSuccess: 'Đồng bộ thành công',
  deleteTitle: 'Xóa ví?',
  deleteCancel: 'Hủy',
  deleteConfirm: 'Xóa',
  deleteErrorTitle: 'Không thể xóa ví',
  relinkBanner: 'Kết nối ngân hàng đã hết hạn. Vui lòng liên kết lại để tiếp tục đồng bộ.',
  unlinkBtn: 'Ngắt kết nối',
  unlinkTitle: 'Ngắt kết nối ngân hàng?',
  unlinkMsg: 'Ví sẽ chuyển về ví thường và không còn tự động đồng bộ giao dịch. Lịch sử giao dịch đã có sẽ được giữ lại.',
  unlinkCancel: 'Hủy',
  unlinkConfirm: 'Ngắt kết nối',
  unlinkErrorTitle: 'Không thể ngắt kết nối',
  unlinkError: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
};

function getWalletDeleteErrorMessage(err: unknown): string {
  // Real backend: 422 { code }. Mock: a plain Error whose message IS the code
  // (see mock/wallets.ts deleteWallet). Both wallet_has_transactions/last_wallet
  // live in the shared BUSINESS_RULE_MESSAGES_VI map now, not a local duplicate.
  const code = isAxiosError(err)
    ? (err.response?.data as { code?: string } | undefined)?.code
    : (err as Error | undefined)?.message;
  return (code && BUSINESS_RULE_MESSAGES_VI[code]) || 'Không thể xóa ví. Vui lòng thử lại.';
}

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: wallet, isLoading, isError, error, refetch } = useWalletById(id);
  const sepaySyncMutation = useSyncSepayWallet();
  const deleteWalletMutation = useDeleteWallet();
  const { data: sepayLinks } = useSepayLinks();
  const unlinkMutation = useUnlinkSepayAccount();

  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  const { data: txData, isLoading: txLoading, isError: txIsError, refetch: refetchTx } = useTransactions({ walletId: id ?? undefined, startDate, endDate });
  const transactions = (txData ?? []) as Transaction[];

  const handleTxPress = useCallback((tx: Transaction) => {
    const mode = wallet?.type === 'basic' ? 'full' : 'category';
    router.push({ pathname: '/(tabs)/transactions/[id]', params: { id: tx.id, mode } });
  }, [wallet, router]);

  const isSyncing = sepaySyncMutation.isPending;
  const isDeleting = deleteWalletMutation.isPending;

  const handleEditPress = useCallback(() => {
    if (!id) return;
    router.push({ pathname: '/(tabs)/wallets/edit/[id]', params: { id } });
  }, [id, router]);

  const handleDeletePress = useCallback(() => {
    if (!id || isDeleting) return;
    Alert.alert(
      S.deleteTitle,
      `Bạn có chắc muốn xóa ví "${wallet?.name ?? ''}"? Hành động này không thể hoàn tác.`,
      [
        { text: S.deleteCancel, style: 'cancel' },
        {
          text: S.deleteConfirm,
          style: 'destructive',
          onPress: () => {
            deleteWalletMutation.mutate(id, {
              onSuccess: () => router.back(),
              onError: (err) => Alert.alert(S.deleteErrorTitle, getWalletDeleteErrorMessage(err)),
            });
          },
        },
      ],
    );
  }, [id, isDeleting, wallet, deleteWalletMutation, router]);

  const handleUnlink = useCallback(() => {
    if (!id || unlinkMutation.isPending) return;
    Alert.alert(S.unlinkTitle, S.unlinkMsg, [
      { text: S.unlinkCancel, style: 'cancel' },
      {
        text: S.unlinkConfirm,
        style: 'destructive',
        onPress: () => {
          unlinkMutation.mutate(id, {
            onSuccess: () => { refetch(); refetchTx(); },
            onError: (err) =>
              Alert.alert(S.unlinkErrorTitle, getApiErrorMessage(err, S.unlinkError)),
          });
        },
      },
    ]);
  }, [id, unlinkMutation, refetch, refetchTx]);

  const handleSync = useCallback(() => {
    if (!id || isSyncing) return;
    sepaySyncMutation.mutate(id, {
      onSuccess: (data) => {
        Alert.alert(
          S.syncSuccess,
          `Đã thêm ${data.transactionsCreated} giao dịch mới, cập nhật ${data.transactionsUpdated} giao dịch.`,
        );
        refetch();
        refetchTx();
      },
      onError: (err) => {
        Alert.alert('Lỗi đồng bộ', getApiErrorMessage(err, 'Không thể đồng bộ giao dịch.'));
      },
    });
  }, [id, isSyncing, sepaySyncMutation, refetch, refetchTx]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !wallet) return <ErrorState message={(error as Error)?.message ?? 'Không tìm thấy ví'} onRetry={refetch} />;

  const syncStatus = wallet.linkedMetadata?.syncStatus;
  const linkStatus = sepayLinks?.find((l) => l.walletId === id);
  const relinkRequired = wallet.type === 'linked' && linkStatus?.relinkRequired === true;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name={S.back} size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{wallet.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={handleEditPress}>
            <MaterialIcon name={S.edit} size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerBtn}
            onPress={handleDeletePress}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <MaterialIcon name={S.delete} size={22} color={colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetch(); refetchTx(); }} tintColor={colors.primary} />}>

        {/* Relink-required banner */}
        {relinkRequired && (
          <View style={styles.relinkBanner}>
            <MaterialIcon name="warning" size={18} color={colors.error} />
            <Text style={styles.relinkBannerText}>{S.relinkBanner}</Text>
          </View>
        )}

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{S.balance}</Text>
          <Text style={styles.balanceAmount}>{formatVND(wallet.balance)}</Text>
          <View style={styles.typeRow}>
            <MaterialIcon
              name={wallet.type === 'linked' ? 'account_balance' : 'account_balance_wallet'}
              size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.typeText}>
              {wallet.type === 'linked' ? S.linked : S.basic}
            </Text>
            {syncStatus && (
              <Text style={[styles.syncText, {
                color: syncStatus === 'active' ? colors.tertiary : syncStatus === 'error' ? colors.error : colors.onSurfaceVariant
              }]}>
                · {syncStatus === 'active' ? S.syncOk : syncStatus === 'error' ? S.syncError : S.syncing}
              </Text>
            )}
          </View>
          {wallet.type === 'linked' && (
            <Text style={styles.balanceNote}>{S.balanceSynced}</Text>
          )}
        </View>

        {/* Sync button for linked wallets */}
        {wallet.type === 'linked' && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <MaterialIcon name="sync" size={18} color={colors.onPrimary} />
            )}
            <Text style={styles.syncBtnText}>
              {isSyncing ? S.syncing : S.syncBtn}
            </Text>
          </TouchableOpacity>
        )}

        {/* Unlink button for linked wallets */}
        {wallet.type === 'linked' && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.unlinkBtn, unlinkMutation.isPending && styles.syncBtnDisabled]}
            onPress={handleUnlink}
            disabled={unlinkMutation.isPending}
          >
            {unlinkMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <MaterialIcon name="link_off" size={18} color={colors.error} />
            )}
            <Text style={styles.unlinkBtnText}>{S.unlinkBtn}</Text>
          </TouchableOpacity>
        )}

        {/* Transaction history */}
        <Text style={styles.sectionLabel}>{S.history}</Text>
        {txLoading ? (
          <LoadingSpinner />
        ) : txIsError ? (
          <ErrorState message="Không thể tải giao dịch" onRetry={refetchTx} />
        ) : transactions.length === 0 ? (
          <EmptyState icon="receipt_long" title={S.empty} />
        ) : (
          transactions.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx}
              walletName={wallet.name} onPress={() => handleTxPress(tx)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.primary, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[3] },
  balanceCard: {
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6], alignItems: 'center', gap: SPACING[2],
    borderWidth: 1, borderColor: colors.surfaceVariant,
  },
  balanceLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 },
  balanceAmount: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
  typeText: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
  // Dimmer than typeText so it reads as a footnote, not a second status line.
  balanceNote: { fontSize: FONT_SIZE.xs, color: colors.outline, textAlign: 'center' },
  syncText: { fontSize: FONT_SIZE.xs },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[3], paddingHorizontal: SPACING[5],
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onPrimary },
  unlinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], backgroundColor: 'transparent', borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: withAlpha(colors.error, 0.31),
    paddingVertical: SPACING[3], paddingHorizontal: SPACING[5],
  },
  unlinkBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.error },
  relinkBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: withAlpha(colors.error, 0.08), borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: withAlpha(colors.error, 0.19),
    padding: SPACING[3],
  },
  relinkBannerText: { flex: 1, fontSize: FONT_SIZE.xs, color: colors.error, lineHeight: 16 },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, paddingTop: SPACING[2] },
  });
}
