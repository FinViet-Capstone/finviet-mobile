import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
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
import { useCreateWallet } from '@/hooks';
import type { WalletType } from '@/types/wallet';

const WALLET_TYPE_OPTIONS: { type: WalletType; icon: string; label: string }[] = [
  { type: 'cash', icon: '💵', label: 'Tiền mặt' },
  { type: 'momo', icon: '📱', label: 'MoMo' },
  { type: 'bank_account', icon: '🏦', label: 'Ngân hàng' },
];

export default function CreateWalletScreen() {
  const router = useRouter();
  const createMutation = useCreateWallet();
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [balance, setBalance] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleCreate = () => {
    if (name.trim().length === 0) {
      Alert.alert('Tên ví không hợp lệ', 'Vui lòng nhập tên ví.');
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        type,
        balance: parseInt(balance, 10) || 0,
        isPrimary,
      },
      {
        onSuccess: (wallet) =>
          Alert.alert('Đã tạo ví', `Ví "${wallet.name}" đã được tạo.`, [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () =>
          Alert.alert('Không tạo được ví', 'Hãy thử lại sau.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo ví mới</Text>
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
          <View style={styles.card}>
            <TextInput
              label="Tên ví"
              value={name}
              onChangeText={setName}
              placeholder="VD: Tiền tiêu vặt"
              autoCapitalize="words"
              containerStyle={styles.field}
            />

            <Text style={styles.fieldLabel}>Loại ví</Text>
            <View style={styles.typeRow}>
              {WALLET_TYPE_OPTIONS.map((opt) => {
                const selected = type === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.typeChip,
                      selected ? styles.typeChipSelected : styles.typeChipDefault,
                    ]}
                    onPress={() => setType(opt.type)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.typeIcon}>{opt.icon}</Text>
                    <Text
                      style={[
                        styles.typeLabel,
                        selected ? styles.typeLabelSelected : styles.typeLabelDefault,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              label="Số dư ban đầu (VND)"
              value={balance}
              onChangeText={(t) => setBalance(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              containerStyle={styles.field}
            />

            <TouchableOpacity
              style={styles.primaryRow}
              onPress={() => setIsPrimary((p) => !p)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, isPrimary && styles.checkboxOn]}>
                {isPrimary ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.primaryLabel}>Đặt làm ví chính</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Tạo ví"
            onPress={handleCreate}
            loading={createMutation.isPending}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  field: { marginBottom: SPACING[4] },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  typeRow: { flexDirection: 'row', gap: SPACING[2], marginBottom: SPACING[5] },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    gap: SPACING[1],
  },
  typeChipDefault: { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[50] },
  typeChipSelected: { borderColor: COLORS.brand[500], backgroundColor: COLORS.brand[50] },
  typeIcon: { fontSize: FONT_SIZE.xl },
  typeLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  typeLabelDefault: { color: COLORS.gray[600] },
  typeLabelSelected: { color: COLORS.brand[600] },

  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxOn: { backgroundColor: COLORS.brand[500], borderColor: COLORS.brand[500] },
  checkboxMark: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  primaryLabel: { fontSize: FONT_SIZE.base, color: COLORS.gray[800] },

  submit: { marginTop: SPACING[2] },
});
