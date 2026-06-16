import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { useGoalById, useAddContribution, useDeleteGoal } from '@/hooks/useGoals';
import { useWallets } from '@/hooks/useWallets';
import type { SavingsGoalWithProgress } from '@/types/goal';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  back: 'arrow_back',
  delete: 'delete',
  progress: 'Tiến độ',
  target: 'Mục tiêu',
  saved: 'Đã tiết kiệm',
  remaining: 'Còn thiếu',
  deadline: 'Thời hạn',
  monthsLeft: (n: number) => `Còn ${n} tháng`,
  daysLeft: (n: number) => `Còn ${n} ngày`,
  perMonth: (s: string) => `Cần ${s}/tháng`,
  completed: 'Đã hoàn thành',
  addContrib: 'Thêm tiền tiết kiệm',
  contribTitle: 'Thêm tiền tiết kiệm',
  amountLabel: 'Số tiền',
  amountPlaceholder: 'Nhập số tiền',
  noteLabel: 'Ghi chú (tuỳ chọn)',
  notePlaceholder: 'VD: Lương tháng 6',
  save: 'Lưu',
  cancel: 'Huỷ',
  available: (s: string) => `Số dư khả dụng: ${s}`,
  errInsufficient: (s: string) => `Số dư ví không đủ (Hiện có: ${s})`,
  errOverRemaining: (s: string) => `Vượt số tiền còn thiếu (${s})`,
  zeroBalance: (name: string) => `Ví ${name} đã hết số dư. Vui lòng chọn ví khác.`,
  deleteConfirmTitle: 'Xoá mục tiêu?',
  deleteConfirmMsg: 'Bạn có chắc muốn xoá mục tiêu này không? Hành động này không thể hoàn tác.',
  deleteConfirm: 'Xoá',
  noHistory: 'Chưa có lần nào đóng góp',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString('vi-VN');
}

