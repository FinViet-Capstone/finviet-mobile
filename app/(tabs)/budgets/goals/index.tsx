import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { useGoals, useCreateGoal } from '@/hooks/useGoals';
import type { SavingsGoalWithProgress } from '@/types/goal';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Mục tiêu tiết kiệm',
  tabBudget: 'Ngân sách',
  tabGoals: 'Mục tiêu tiết kiệm',
  createBtn: 'Tạo mục tiêu',
  emptyTitle: 'Chưa có mục tiêu nào',
  emptyHint: 'Tạo mục tiêu đầu tiên để bắt đầu tiết kiệm',
  daysLeft: (n: number) => `Còn ${n} ngày`,
  monthsLeft: (n: number) => `Còn ${n} tháng`,
  completed: 'Hoàn thành',
  needsPerMonth: (n: string) => `Cần ${n}/tháng`,
  newGoalTitle: 'Tạo mục tiêu mới',
  nameLabel: 'Tên mục tiêu',
  namePlaceholder: 'VD: Mua MacBook Pro',
  targetLabel: 'Số tiền mục tiêu',
  targetPlaceholder: 'Nhập số tiền',
  deadlineLabel: 'Thời hạn (YYYY-MM-DD)',
  deadlinePlaceholder: '2026-12-31',
  emojiLabel: 'Biểu tượng (tuỳ chọn)',
  emojiPlaceholder: '💻',
  save: 'Tạo mục tiêu',
  cancel: 'Huỷ',
  months: [
    'Tháng 1','Tháng 2','Tháng 3','Tháng 4',
    'Tháng 5','Tháng 6','Tháng 7','Tháng 8',
    'Tháng 9','Tháng 10','Tháng 11','Tháng 12',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return amount.toLocaleString('vi-VN');
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function deadlineBadge(goal: SavingsGoalWithProgress): { label: string; color: string; bg: string } {
  if (goal.isCompleted) return { label: S.completed, color: COLORS.tertiary, bg: `${COLORS.tertiary}20` };
  const days = daysUntil(goal.deadline);
  if (days <= 30) return { label: S.daysLeft(days), color: COLORS.secondary, bg: `${COLORS.secondary}20` };
  return { label: S.monthsLeft(goal.monthsRemaining), color: COLORS.onSurfaceVariant, bg: COLORS.surfaceVariant };
}

function barColor(goal: SavingsGoalWithProgress): string {
  if (goal.isCompleted) return COLORS.tertiary;
  if (goal.progressPercentage >= 75) return COLORS.primary;
  return COLORS.secondary;
}

// ─── New Goal Sheet ───────────────────────────────────────────────────────────

function NewGoalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createGoal = useCreateGoal();
  const [name, setName] = useState('');
  const [targetRaw, setTargetRaw] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState('');
  const [targetFocused, setTargetFocused] = useState(false);

  const parsedTarget = parseInt(targetRaw || '0', 10);
  const targetDisplay = parsedTarget > 0 ? parsedTarget.toLocaleString('vi-VN') + 'đ' : '';

  const handleNumberPress = useCallback((key: string) => {
    setTargetRaw((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
  }, []);

  const handleBackspace = useCallback(() => setTargetRaw((prev) => prev.slice(0, -1)), []);
  const handleClear = useCallback(() => setTargetRaw(''), []);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !parsedTarget || !deadline.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    await createGoal.mutateAsync({
      name: name.trim(),
      targetAmount: parsedTarget,
      deadline,
      iconEmoji: emoji.trim() || undefined,
    });
    setName(''); setTargetRaw(''); setDeadline(''); setEmoji(''); setTargetFocused(false);
    onClose();
  }, [name, parsedTarget, deadline, emoji, createGoal, onClose]);

  const isValid = name.trim() && targetRaw && deadline.match(/^\d{4}-\d{2}-\d{2}$/);

  return (
    <>
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, targetFocused && { paddingBottom: NUMPAD_HEIGHT }]}>
        <Text style={styles.sheetTitle}>{S.newGoalTitle}</Text>

        <Text style={styles.fieldLabel}>{S.nameLabel}</Text>
        <TextInput style={styles.fieldInput} value={name} onChangeText={setName}
          placeholder={S.namePlaceholder} placeholderTextColor={COLORS.onSurfaceVariant}
          onFocus={() => setTargetFocused(false)} />

        <Text style={styles.fieldLabel}>{S.targetLabel}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.fieldInput, styles.amountDisplay, targetFocused && styles.amountDisplayFocused]}
          onPress={() => setTargetFocused(true)}
        >
          <Text style={[styles.amountText, !targetDisplay && styles.amountPlaceholder]}>
            {targetDisplay || S.targetPlaceholder}
          </Text>
          <MaterialIcon name="dialpad" size={16} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>{S.deadlineLabel}</Text>
        <TextInput style={styles.fieldInput} value={deadline} onChangeText={setDeadline}
          placeholder={S.deadlinePlaceholder} placeholderTextColor={COLORS.onSurfaceVariant}
          onFocus={() => setTargetFocused(false)} />

        <Text style={styles.fieldLabel}>{S.emojiLabel}</Text>
        <TextInput style={styles.fieldInput} value={emoji} onChangeText={setEmoji}
          placeholder={S.emojiPlaceholder} placeholderTextColor={COLORS.onSurfaceVariant}
          onFocus={() => setTargetFocused(false)} />

        <View style={styles.sheetActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.saveBtn, (!isValid || createGoal.isPending) && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!isValid || createGoal.isPending}>
            {createGoal.isPending
              ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
              : <Text style={styles.saveText}>{S.save}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </DraggableSheet>
    <NumericKeypad
      visible={visible && targetFocused}
      onClose={() => setTargetFocused(false)}
      onNumberPress={handleNumberPress}
      onBackspace={handleBackspace}
      onClear={handleClear}
      onDone={() => setTargetFocused(false)}
    />
    </>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onPress }: { goal: SavingsGoalWithProgress; onPress: () => void }) {
  const badge = deadlineBadge(goal);
  const color = barColor(goal);
  const pct = Math.min(100, goal.progressPercentage);
  const isCompleted = goal.isCompleted;

  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[styles.goalCard, isCompleted && styles.goalCardCompleted]}
      onPress={onPress}>
      {isCompleted && <View style={styles.completedAccent} />}
      <View style={styles.goalCardTop}>
        <View style={styles.goalCardLeft}>
          {goal.iconEmoji ? (
            <View style={styles.goalIconWrap}>
              <Text style={styles.goalEmoji}>{goal.iconEmoji}</Text>
            </View>
          ) : (
            <View style={[styles.goalIconWrap, { backgroundColor: `${COLORS.primary}20` }]}>
              <MaterialIcon name="savings" size={20} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.goalNameWrap}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            {!isCompleted && (
              <Text style={styles.goalMonthly}>
                {S.needsPerMonth(formatVND(goal.requiredMonthlySaving) + 'đ')}
              </Text>
            )}
            {isCompleted && (
              <Text style={[styles.goalMonthly, { color: COLORS.tertiary }]}>
                {S.completed}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.badgeWrap, { backgroundColor: badge.bg }]}>
          <MaterialIcon
            name={isCompleted ? 'check_circle' : 'schedule'}
            size={12}
            color={badge.color}
          />
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.goalProgress}>
        <View style={styles.goalProgressLabels}>
          <Text style={[styles.goalCurrent, isCompleted && { color: COLORS.tertiary }]}>
            {formatVND(goal.currentAmount)}đ
          </Text>
          <Text style={styles.goalTarget}>
            {formatVND(goal.targetAmount)}đ ({pct.toFixed(0)}%)
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const router = useRouter();
  const { data: goals = [], isLoading, isError, error, refetch } = useGoals();
  const [newGoalVisible, setNewGoalVisible] = useState(false);

  const activeGoals = useMemo(() =>
    (goals as SavingsGoalWithProgress[]).filter((g) => !g.isDeleted && !g.isCompleted)
      .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline)),
    [goals]);

  const completedGoals = useMemo(() =>
    (goals as SavingsGoalWithProgress[]).filter((g) => !g.isDeleted && g.isCompleted),
    [goals]);

  const handleGoalPress = useCallback((goal: SavingsGoalWithProgress) => {
    router.push({ pathname: '/(tabs)/budgets/goals/[id]', params: { id: goal.id } });
  }, [router]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.createBtn}
          onPress={() => setNewGoalVisible(true)}>
          <MaterialIcon name="add" size={16} color={COLORS.onPrimary} />
          <Text style={styles.createBtnText}>{S.createBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle pill */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggle}>
          <TouchableOpacity activeOpacity={0.7} style={styles.toggleOption}
            onPress={() => router.back()}>
            <Text style={styles.toggleTextInactive}>{S.tabBudget}</Text>
          </TouchableOpacity>
          <View style={[styles.toggleOption, styles.toggleOptionActive]}>
            <Text style={styles.toggleTextActive}>{S.tabGoals}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />}>

        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcon name="savings" size={48} color={COLORS.outlineVariant} />
            <Text style={styles.emptyTitle}>{S.emptyTitle}</Text>
            <Text style={styles.emptyHint}>{S.emptyHint}</Text>
          </View>
        ) : (
          <>
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onPress={() => handleGoalPress(goal)} />
            ))}
            {completedGoals.length > 0 && (
              <>
                <View style={styles.sectionDivider}>
                  <MaterialIcon name="check_circle" size={14} color={COLORS.tertiary} />
                  <Text style={styles.sectionDividerText}>Đã hoàn thành</Text>
                </View>
                {completedGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onPress={() => handleGoalPress(goal)} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <NewGoalSheet visible={newGoalVisible} onClose={() => setNewGoalVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onBackground },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[1],
    backgroundColor: COLORS.inversePrimary, paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2], borderRadius: BORDER_RADIUS.full,
  },
  createBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onPrimary },
  toggleWrap: { paddingHorizontal: SPACING[4], marginBottom: SPACING[3] },
  toggle: {
    flexDirection: 'row', backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.full, padding: 4,
  },
  toggleOption: { flex: 1, paddingVertical: SPACING[2], alignItems: 'center', borderRadius: BORDER_RADIUS.full },
  toggleOptionActive: { backgroundColor: COLORS.primaryContainer },
  toggleTextActive: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onPrimaryContainer },
  toggleTextInactive: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[3] },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING[16], gap: SPACING[3] },
  emptyTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  emptyHint: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    paddingVertical: SPACING[2], borderTopWidth: 1, borderTopColor: COLORS.surfaceVariant,
    marginTop: SPACING[2],
  },
  sectionDividerText: { fontSize: FONT_SIZE.xs, color: COLORS.tertiary, fontWeight: FONT_WEIGHT.semibold },
  // Goal card
  goalCard: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], borderWidth: 1, borderColor: COLORS.surfaceVariant,
    overflow: 'hidden',
  },
  goalCardCompleted: { borderColor: `${COLORS.tertiary}30` },
  completedAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: `${COLORS.tertiary}60`,
  },
  goalCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING[3] },
  goalCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], flex: 1 },
  goalIconWrap: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceVariant, alignItems: 'center', justifyContent: 'center',
  },
  goalEmoji: { fontSize: 20 },
  goalNameWrap: { flex: 1 },
  goalName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  goalMonthly: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginTop: 2 },
  badgeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING[2], paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full, flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold },
  goalProgress: { gap: SPACING[1] },
  goalProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  goalCurrent: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  goalTarget: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  barTrack: { height: 4, backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  // Sheet
  // Sheet
  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  amountDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountDisplayFocused: { borderColor: COLORS.primary },
  amountText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  amountPlaceholder: { color: COLORS.onSurfaceVariant, fontWeight: FONT_WEIGHT.normal },
  sheetHandle: {
    width: 40, height: 4, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.outlineVariant, alignSelf: 'center', marginBottom: SPACING[4],
  },
  sheetTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, marginBottom: SPACING[4] },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, marginBottom: SPACING[1], marginTop: SPACING[3] },
  fieldInput: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48,
    fontSize: FONT_SIZE.sm, color: COLORS.onSurface,
  },
  sheetActions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[6] },
  cancelBtn: {
    flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  saveBtn: {
    flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
});
