import React, { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';

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
import { DatePickerField } from '@/components/common/DatePickerField';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useGoalById, useWallets, useUpdateGoal } from '@/hooks';
import { formatVND } from '@/utils/formatters';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: goal, isLoading } = useGoalById(id);
  const { data: walletsData, isLoading: walletsLoading } = useWallets();
  const updateMutation = useUpdateGoal();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadlineIso, setDeadlineIso] = useState<string>('');
  const [fundingWalletId, setFundingWalletId] = useState<string | null>(null);

  useEffect(() => {
    if (!goal) return;
    setName(goal.name);
    setTarget(String(goal.targetAmount));
    setDeadlineIso(goal.deadline);
    setFundingWalletId(goal.fundingWalletId ?? null);
  }, [goal]);

  const visibleWallets = useMemo(
    () => walletsData?.wallets.filter((w) => !w.isDeleted) ?? [],
    [walletsData],
  );

  if (isLoading || walletsLoading) return <LoadingSpinner />;
  if (!goal) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Không tìm thấy" />
        <EmptyState
          icon={Trophy}
          title="Không tìm thấy mục tiêu"
          subtitle="Mục tiêu này có thể đã bị xóa."
        />
      </SafeAreaView>
    );
  }

  const fundingWallet =
    visibleWallets.find((w) => w.id === fundingWalletId) ?? null;
  const targetNum = parseInt(target, 10) || 0;

  const canSubmit =
    name.trim().length > 0 &&
    targetNum > 0 &&
    deadlineIso.length > 0 &&
    fundingWalletId !== null;

  const handlePickWallet = () => {
    if (visibleWallets.length === 0) return;
    Alert.alert('Ví nguồn', 'Khoản đóng góp sẽ được trừ từ ví này.', [
      ...visibleWallets.map((w) => ({
        text: `${w.name} • ${formatVND(w.balance)}`,
        onPress: () => setFundingWalletId(w.id),
      })),
      { text: 'Hủy', style: 'cancel' as const },
    ]);
  };

  const handleSubmit = () => {
    if (!canSubmit || !fundingWalletId) return;
    updateMutation.mutate(
      {
        id: goal.id,
        patch: {
          name: name.trim(),
          targetAmount: targetNum,
          deadline: deadlineIso,
          fundingWalletId,
        },
      },
      {
        onSuccess: () =>
          Alert.alert('Đã lưu', 'Mục tiêu đã được cập nhật.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () => Alert.alert('Lỗi', 'Không cập nhật được mục tiêu.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title="Sửa mục tiêu" />

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
              label="Tên mục tiêu"
              value={name}
              onChangeText={setName}
              placeholder="VD: Du lịch Đà Nẵng hè 2026"
              autoCapitalize="sentences"
              maxLength={60}
              containerStyle={styles.field}
            />
            <TextInput
              label="Số tiền mục tiêu (VND)"
              value={target}
              onChangeText={(t) => setTarget(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
            />
            {targetNum > 0 ? (
              <Text style={styles.preview}>{formatVND(targetNum)}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <DatePickerField
              label="Hạn hoàn thành"
              value={deadlineIso || todayIso()}
              onChange={setDeadlineIso}
              minDate={todayIso()}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ví nguồn</Text>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={handlePickWallet}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.pickerValue,
                  !fundingWallet && styles.pickerPlaceholder,
                ]}
              >
                {fundingWallet
                  ? `${fundingWallet.name} • ${formatVND(fundingWallet.balance)}`
                  : 'Chọn ví để trừ tiền đóng góp'}
              </Text>
              <Text style={styles.pickerChevron}>›</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Mỗi lần đóng góp sẽ trừ tiền trực tiếp từ ví này.
            </Text>
          </View>

          <Text style={styles.note}>
            Số tiền đã đóng góp ({formatVND(goal.currentAmount)}) không thay đổi khi sửa mục tiêu.
          </Text>

          <Button
            title="Lưu thay đổi"
            onPress={handleSubmit}
            loading={updateMutation.isPending}
            disabled={!canSubmit}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
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
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  field: { marginBottom: SPACING[3] },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preview: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    minHeight: 48,
  },
  pickerValue: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[900] },
  pickerPlaceholder: { color: COLORS.gray[400] },
  pickerChevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },
  helperText: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 16,
  },

  note: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[2],
  },
  submit: { marginTop: SPACING[2] },
});
