import React, { useEffect, useState } from 'react';
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
import { MaterialIcon } from '@/components/common/MaterialIcon';

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
import { EmptyState } from '@/components/common/EmptyState';
import { useBudgetById, useUpdateBudget } from '@/hooks';
import { formatVND } from '@/utils/formatters';

export default function EditBudgetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: budget, isLoading } = useBudgetById(id);
  const updateMutation = useUpdateBudget();

  const [limit, setLimit] = useState('');

  useEffect(() => {
    if (!budget) return;
    setLimit(String(budget.monthlyLimit));
  }, [budget]);

  if (isLoading) return <LoadingSpinner />;
  if (!budget) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Không tìm thấy" />
        <EmptyState
          icon="account_balance_wallet"
          title="Không tìm thấy ngân sách"
          subtitle="Ngân sách này có thể đã bị xóa."
        />
      </SafeAreaView>
    );
  }

  const limitNum = parseInt(limit, 10) || 0;
  const warningAt80 = Math.round(limitNum * 0.8);
  const canSubmit = limitNum > 0 && limitNum !== budget.monthlyLimit;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (limitNum < budget.spent) {
      Alert.alert(
        'Hạn mức thấp hơn đã chi',
        `Bạn đã chi ${formatVND(budget.spent)} trong tháng này. Hạn mức ${formatVND(limitNum)} sẽ ngay lập tức ở trạng thái "Vượt".`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: doUpdate },
        ],
      );
      return;
    }
    doUpdate();
  };

  const doUpdate = () => {
    updateMutation.mutate(
      { id: budget.id, patch: { monthlyLimit: limitNum } },
      {
        onSuccess: () =>
          Alert.alert('Đã lưu', 'Ngân sách đã được cập nhật.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () => Alert.alert('Lỗi', 'Không cập nhật được ngân sách.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title="Sửa ngân sách" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category header (read-only -- one budget per category) */}
          <View style={styles.categoryCard}>
            <View
              style={[styles.colorDot, { backgroundColor: budget.categoryColor }]}
            />
            <View style={styles.categoryText}>
              <Text style={styles.categoryName}>{budget.categoryName}</Text>
              <Text style={styles.categoryHint}>
                Đã chi tháng này: {formatVND(budget.spent)}
              </Text>
            </View>
          </View>

          {/* Limit */}
          <View style={styles.card}>
            <TextInput
              label="Hạn mức tháng (VND)"
              value={limit}
              onChangeText={(t) => setLimit(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              autoFocus
            />
            {limitNum > 0 ? (
              <Text style={styles.preview}>{formatVND(limitNum)}</Text>
            ) : null}
          </View>

          {/* Threshold preview */}
          {limitNum > 0 ? (
            <View style={styles.thresholdCard}>
              <Text style={styles.thresholdTitle}>Cảnh báo khi chi đến</Text>
              <Text style={styles.thresholdAmount}>{formatVND(warningAt80)}</Text>
              <Text style={styles.thresholdSub}>(80% hạn mức)</Text>
            </View>
          ) : null}

          <Button
            title="Lưu thay đổi"
            onPress={handleSubmit}
            loading={updateMutation.isPending}
            disabled={!canSubmit}
            style={styles.submit}
          />

          {!canSubmit && limit.length > 0 ? (
            <Text style={styles.disabledHint}>
              Hạn mức mới phải khác hạn mức hiện tại.
            </Text>
          ) : null}

          <Text style={styles.note}>
            Để đổi danh mục, hãy xóa ngân sách hiện tại và tạo ngân sách mới cho danh mục khác.
          </Text>
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

  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    gap: SPACING[3],
    ...SHADOW.sm,
  },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  categoryText: { flex: 1 },
  categoryName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  categoryHint: {
    marginTop: 2,
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  preview: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  thresholdCard: {
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    alignItems: 'center',
    ...SHADOW.md,
  },
  thresholdTitle: { fontSize: FONT_SIZE.sm, color: COLORS.brand[100] },
  thresholdAmount: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginTop: SPACING[1],
  },
  thresholdSub: { fontSize: FONT_SIZE.xs, color: COLORS.brand[100], marginTop: 2 },

  submit: { marginTop: SPACING[2] },
  disabledHint: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  note: {
    marginTop: SPACING[5],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    paddingHorizontal: SPACING[2],
  },
});
