import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
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
  SHADOW,
} from '@/constants/theme';
import { useWalletById, useTransactions, useUpdateWallet, useDeleteWallet } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { formatVND } from '@/utils/formatters';
import type { WalletType } from '@/types/wallet';

const WALLET_ICON: Record<WalletType, string> = {
  cash: '💵',
  momo: '📱',
  bank_account: '🏦',
};

const WALLET_LABEL: Record<WalletType, string> = {
  cash: 'Tiền mặt',
  momo: 'Ví điện tử MoMo',
  bank_account: 'Tài khoản ngân hàng',
};

export default function WalletDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: wallet, isLoading } = useWalletById(id);
  const { data: transactions } = useTransactions(id ? { walletId: id } : undefined);
  const updateMutation = useUpdateWallet();
  const deleteMutation = useDeleteWallet();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');

  if (isLoading) return <LoadingSpinner />;
  if (!wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Không tìm thấy" />
        <EmptyState
          iconName="wallet-outline"
          title="Không tìm thấy ví"
          subtitle="Ví này có thể đã bị xóa."
        />
      </SafeAreaView>
    );
  }

  const txList = transactions ?? [];

  const handleEdit = () => {
    setEditName(wallet.name);
    setEditVisible(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim().length === 0) {
      Alert.alert('Tên ví không hợp lệ', 'Vui lòng nhập tên ví.');
      return;
    }
    if (!wallet) return;
    updateMutation.mutate(
      { id: wallet.id, patch: { name: editName.trim() } },
      {
        onSuccess: () => {
          setEditVisible(false);
          Alert.alert('Đã cập nhật', 'Tên ví đã được lưu.');
        },
        onError: () => Alert.alert('Lỗi', 'Không cập nhật được ví.'),
      },
    );
  };

  const handleDelete = () => {
    if (!wallet) return;
    if (wallet.isPrimary) {
      Alert.alert('Không thể xóa', 'Ví chính không thể xóa. Hãy đặt ví khác làm ví chính trước.');
      return;
    }
    Alert.alert(
      'Xóa ví?',
      `Bạn có chắc muốn xóa "${wallet.name}"? Lịch sử giao dịch sẽ vẫn được giữ lại.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(wallet.id, {
              onSuccess: () =>
                Alert.alert('Đã xóa', 'Ví đã được xóa.', [
                  { text: 'OK', onPress: () => router.back() },
                ]),
              onError: () => Alert.alert('Lỗi', 'Không xóa được ví.'),
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title={wallet.name} onEdit={handleEdit} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>{WALLET_ICON[wallet.type]}</Text>
          </View>
          <Text style={styles.heroLabel}>Số dư hiện tại</Text>
          <Text style={styles.heroAmount}>{formatVND(wallet.balance)}</Text>
          <Text style={styles.heroType}>{WALLET_LABEL[wallet.type]}</Text>
          {wallet.isPrimary ? (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>Ví chính</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            title="Chuyển tiền"
            variant="secondary"
            onPress={() => router.push('/(tabs)/wallet/transfer')}
            style={styles.actionBtn}
          />
          <Button
            title="Thêm giao dịch"
            onPress={() => router.push('/(tabs)/entry/manual')}
            style={styles.actionBtn}
          />
        </View>

        <View style={styles.txSection}>
          <Text style={styles.sectionTitle}>
            Giao dịch ({txList.length})
          </Text>
          {txList.length === 0 ? (
            <EmptyState
              iconName="receipt-outline"
              title="Chưa có giao dịch"
              subtitle="Các giao dịch của ví này sẽ xuất hiện ở đây."
            />
          ) : (
            txList.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onPress={() =>
                  router.push(
                    `/(tabs)/calendar/edit-entry?id=${tx.id}` as never,
                  )
                }
              />
            ))
          )}
        </View>

        <View style={styles.dangerSection}>
          <Button title="Xóa ví" variant="ghost" onPress={handleDelete} loading={deleteMutation.isPending} />
        </View>
      </ScrollView>

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setEditVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sửa tên ví</Text>
            <RNTextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.input}
              placeholder="Tên ví"
              autoFocus
            />
            <Button title="Lưu" onPress={handleSaveEdit} loading={updateMutation.isPending} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function Header({
  onBack,
  title,
  onEdit,
}: {
  onBack: () => void;
  title: string;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerBtnText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {onEdit ? (
        <TouchableOpacity style={styles.headerBtn} onPress={onEdit}>
          <Text style={styles.headerEdit}>Sửa</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: {
    width: 56,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { fontSize: 28, color: COLORS.gray[700] },
  headerEdit: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.semibold,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  hero: {
    margin: SPACING[5],
    padding: SPACING[6],
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    ...SHADOW.md,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  heroIcon: { fontSize: 36 },
  heroLabel: { fontSize: FONT_SIZE.sm, color: COLORS.gray[500], marginBottom: SPACING[1] },
  heroAmount: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    marginBottom: SPACING[1],
  },
  heroType: { fontSize: FONT_SIZE.xs, color: COLORS.gray[400] },
  primaryBadge: {
    marginTop: SPACING[3],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
  },
  primaryBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.brand[600],
  },

  actions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    gap: SPACING[3],
    marginBottom: SPACING[5],
  },
  actionBtn: { flex: 1 },

  txSection: { paddingHorizontal: SPACING[5], marginBottom: SPACING[5] },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },

  dangerSection: { paddingHorizontal: SPACING[5] },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    paddingBottom: SPACING[8],
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[300],
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[3],
  },
  input: {
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    paddingHorizontal: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
    marginBottom: SPACING[4],
    backgroundColor: COLORS.white,
  },
});
