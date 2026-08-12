import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { isAxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useWalletById, useUpdateWallet } from '@/hooks/useWallets';
import { formatVND } from '@/utils/formatters';

const S = {
  title: 'Sửa ví',
  nameLabel: 'Tên ví',
  namePlaceholder: 'VD: Tiền mặt, Vietcombank',
  typeLabel: 'Loại ví',
  typeLocked: 'Loại ví không thể thay đổi sau khi tạo',
  balanceLabel: 'Số dư hiện tại',
  balanceLocked: 'Số dư thay đổi theo giao dịch, không sửa trực tiếp',
  typeBasic: 'Ví cơ bản',
  typeLinked: 'Ví liên kết',
  save: 'Lưu thay đổi',
  cancel: 'Huỷ',
  notFound: 'Không tìm thấy ví',
  errorTitle: 'Không thể cập nhật ví',
};

/**
 * WalletService.UpdateWalletAsync raises these as a plain ValidationException,
 * which the backend returns as a 400 carrying only an English `message` — there
 * is no machine-readable code to key off, so match the text.
 */
const UPDATE_ERROR_MESSAGES: { match: RegExp; message: string }[] = [
  { match: /already exists/i, message: 'Tên ví này đã tồn tại. Hãy chọn tên khác.' },
  { match: /cannot be empty/i, message: 'Tên ví không được để trống.' },
  { match: /type cannot be changed/i, message: S.typeLocked },
];

function getUpdateErrorMessage(err: unknown): string {
  const raw = isAxiosError(err)
    ? (err.response?.data as { message?: string } | undefined)?.message
    : undefined;
  const hit = raw ? UPDATE_ERROR_MESSAGES.find((e) => e.match.test(raw)) : undefined;
  return hit?.message ?? 'Không thể cập nhật ví. Vui lòng thử lại.';
}

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: wallet, isLoading, isError, error, refetch } = useWalletById(id);
  const updateWallet = useUpdateWallet();

  const [name, setName] = useState<string | null>(null);
  // The field starts as the fetched name and is only "owned" by the input once
  // the user types, so a refetch landing mid-edit cannot clobber their input.
  const currentName = name ?? wallet?.name ?? '';

  const trimmed = currentName.trim();
  const isUnchanged = trimmed === (wallet?.name ?? '');
  const canSave = trimmed.length > 0 && !isUnchanged && !updateWallet.isPending;

  const handleSave = () => {
    if (!id || !canSave) return;
    // Only the name is sent: the backend rejects any walletType in the patch.
    updateWallet.mutate(
      { id, patch: { name: trimmed } },
      {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert(S.errorTitle, getUpdateErrorMessage(err)),
      },
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !wallet) {
    return <ErrorState message={(error as Error)?.message ?? S.notFound} onRetry={refetch} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name="arrow_back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.fieldLabel}>{S.nameLabel}</Text>
        <TextInput
          style={styles.fieldInput}
          value={currentName}
          onChangeText={setName}
          placeholder={S.namePlaceholder}
          placeholderTextColor={COLORS.onSurfaceVariant}
          autoFocus
        />

        {/* Type and balance are read-only: the backend PATCH accepts a name only. */}
        <View>
          <Text style={styles.fieldLabel}>{S.typeLabel}</Text>
          <View style={styles.readonlyRow}>
            <MaterialIcon
              name={wallet.type === 'linked' ? 'account_balance' : 'account_balance_wallet'}
              size={18} color={COLORS.onSurfaceVariant} />
            <Text style={styles.readonlyText}>
              {wallet.type === 'linked' ? S.typeLinked : S.typeBasic}
            </Text>
            <MaterialIcon name="lock" size={16} color={COLORS.onSurfaceVariant} />
          </View>
          <Text style={styles.hint}>{S.typeLocked}</Text>
        </View>

        <View>
          <Text style={styles.fieldLabel}>{S.balanceLabel}</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyAmount}>{formatVND(wallet.balance)}</Text>
          </View>
          <Text style={styles.hint}>{S.balanceLocked}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {updateWallet.isPending ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.saveText}>{S.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  fieldInput: { backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, paddingHorizontal: SPACING[4], height: 48, fontSize: FONT_SIZE.sm, color: COLORS.onSurface },
  readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING[4], height: 48 },
  readonlyText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  readonlyAmount: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginTop: SPACING[1] },
  actions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[4] },
  cancelBtn: { flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  saveBtn: { flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
});
