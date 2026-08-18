import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useWallets } from '@/hooks/useWallets';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import type { Wallet } from '@/types/wallet';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Ví của tôi',
  totalLabel: 'Tổng tài sản',
  addWallet: 'Thêm ví mới',
  transfer: 'Chuyển quỹ giữa các ví',
  setBudget: 'Đặt ngân sách',
  syncOk: 'Đã đồng bộ',
  syncError: 'Lỗi kết nối',
  syncing: 'Đang đồng bộ',
  typeBasic: 'Ví cơ bản',
  typeLinked: 'Liên kết ngân hàng',
  addSheetTitle: 'Thêm ví mới',
  addSheetHint: 'Chọn loại ví bạn muốn thêm để theo dõi thu chi hiệu quả hơn.',
  optionBasic: 'Ví cơ bản',
  optionLinked: 'Liên kết ngân hàng',
  optionSepay: 'SePay',
  comingSoon: 'Sắp ra mắt',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function walletIcon(wallet: Wallet): string {
  if (wallet.type === 'linked') return 'account_balance';
  if (wallet.name.toLowerCase().includes('tiền mặt') || wallet.name.toLowerCase().includes('cash')) return 'payments';
  return 'account_balance_wallet';
}

function syncStatusColor(colors: ThemeColors, status: 'active' | 'error' | 'pending'): string {
  if (status === 'active') return colors.tertiary;
  if (status === 'error') return colors.error;
  return colors.onSurfaceVariant;
}

function syncStatusIcon(status: 'active' | 'error' | 'pending'): string {
  if (status === 'active') return 'sync';
  if (status === 'error') return 'error';
  return 'sync';
}

function syncStatusLabel(status: 'active' | 'error' | 'pending'): string {
  if (status === 'active') return S.syncOk;
  if (status === 'error') return S.syncError;
  return S.syncing;
}

// ─── Add Wallet Sheet ─────────────────────────────────────────────────────────

function AddWalletSheet({
  visible,
  onClose,
  onSelectBasic,
  onSelectSepay,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectBasic: () => void;
  onSelectSepay: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{S.addSheetTitle}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.sheetCloseBtn}
          accessibilityRole="button" accessibilityLabel="Đóng">
          <MaterialIcon name="close" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
      <View style={styles.sheetOptions}>
        <TouchableOpacity activeOpacity={0.7} style={styles.optionActive} onPress={onSelectBasic}>
          <MaterialIcon name="account_balance_wallet" size={32} color={colors.primary} />
          <Text style={styles.optionLabelActive}>{S.optionBasic}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.optionActive} onPress={onSelectSepay}>
          <MaterialIcon name="account_balance" size={32} color={colors.primary} />
          <Text style={styles.optionLabelActive}>{S.optionSepay}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sheetHint}>{S.addSheetHint}</Text>
    </DraggableSheet>
  );
}

// ─── Wallet Card ──────────────────────────────────────────────────────────────

