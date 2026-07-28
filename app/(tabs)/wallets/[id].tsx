import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { isAxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useWalletById, useSyncSepayWallet, useDeleteWallet } from '@/hooks/useWallets';
import { useTransactions } from '@/hooks';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import type { Transaction } from '@/types';

const S = {
  back: 'arrow_back',
  edit: 'edit',
  delete: 'delete',
  basic: 'Ví cơ bản',
  linked: 'Ví liên kết',
  balance: 'Số dư',
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
};

/** Codes WalletService.DeleteWalletAsync throws as a 422 BusinessRuleException. */
const WALLET_DELETE_ERROR_MESSAGES: Record<string, string> = {
  wallet_has_transactions: 'Ví này đã có giao dịch nên không thể xóa.',
  last_wallet: 'Không thể xóa ví duy nhất còn lại của bạn.',
};

function getWalletDeleteErrorMessage(err: unknown): string {
  const code = isAxiosError(err)
    ? (err.response?.data as { code?: string } | undefined)?.code
    : undefined;
  return (code && WALLET_DELETE_ERROR_MESSAGES[code]) || 'Không thể xóa ví. Vui lòng thử lại.';
}

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: wallet, isLoading, isError, error, refetch } = useWalletById(id);
  const sepaySyncMutation = useSyncSepayWallet();
  const deleteWalletMutation = useDeleteWallet();

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
      onError: (err: any) => {
        Alert.alert('Lỗi đồng bộ', err?.message ?? 'Không thể đồng bộ giao dịch.');
      },
    });
  }, [id, isSyncing, sepaySyncMutation, refetch, refetchTx]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !wallet) return <ErrorState message={(error as Error)?.message ?? 'Không tìm thấy ví'} onRetry={refetch} />;

  const syncStatus = wallet.linkedMetadata?.syncStatus;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcon name={S.back} size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{wallet.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn}>
            <MaterialIcon name={S.edit} size={22} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerBtn}
            onPress={handleDeletePress}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <MaterialIcon name={S.delete} size={22} color={COLORS.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetch(); refetchTx(); }} tintColor={COLORS.primary} />}>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{S.balance}</Text>
          <Text style={styles.balanceAmount}>{formatVND(wallet.balance)}</Text>
          <View style={styles.typeRow}>
            <MaterialIcon
              name={wallet.type === 'linked' ? 'account_balance' : 'account_balance_wallet'}
              size={14} color={COLORS.onSurfaceVariant} />
            <Text style={styles.typeText}>
              {wallet.type === 'linked' ? S.linked : S.basic}
            </Text>
            {syncStatus && (
              <Text style={[styles.syncText, {
                color: syncStatus === 'active' ? COLORS.tertiary : syncStatus === 'error' ? COLORS.error : COLORS.onSurfaceVariant
              }]}>
                · {syncStatus === 'active' ? S.syncOk : syncStatus === 'error' ? S.syncError : S.syncing}
              </Text>
            )}
          </View>
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
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <MaterialIcon name="sync" size={18} color={COLORS.onPrimary} />
            )}
            <Text style={styles.syncBtnText}>
              {isSyncing ? S.syncing : S.syncBtn}
            </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[3] },
  balanceCard: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6], alignItems: 'center', gap: SPACING[2],
    borderWidth: 1, borderColor: COLORS.surfaceVariant,
  },
  balanceLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 },
  balanceAmount: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
  typeText: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  syncText: { fontSize: FONT_SIZE.xs },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[3], paddingHorizontal: SPACING[5],
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onPrimary },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, paddingTop: SPACING[2] },
});
