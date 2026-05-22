import React, { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWallets, useCreateTransfer } from '@/hooks';
import { formatVND } from '@/utils/formatters';
import type { Wallet, WalletType } from '@/types/wallet';

const WALLET_ICON: Record<WalletType, string> = {
  cash: '💵',
  momo: '📱',
  bank_account: '🏦',
};

export default function TransferScreen() {
  const router = useRouter();
  const { data, isLoading } = useWallets();
  const transferMutation = useCreateTransfer();

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amountRaw, setAmountRaw] = useState('');
  const [description, setDescription] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const wallets: Wallet[] = useMemo(() => data?.wallets ?? [], [data]);

  if (isLoading || !data) return <LoadingSpinner />;

  const fromWallet = wallets.find((w) => w.id === fromId) ?? null;
  const toWallet = wallets.find((w) => w.id === toId) ?? null;
  const amount = parseInt(amountRaw, 10) || 0;

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
    setError(undefined);
  };

  const handleSubmit = () => {
    setError(undefined);
    if (!fromWallet || !toWallet) {
      setError('Vui lòng chọn cả ví nguồn và ví đích.');
      return;
    }
    if (fromWallet.id === toWallet.id) {
      setError('Ví nguồn và ví đích phải khác nhau.');
      return;
    }
    if (amount <= 0) {
      setError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (amount > fromWallet.balance) {
      setError(`Số dư ${fromWallet.name} không đủ.`);
      return;
    }
    transferMutation.mutate(
      {
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount,
        note: description.trim() || null,
      },
      {
        onSuccess: () =>
          Alert.alert(
            'Chuyển khoản thành công',
            `${formatVND(amount)} từ ${fromWallet.name} → ${toWallet.name}`,
            [{ text: 'OK', onPress: () => router.back() }],
          ),
        onError: () => setError('Không thực hiện được giao dịch. Hãy thử lại.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chuyển tiền</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* From */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Từ ví</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowFrom(true)}
              activeOpacity={0.75}
            >
              {fromWallet ? (
                <WalletPreview wallet={fromWallet} />
              ) : (
                <Text style={styles.placeholder}>Chọn ví nguồn</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Swap */}
          <View style={styles.swapRow}>
            <View style={styles.swapLine} />
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={handleSwap}
              activeOpacity={0.75}
            >
              <Text style={styles.swapIcon}>⇅</Text>
            </TouchableOpacity>
            <View style={styles.swapLine} />
          </View>

          {/* To */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Đến ví</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowTo(true)}
              activeOpacity={0.75}
            >
              {toWallet ? (
                <WalletPreview wallet={toWallet} />
              ) : (
                <Text style={styles.placeholder}>Chọn ví đích</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.card}>
            <TextInput
              label="Số tiền"
              value={amountRaw}
              onChangeText={(t) => setAmountRaw(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              autoFocus
              containerStyle={styles.field}
            />
            <Text style={styles.amountPreview}>{formatVND(amount)}</Text>
          </View>

          {/* Description (optional) */}
          <View style={styles.card}>
            <TextInput
              label="Ghi chú (tùy chọn)"
              value={description}
              onChangeText={setDescription}
              placeholder="VD: Chuyển trả ví ăn uống"
            />
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.note}>
            Hệ thống sẽ tự tạo 2 giao dịch (chuyển ra + chuyển vào) liên kết với nhau và không tính vào tổng chi tiêu.
          </Text>

          <Button
            title="Xác nhận chuyển"
            onPress={handleSubmit}
            loading={transferMutation.isPending}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={showFrom}
        title="Chọn ví nguồn"
        wallets={wallets}
        selectedId={fromId}
        onSelect={(id) => {
          setFromId(id);
          setShowFrom(false);
        }}
        onClose={() => setShowFrom(false)}
      />
      <PickerModal
        visible={showTo}
        title="Chọn ví đích"
        wallets={wallets}
        selectedId={toId}
        onSelect={(id) => {
          setToId(id);
          setShowTo(false);
        }}
        onClose={() => setShowTo(false)}
      />
    </SafeAreaView>
  );
}

function WalletPreview({ wallet }: { wallet: Wallet }) {
  return (
    <View style={styles.walletPreview}>
      <Text style={styles.walletIcon}>{WALLET_ICON[wallet.type]}</Text>
      <View style={styles.walletPreviewText}>
        <Text style={styles.walletName}>{wallet.name}</Text>
        <Text style={styles.walletBalance}>{formatVND(wallet.balance)}</Text>
      </View>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  wallets,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  wallets: Wallet[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <FlatList
            data={wallets}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listRow,
                  selectedId === item.id && styles.listRowSelected,
                ]}
                onPress={() => onSelect(item.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.walletIcon}>{WALLET_ICON[item.type]}</Text>
                <View style={styles.listMain}>
                  <Text style={styles.walletName}>{item.name}</Text>
                  <Text style={styles.walletBalance}>{formatVND(item.balance)}</Text>
                </View>
                {selectedId === item.id ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  kav: { flex: 1 },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  field: { marginBottom: SPACING[2] },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    minHeight: 60,
  },
  placeholder: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[400] },
  chevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[400], marginLeft: SPACING[2] },

  walletPreview: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING[3] },
  walletIcon: { fontSize: 22 },
  walletPreviewText: { flex: 1 },
  walletName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.gray[900] },
  walletBalance: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },

  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
  },
  swapLine: { flex: 1, height: 1, backgroundColor: COLORS.gray[200] },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING[3],
  },
  swapIcon: { fontSize: FONT_SIZE.xl, color: COLORS.brand[500], fontWeight: FONT_WEIGHT.bold },

  amountPreview: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
    marginTop: SPACING[2],
  },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.danger },

  note: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    marginBottom: SPACING[4],
    paddingHorizontal: SPACING[2],
  },
  submit: { marginTop: SPACING[2] },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[5],
    maxHeight: '72%',
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
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING[3],
  },
  listRowSelected: {
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
  },
  listMain: { flex: 1 },
  checkmark: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
});