function WalletCard({
  wallet,
  onPress,
  onSetBudget,
}: {
  wallet: Wallet;
  onPress: () => void;
  onSetBudget: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isLinked = wallet.type === 'linked';
  const syncStatus = wallet.linkedMetadata?.syncStatus;
  const isError = syncStatus === 'error';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.walletCard, isError && styles.walletCardError]}
      onPress={onPress}
    >
      <View style={styles.walletIconWrap}>
        <MaterialIcon
          name={walletIcon(wallet)}
          size={22}
          color={isError ? colors.error : isLinked ? colors.info : colors.tertiary}
        />
      </View>
      <View style={styles.walletInfo}>
        <Text style={styles.walletName} numberOfLines={1}>{wallet.name}</Text>
        {isLinked && syncStatus ? (
          <View style={styles.syncRow}>
            <MaterialIcon
              name={syncStatusIcon(syncStatus)}
              size={12}
              color={syncStatusColor(colors, syncStatus)}
            />
            <Text style={[styles.syncLabel, { color: syncStatusColor(colors, syncStatus) }]}>
              {syncStatusLabel(syncStatus)}
            </Text>
          </View>
        ) : (
          <Text style={styles.walletType}>{isLinked ? S.typeLinked : S.typeBasic}</Text>
        )}
      </View>
      <View style={styles.walletRight}>
        <Text style={[styles.walletBalance, isError && { color: colors.error }]}>
          {formatVND(wallet.balance)}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.setBudgetBtn}
          onPress={onSetBudget}
        >
          <Text style={styles.setBudgetText}>{S.setBudget}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WalletsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, isLoading, isError, error, refetch } = useWallets();
  const [sheetVisible, setSheetVisible] = useState(false);

  const wallets = (data as any)?.wallets ?? (Array.isArray(data) ? data : []) as Wallet[];
  const totalBalance = wallets.reduce((s: number, w: Wallet) => s + w.balance, 0);

  const handleWalletPress = useCallback((wallet: Wallet) => {
    router.push({ pathname: '/(tabs)/wallets/[id]', params: { id: wallet.id } });
  }, [router]);

  const handleSetBudget = useCallback(() => {
    router.push({ pathname: '/(tabs)/budgets' });
  }, [router]);

  const handleAddBasic = useCallback(() => {
    setSheetVisible(false);
    router.push({ pathname: '/(tabs)/wallets/create' });
  }, [router]);

  const handleAddSepay = useCallback(() => {
    setSheetVisible(false);
    // Token flow is the active path (personal SePay API token). The OAuth2 flow at
    // /link-sepay stays available for future multi-user linking.
    router.push('/link-sepay-token');
  }, [router]);

  const handleTransfer = useCallback(() => {
    router.push({ pathname: '/(tabs)/wallets/transfer' });
  }, [router]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.addBtn}
          onPress={() => setSheetVisible(true)}
        >
          <MaterialIcon name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Total balance card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{S.totalLabel}</Text>
          <Text style={styles.totalAmount}>{formatVND(totalBalance)}</Text>
        </View>

        {/* Wallet list */}
        <View style={styles.walletList}>
          {wallets.map((wallet: Wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onPress={() => handleWalletPress(wallet)}
              onSetBudget={handleSetBudget}
            />
          ))}
        </View>

        {/* Internal transfer */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.transferBtn}
          onPress={handleTransfer}
        >
          <MaterialIcon name="swap_horiz" size={20} color={colors.primary} />
          <Text style={styles.transferText}>{S.transfer}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add wallet sheet */}
      <AddWalletSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelectBasic={handleAddBasic}
        onSelectSepay={handleAddSepay}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[12],
    gap: SPACING[3],
  },
  totalCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
    gap: SPACING[1],
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  totalLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalAmount: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
  },
  walletList: {
    gap: SPACING[2],
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    minHeight: 48,
  },
  walletCardError: {
    borderColor: withAlpha(colors.errorContainer, 0.5),
  },
  walletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  walletInfo: {
    flex: 1,
    minWidth: 0,
  },
  walletName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  walletType: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  syncLabel: {
    fontSize: 11,
  },
  walletRight: {
    alignItems: 'flex-end',
    gap: SPACING[1],
    flexShrink: 0,
  },
  walletBalance: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  setBudgetBtn: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.4),
  },
  setBudgetText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: colors.surfaceVariant,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING[4],
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minHeight: 56,
  },
  transferText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Sheet
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  sheetTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  optionActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    padding: SPACING[6],
    backgroundColor: withAlpha(colors.primaryContainer, 0.13),
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: BORDER_RADIUS.xl,
  },
  optionInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    padding: SPACING[6],
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.transparent,
    borderRadius: BORDER_RADIUS.xl,
  },
  optionLabelActive: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  optionLabelInactive: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  sheetHint: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  });
}
