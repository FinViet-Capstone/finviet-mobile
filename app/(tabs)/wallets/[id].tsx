import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useWalletById } from '@/hooks/useWallets';
import { useTransactions } from '@/hooks';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import type { Transaction } from '@/types';

const S = {
  back: 'arrow_back',
  edit: 'edit',
  basic: 'Ví cơ bản',
  linked: 'Ví liên kết',
  balance: 'Số dư',
  history: 'LỊCH SỬ GIAO DỊCH',
  empty: 'Chưa có giao dịch nào',
  syncOk: 'Đã đồng bộ',
  syncError: 'Lỗi kết nối',
  syncing: 'Đang đồng bộ',
};

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: wallet, isLoading, isError, error, refetch } = useWalletById(id);

  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  const { data: txData, isLoading: txLoading, isError: txIsError, refetch: refetchTx } = useTransactions({ walletId: id ?? undefined, startDate, endDate });
  const transactions = (txData ?? []) as Transaction[];

  const handleTxPress = useCallback((tx: Transaction) => {
    const mode = wallet?.type === 'basic' ? 'full' : 'category';
    router.push({ pathname: '/(tabs)/transactions/[id]', params: { id: tx.id, mode } });
  }, [wallet, router]);

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
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn}>
          <MaterialIcon name={S.edit} size={22} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
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
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, paddingTop: SPACING[2] },
});