function formatFull(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

// ─── Contribution Sheet ───────────────────────────────────────────────────────

function ContributionSheet({
  visible,
  goal,
  onClose,
}: {
  visible: boolean;
  goal: SavingsGoalWithProgress;
  onClose: () => void;
}) {
  const addContrib = useAddContribution();
  const { data: walletData } = useWallets();
  const [amountRaw, setAmountRaw] = useState('');
  const [note, setNote] = useState('');
  // Numpad is a screen-level modal overlay (NOT a child of the sheet — that would
  // clip its absolute-fill). Auto-open when the sheet opens; Done/outside dismisses.
  const [amountFocused, setAmountFocused] = useState(true);
  useEffect(() => { if (visible) setAmountFocused(true); }, [visible]);

  // The funding wallet is the source the contribution is deducted from. Its
  // balance is a hard ceiling — you can't contribute money the wallet doesn't hold.
  const fundingWallet = goal.fundingWalletId
    ? walletData?.wallets.find((w) => w.id === goal.fundingWalletId)
    : undefined;
  const walletBalance = fundingWallet ? fundingWallet.balance : null;
  const zeroBalance = walletBalance !== null && walletBalance <= 0;

  const parsedAmount = parseInt(amountRaw || '0', 10);
  const amountDisplay = parsedAmount > 0 ? parsedAmount.toLocaleString('vi-VN') + 'đ' : '';

  const overBalance = walletBalance !== null && parsedAmount > walletBalance;
  const overRemaining = !overBalance && parsedAmount > goal.remainingAmount;
  const hasError = parsedAmount > 0 && (overBalance || overRemaining);
  const canSave =
    !!amountRaw && parsedAmount > 0 && !hasError && !zeroBalance && !addContrib.isPending;

  const handleNumberPress = useCallback(
    (key: string) => {
      if (zeroBalance) return; // input locked when the wallet is empty
      setAmountRaw((prev) => {
        if (key === '000') return prev === '' ? '' : prev + '000';
        return prev + key;
      });
    },
    [zeroBalance],
  );

  const handleBackspace = useCallback(() => setAmountRaw((prev) => prev.slice(0, -1)), []);
  const handleClear = useCallback(() => setAmountRaw(''), []);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await addContrib.mutateAsync({
      goalId: goal.id,
      input: { amount: parsedAmount, note: note.trim() || undefined },
    });
    setAmountRaw(''); setNote('');
    onClose();
  }, [canSave, parsedAmount, note, goal.id, addContrib, onClose]);

  return (
    <>
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, amountFocused && !zeroBalance && { paddingBottom: NUMPAD_HEIGHT }]}>
        <Text style={styles.sheetTitle}>{S.contribTitle}</Text>

        {zeroBalance ? (
          <View style={styles.zeroBalanceBox}>
            <MaterialIcon name="account_balance_wallet" size={18} color={COLORS.error} />
            <Text style={styles.zeroBalanceText}>{S.zeroBalance(fundingWallet?.name ?? '')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.fieldLabel}>{S.amountLabel}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.amountDisplay, hasError && styles.amountDisplayError]}
              onPress={() => setAmountFocused(true)}
            >
              <Text style={[styles.amountText, !amountDisplay && styles.amountPlaceholder]}>
                {amountDisplay || S.amountPlaceholder}
              </Text>
            </TouchableOpacity>
            {hasError ? (
              <Text style={styles.errorText}>
                {overBalance
                  ? S.errInsufficient(formatFull(walletBalance!))
                  : S.errOverRemaining(formatFull(goal.remainingAmount))}
              </Text>
            ) : walletBalance !== null ? (
              <Text style={styles.helperText}>{S.available(formatFull(walletBalance))}</Text>
            ) : null}
          </>
        )}

        <Text style={styles.fieldLabel}>{S.noteLabel}</Text>
        <View style={styles.noteDisplay}>
          <Text style={[styles.noteText, !note && styles.amountPlaceholder]}>
            {note || S.notePlaceholder}
          </Text>
        </View>

        <View style={styles.sheetActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!canSave}>
            {addContrib.isPending
              ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
              : <Text style={styles.saveText}>{S.save}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </DraggableSheet>
    <NumericKeypad
      visible={visible && amountFocused && !zeroBalance}
      onClose={() => setAmountFocused(false)}
      onNumberPress={handleNumberPress}
      onBackspace={handleBackspace}
      onClear={handleClear}
      onDone={() => setAmountFocused(false)}
    />
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: goal, isLoading, isError, error, refetch } = useGoalById(id);
  const deleteGoal = useDeleteGoal();
  const [contribVisible, setContribVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await deleteGoal.mutateAsync(id);
    setDeleteVisible(false);
    router.back();
  }, [id, deleteGoal, router]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !goal) return <ErrorState message={(error as Error)?.message ?? 'Không tìm thấy mục tiêu'} onRetry={refetch} />;

  const pct = Math.min(100, goal.progressPercentage);
  const days = daysUntil(goal.deadline);
  const barCol = goal.isCompleted ? COLORS.tertiary : pct >= 75 ? COLORS.primary : COLORS.secondary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcon name={S.back} size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {goal.iconEmoji ? (
            <Text style={styles.headerEmoji}>{goal.iconEmoji}</Text>
          ) : (
            <MaterialIcon name="savings" size={20} color={COLORS.primary} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{goal.name}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => setDeleteVisible(true)}>
          <MaterialIcon name={S.delete} size={22} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />}>

        {/* Progress card */}
        <View style={[styles.progressCard, goal.isCompleted && styles.progressCardCompleted]}>
          {goal.isCompleted && <View style={styles.completedAccent} />}

          <View style={styles.progressRow}>
            <Text style={[styles.pctText, { color: barCol }]}>{pct.toFixed(0)}%</Text>
            {goal.isCompleted ? (
              <View style={styles.completedBadge}>
                <MaterialIcon name="check_circle" size={14} color={COLORS.tertiary} />
                <Text style={styles.completedBadgeText}>{S.completed}</Text>
              </View>
            ) : (
              <Text style={styles.deadlineText}>
                {days <= 30 ? S.daysLeft(days) : S.monthsLeft(goal.monthsRemaining)}
              </Text>
            )}
          </View>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: barCol }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{S.saved}</Text>
              <Text style={[styles.statValue, { color: barCol }]}>{formatFull(goal.currentAmount)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{S.target}</Text>
              <Text style={styles.statValue}>{formatFull(goal.targetAmount)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{S.remaining}</Text>
              <Text style={[styles.statValue, { color: COLORS.onSurfaceVariant }]}>
                {formatFull(goal.remainingAmount)}
              </Text>
            </View>
          </View>

          {!goal.isCompleted && (
            <View style={styles.monthlyRow}>
              <MaterialIcon name="savings" size={16} color={COLORS.primary} />
              <Text style={styles.monthlyText}>
                {S.perMonth(formatVND(goal.requiredMonthlySaving) + 'đ')}
              </Text>
              <Text style={styles.deadlineFull}>· {S.deadline}: {formatDate(goal.deadline)}</Text>
            </View>
          )}
        </View>

        {/* Add contribution button */}
        {!goal.isCompleted && (
          <TouchableOpacity activeOpacity={0.7} style={styles.addContribBtn}
            onPress={() => setContribVisible(true)}>
            <MaterialIcon name="add" size={20} color={COLORS.onPrimary} />
            <Text style={styles.addContribText}>{S.addContrib}</Text>
          </TouchableOpacity>
        )}

        {/* Empty history placeholder */}
        <View style={styles.historySection}>
          <Text style={styles.historyLabel}>Lịch sử đóng góp</Text>
          <Text style={styles.historyEmpty}>{S.noHistory}</Text>
        </View>
      </ScrollView>

      <ContributionSheet visible={contribVisible} goal={goal} onClose={() => setContribVisible(false)} />

      {/* Delete confirm */}
      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setDeleteVisible(false)} />
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{S.deleteConfirmTitle}</Text>
          <Text style={styles.confirmMsg}>{S.deleteConfirmMsg}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={() => setDeleteVisible(false)}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.deleteBtn} onPress={handleDelete}>
              {deleteGoal.isPending
                ? <ActivityIndicator size="small" color={COLORS.onError} />
                : <Text style={styles.deleteText}>{S.deleteConfirm}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2] },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[4] },
  // Progress card
  progressCard: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], borderWidth: 1, borderColor: COLORS.surfaceVariant,
    overflow: 'hidden', gap: SPACING[3],
  },
  progressCardCompleted: { borderColor: `${COLORS.tertiary}30` },
  completedAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: `${COLORS.tertiary}60` },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pctText: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold },
  deadlineText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.tertiary}20`, paddingHorizontal: SPACING[2],
    paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
  },
  completedBadgeText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold, color: COLORS.tertiary },
  barTrack: { height: 6, backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.outlineVariant },
  monthlyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  monthlyText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  deadlineFull: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  // Add contrib button
  addContribBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    height: 56,
  },
  addContribText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
  // History
  historySection: { gap: SPACING[2] },
  historyLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  historyEmpty: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingVertical: SPACING[4] },
  // Sheet
  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  backdrop: { flex: 1, backgroundColor: `${COLORS.black}80` },
  amountDisplay: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48, justifyContent: 'center',
  },
  amountText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  amountDisplayError: { borderColor: COLORS.error },
  amountPlaceholder: { color: COLORS.onSurfaceVariant, fontWeight: FONT_WEIGHT.normal },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING[1] },
  helperText: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginTop: SPACING[1] },
  zeroBalanceBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: `${COLORS.error}15`, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.error}40`,
    padding: SPACING[3], marginTop: SPACING[2],
  },
  zeroBalanceText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.error, lineHeight: 18 },
  noteDisplay: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48, justifyContent: 'center',
  },
  noteText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurface },
  sheetHandle: {
    width: 40, height: 4, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.outlineVariant, alignSelf: 'center', marginBottom: SPACING[4],
  },
  sheetTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, marginBottom: SPACING[2] },
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
  // Delete confirm dialog
  confirmDialog: {
    position: 'absolute', top: '35%', left: SPACING[6], right: SPACING[6],
    backgroundColor: COLORS.surfaceContainerHigh, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6], gap: SPACING[3],
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  confirmMsg: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[2] },
  deleteBtn: {
    flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.errorContainer, alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onErrorContainer },
});
