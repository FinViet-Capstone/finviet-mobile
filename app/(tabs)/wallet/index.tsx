import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
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
import { useWallets } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatVND } from '@/utils/formatters';
import type { Wallet, WalletType } from '@/types/wallet';

const WALLET_ICON: Record<WalletType, string> = {
  basic: '💵',
  linked: '🔗',
  goal: '🎯',
};

const WALLET_LABEL: Record<WalletType, string> = {
  basic: 'Ví cơ bản',
  linked: 'Ví liên kết',
  goal: 'Ví mục tiêu',
};

export default function WalletListScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useWallets();

  if (isLoading || !data) return <LoadingSpinner />;

  const { wallets, totalBalance } = data;
  const visibleWallets = wallets.filter((w) => !w.isDeleted);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ví của tôi</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/wallet/transfer')}
            style={styles.transferBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.transferIcon}>⇄</Text>
          </TouchableOpacity>
        </View>

        {/* Total balance card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng số dư</Text>
          <Text style={styles.totalAmount}>{formatVND(totalBalance)}</Text>
          <Text style={styles.totalHint}>
            {visibleWallets.length} ví đang hoạt động
          </Text>
        </View>

        {/* Wallet list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách ví</Text>

          {visibleWallets.map((wallet: Wallet) => (
            <TouchableOpacity
              key={wallet.id}
              style={styles.walletCard}
              onPress={() => router.push(`/(tabs)/wallet/${wallet.id}` as never)}
              activeOpacity={0.85}
            >
              <View style={styles.walletIconWrap}>
                <Text style={styles.walletIcon}>
                  {WALLET_ICON[wallet.type]}
                </Text>
              </View>
              <View style={styles.walletMain}>
                <View style={styles.walletNameRow}>
                  <Text style={styles.walletName}>{wallet.name}</Text>
                  {wallet.isPrimary ? (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Chính</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.walletType}>{WALLET_LABEL[wallet.type]}</Text>
              </View>
              <View style={styles.walletRight}>
                <Text style={styles.walletBalance}>
                  {formatVND(wallet.balance)}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add wallet card */}
          <TouchableOpacity
            style={styles.addCard}
            onPress={() => router.push('/(tabs)/wallet/create')}
            activeOpacity={0.75}
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addLabel}>Thêm ví mới</Text>
          </TouchableOpacity>
        </View>

        {/* Goals shortcut */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.goalsCard}
            onPress={() => router.push('/(tabs)/wallet/goals')}
            activeOpacity={0.85}
          >
            <View style={styles.goalsIconWrap}>
              <Text style={styles.goalsIcon}>🎯</Text>
            </View>
            <View style={styles.goalsText}>
              <Text style={styles.goalsTitle}>Mục tiêu tiết kiệm</Text>
              <Text style={styles.goalsSubtitle}>
                Theo dõi tiến độ các mục tiêu của bạn
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  transferBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.bold,
  },

  totalCard: {
    margin: SPACING[5],
    padding: SPACING[6],
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS['2xl'],
    ...SHADOW.lg,
  },
  totalLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING[2],
  },
  totalAmount: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[2],
  },
  totalHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand[100],
  },

  section: {
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },

  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  walletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  walletIcon: { fontSize: 24 },
  walletMain: { flex: 1 },
  walletNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  walletName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  primaryBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.brand[50],
  },
  primaryBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.brand[600],
  },
  walletType: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  walletRight: { alignItems: 'flex-end' },
  walletBalance: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.gray[300],
    marginLeft: SPACING[1],
  },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.brand[200],
    borderStyle: 'dashed',
    backgroundColor: COLORS.white,
    gap: SPACING[2],
  },
  addIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.bold,
  },
  addLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.brand[500],
  },

  goalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand[500],
    ...SHADOW.sm,
  },
  goalsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  goalsIcon: { fontSize: 24 },
  goalsText: { flex: 1 },
  goalsTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  goalsSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
});
