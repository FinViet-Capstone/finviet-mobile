import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useWallets, useCreateTransfer } from '@/hooks/useWallets';
import type { Wallet } from '@/types/wallet';

const S = {
  title: 'Chuyển khoản',
  fromLabel: 'Từ ví',
  toLabel: 'Đến ví',
  amountLabel: 'Số tiền',
  amountPlaceholder: 'Nhập số tiền',
  noteLabel: 'Ghi chú (tuỳ chọn)',
  notePlaceholder: 'VD: Chuyển tiền tiết kiệm',
  confirm: 'Xác nhận chuyển',
  cancel: 'Huỷ',
  selectWallet: 'Chọn ví',
  balance: (n: number) => `Số dư: ${n.toLocaleString('vi-VN')}đ`,
  sameWalletError: 'Không thể chuyển cùng một ví',
};

export default function TransferScreen() {
  const router = useRouter();
  const { data: walletsData, isLoading, isError, error, refetch } = useWallets();
  const createTransfer = useCreateTransfer();

  const wallets = (walletsData as any)?.wallets ?? (Array.isArray(walletsData) ? walletsData : []) as Wallet[];

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const fromWallet = wallets.find((w: Wallet) => w.id === fromId) ?? null;
  const toWallet = wallets.find((w: Wallet) => w.id === toId) ?? null;

  const formatAmount = (v: string) => {
    const digits = v.replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('vi-VN') : '';
  };

  const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isValid = fromId && toId && fromId !== toId && parsedAmount > 0;

  const handleConfirm = useCallback(async () => {
    if (!fromId || !toId || !parsedAmount) return;
    await createTransfer.mutateAsync({
      fromWalletId: fromId,
      toWalletId: toId,
      amount: parsedAmount,
      note: note.trim() || undefined,
    });
    router.back();
  }, [fromId, toId, parsedAmount, note, createTransfer, router]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcon name="arrow_back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* From wallet */}
          <Text style={styles.fieldLabel}>{S.fromLabel}</Text>
          <View style={styles.walletGrid}>
            {wallets.map((w: Wallet) => (
              <TouchableOpacity key={w.id} activeOpacity={0.7}
                style={[styles.walletOption, fromId === w.id && styles.walletOptionActive,
                  toId === w.id && styles.walletOptionDisabled]}
                onPress={() => setFromId(w.id)}
                disabled={toId === w.id}>
                <MaterialIcon name="account_balance_wallet" size={18}
                  color={fromId === w.id ? COLORS.primary : COLORS.onSurfaceVariant} />
                <Text style={[styles.walletOptionName, fromId === w.id && { color: COLORS.primary }]}
                  numberOfLines={1}>{w.name}</Text>
                <Text style={styles.walletOptionBalance}>{S.balance(w.balance)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* To wallet */}
          <Text style={styles.fieldLabel}>{S.toLabel}</Text>
          <View style={styles.walletGrid}>
            {wallets.map((w: Wallet) => (
              <TouchableOpacity key={w.id} activeOpacity={0.7}
                style={[styles.walletOption, toId === w.id && styles.walletOptionActive,
                  fromId === w.id && styles.walletOptionDisabled]}
                onPress={() => setToId(w.id)}
                disabled={fromId === w.id}>
                <MaterialIcon name="account_balance_wallet" size={18}
                  color={toId === w.id ? COLORS.tertiary : COLORS.onSurfaceVariant} />
                <Text style={[styles.walletOptionName, toId === w.id && { color: COLORS.tertiary }]}
                  numberOfLines={1}>{w.name}</Text>
                <Text style={styles.walletOptionBalance}>{S.balance(w.balance)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transfer arrow indicator */}
          {fromWallet && toWallet && (
            <View style={styles.transferIndicator}>
              <Text style={styles.transferFrom} numberOfLines={1}>{fromWallet.name}</Text>
              <MaterialIcon name="arrow_forward" size={20} color={COLORS.primary} />
              <Text style={styles.transferTo} numberOfLines={1}>{toWallet.name}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>{S.amountLabel}</Text>
          <TextInput style={styles.fieldInput} value={amount} keyboardType="numeric"
            onChangeText={(v) => setAmount(formatAmount(v))}
            placeholder={S.amountPlaceholder} placeholderTextColor={COLORS.onSurfaceVariant} />

          <Text style={styles.fieldLabel}>{S.noteLabel}</Text>
          <TextInput style={styles.fieldInput} value={note} onChangeText={setNote}
            placeholder={S.notePlaceholder} placeholderTextColor={COLORS.onSurfaceVariant} />

          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[styles.confirmBtn, (!isValid || createTransfer.isPending) && styles.confirmBtnDisabled]}
              onPress={handleConfirm} disabled={!isValid || createTransfer.isPending}>
              {createTransfer.isPending
                ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
                : <Text style={styles.confirmText}>{S.confirm}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[4] },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, marginBottom: SPACING[1] },
  walletGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  walletOption: { flex: 1, minWidth: 120, padding: SPACING[3], borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surfaceContainer, borderWidth: 1, borderColor: COLORS.outlineVariant, gap: SPACING[1] },
  walletOptionActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  walletOptionDisabled: { opacity: 0.4 },
  walletOptionName: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  walletOptionBalance: { fontSize: 10, color: COLORS.onSurfaceVariant },
  transferIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[3], backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg, padding: SPACING[3] },
  transferFrom: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface, flex: 1, textAlign: 'right' },
  transferTo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.tertiary, flex: 1 },
  fieldInput: { backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, paddingHorizontal: SPACING[4], height: 48, fontSize: FONT_SIZE.sm, color: COLORS.onSurface },
  actions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[4] },
  cancelBtn: { flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  confirmBtn: { flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
});
