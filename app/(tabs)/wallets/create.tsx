import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { useCreateWallet } from '@/hooks/useWallets';

const S = {
  title: 'Thêm ví mới',
  nameLabel: 'Tên ví',
  namePlaceholder: 'VD: Tiền mặt, Vietcombank',
  balanceLabel: 'Số dư ban đầu',
  balancePlaceholder: '0',
  save: 'Tạo ví',
  cancel: 'Huỷ',
  primaryLabel: 'Đặt làm ví chính',
  comingSoon: 'Sắp ra mắt',
  typeBasic: 'Ví cơ bản',
  typeLinked: 'Liên kết ngân hàng',
};

export default function CreateWalletScreen() {
  const router = useRouter();
  const createWallet = useCreateWallet();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const formatBalance = (v: string) => {
    const digits = v.replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('vi-VN') : '';
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const initialBalance = parseInt(balance.replace(/\D/g, ''), 10) || 0;
    await createWallet.mutateAsync({ name: name.trim(), type: 'basic', balance: parseInt(balance.replace(/\D/g, ''), 10) || 0, isPrimary });
    router.back();
  };

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

          {/* Type selector — only basic active */}
          <View style={styles.typeRow}>
            <View style={[styles.typeCard, styles.typeCardActive]}>
              <MaterialIcon name="account_balance_wallet" size={28} color={COLORS.primary} />
              <Text style={styles.typeActiveText}>{S.typeBasic}</Text>
            </View>
            <View style={styles.typeCard}>
              <MaterialIcon name="account_balance" size={28} color={COLORS.onSurfaceVariant} />
              <Text style={styles.typeInactiveText}>{S.typeLinked}</Text>
              <Text style={styles.comingSoon}>{S.comingSoon}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>{S.nameLabel}</Text>
          <TextInput style={styles.fieldInput} value={name} onChangeText={setName}
            placeholder={S.namePlaceholder} placeholderTextColor={COLORS.onSurfaceVariant} autoFocus />

          <Text style={styles.fieldLabel}>{S.balanceLabel}</Text>
          <TextInput style={styles.fieldInput} value={balance} keyboardType="numeric"
            onChangeText={(v) => setBalance(formatBalance(v))}
            placeholder={S.balancePlaceholder} placeholderTextColor={COLORS.onSurfaceVariant} />

          <TouchableOpacity activeOpacity={0.7} style={styles.primaryRow} onPress={() => setIsPrimary((v) => !v)}>
            <MaterialIcon name={isPrimary ? 'check_box' : 'check_box_outline_blank'} size={22} color={isPrimary ? COLORS.primary : COLORS.onSurfaceVariant} />
            <Text style={styles.primaryLabel}>{S.primaryLabel}</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[styles.saveBtn, (!name.trim() || createWallet.isPending) && styles.saveBtnDisabled]}
              onPress={handleSave} disabled={!name.trim() || createWallet.isPending}>
              <Text style={styles.saveText}>{S.save}</Text>
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
  typeRow: { flexDirection: 'row', gap: SPACING[3] },
  typeCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[2], padding: SPACING[4], borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.surfaceVariant, borderWidth: 1, borderColor: 'transparent' },
  typeCardActive: { backgroundColor: `${COLORS.primaryContainer}20`, borderColor: COLORS.primary },
  typeActiveText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary, textAlign: 'center' },
  typeInactiveText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  comingSoon: { fontSize: 10, color: COLORS.onSurfaceVariant },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, marginBottom: SPACING[1] },
  fieldInput: { backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, paddingHorizontal: SPACING[4], height: 48, fontSize: FONT_SIZE.sm, color: COLORS.onSurface },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingVertical: SPACING[2] },
  primaryLabel: { fontSize: FONT_SIZE.sm, color: COLORS.onSurface },
  actions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[4] },
  cancelBtn: { flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  saveBtn: { flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
});
