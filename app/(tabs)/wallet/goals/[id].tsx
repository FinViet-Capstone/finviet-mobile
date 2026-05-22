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
  Modal,
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
import { useGoalById, useDeleteGoal, useAddContribution } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatVND } from '@/utils/formatters';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: goal, isLoading } = useGoalById(id);
  const deleteMutation = useDeleteGoal();
  const contribMutation = useAddContribution();

  const [contribVisible, setContribVisible] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [contribError, setContribError] = useState<string | undefined>();

  if (isLoading) return <LoadingSpinner />;
  if (!goal) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Không tìm thấy" />
        <EmptyState
          iconName="trophy-outline"
          title="Không tìm thấy mục tiêu"
          subtitle="Mục tiêu này có thể đã bị xóa."
        />
      </SafeAreaView>
    );
  }

  const progress = Math.min(goal.progressPercentage / 100, 1);
  const color =
    goal.progressPercentage >= 100
      ? COLORS.success
      : goal.progressPercentage >= 70
      ? COLORS.brand[500]
      : COLORS.info;

  const [y, m, d] = goal.deadline.split('-');
  const deadlineDisplay = `${d}/${m}/${y}`;

  const handleAddContribution = () => {
    setContribError(undefined);
    setContribAmount('');
    setContribNote('');
    setContribVisible(true);
  };

  const handleSaveContribution = () => {
    const amount = parseInt(contribAmount, 10) || 0;
    if (amount <= 0) {
      setContribError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (!goal) return;
    contribMutation.mutate(
      { goalId: goal.id, input: { amount, note: contribNote.trim() || undefined } },
      {
        onSuccess: () => {
          setContribVisible(false);
          Alert.alert(
            'Đã đóng góp',
            `${formatVND(amount)} đã được thêm vào mục tiêu "${goal.name}".`,
          );
        },
        onError: () => setContribError('Không lưu được đóng góp.'),
      },
    );
  };

  const handleEdit = () => {
    router.push(`/(tabs)/wallet/goals/edit?id=${goal.id}` as never);
  };

  const handleDelete = () => {
    if (!goal) return;
    Alert.alert(
      'Xóa mục tiêu?',
      `Bạn có chắc muốn xóa "${goal.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(goal.id, {
              onSuccess: () =>
                Alert.alert('Đã xóa', 'Mục tiêu đã được xóa.', [
                  { text: 'OK', onPress: () => router.back() },
                ]),
              onError: () => Alert.alert('Lỗi', 'Không xóa được mục tiêu.'),
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title={goal.name} onEdit={handleEdit} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>🎯</Text>
          </View>
          <Text style={styles.heroLabel}>Đã tiết kiệm</Text>
          <Text style={styles.heroAmount}>{formatVND(goal.currentAmount)}</Text>
          <Text style={styles.heroTarget}>
            / {formatVND(goal.targetAmount)}
          </Text>

          <View style={styles.heroProgress}>
            <ProgressBar value={progress} color={color} height={10} />
            <Text style={styles.heroPct}>
              {goal.progressPercentage.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Còn lại" value={formatVND(goal.remainingAmount)} />
          <Stat label="Số tháng" value={`${goal.monthsRemaining} tháng`} />
          <Stat
            label="Mỗi tháng"
            value={formatVND(goal.requiredMonthlySaving)}
            highlight
          />
        </View>

        {/* Detail rows */}
        <View style={styles.detailCard}>
          <DetailRow label="Hạn chót" value={deadlineDisplay} />
          <DetailRow
            label="Trạng thái"
            value={goal.isCompleted ? 'Hoàn thành' : 'Đang thực hiện'}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Thêm đóng góp" onPress={handleAddContribution} />
          <Button
            title="Xóa mục tiêu"
            variant="ghost"
            onPress={handleDelete}
            loading={deleteMutation.isPending}
            style={styles.deleteBtn}
          />
        </View>
      </ScrollView>

      {/* Contribution modal */}
      <Modal
        visible={contribVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContribVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setContribVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Thêm đóng góp</Text>
            <Text style={styles.sheetSubtitle}>
              Số tiền sẽ được trừ từ ví nguồn của mục tiêu này.
            </Text>

            <TextInput
              label="Số tiền (VND)"
              value={contribAmount}
              onChangeText={(t) => {
                setContribAmount(t.replace(/\D/g, ''));
                if (contribError) setContribError(undefined);
              }}
              keyboardType="numeric"
              placeholder="0"
              error={contribError}
              autoFocus
              containerStyle={styles.modalField}
            />
            <TextInput
              label="Ghi chú (tùy chọn)"
              value={contribNote}
              onChangeText={setContribNote}
              placeholder="VD: Thưởng tháng"
            />

            <Button
              title="Lưu"
              onPress={handleSaveContribution}
              loading={contribMutation.isPending}
              style={styles.modalSubmit}
            />
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
        <Text style={styles.headerIcon}>‹</Text>
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

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
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
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  heroIcon: { fontSize: 32 },
  heroLabel: { fontSize: FONT_SIZE.sm, color: COLORS.gray[500] },
  heroAmount: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  heroTarget: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  heroProgress: { alignSelf: 'stretch', marginTop: SPACING[4] },
  heroPct: {
    marginTop: SPACING[2],
    textAlign: 'right',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[600],
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  statCard: {
    flex: 1,
    padding: SPACING[3],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  statCardHighlight: {
    backgroundColor: COLORS.brand[50],
  },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginBottom: 4 },
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    textAlign: 'center',
  },
  statValueHighlight: { color: COLORS.brand[600] },

  detailCard: {
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[4],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  detailLabel: { fontSize: FONT_SIZE.sm, color: COLORS.gray[500] },
  detailValue: { fontSize: FONT_SIZE.sm, color: COLORS.gray[900], fontWeight: FONT_WEIGHT.medium },

  actions: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
  },
  deleteBtn: {},

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
    marginBottom: SPACING[1],
  },
  sheetSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginBottom: SPACING[4],
  },
  modalField: { marginBottom: SPACING[3] },
  modalSubmit: { marginTop: SPACING[3] },
});
