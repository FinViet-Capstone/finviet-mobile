import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { DatePickerField } from '@/components/common/DatePickerField';
import { TextInput } from '@/components/common/TextInput';
import { useArchivedGoals, useCreateGoal, useGoals } from '@/hooks/useGoals';
import { useBudgetBuckets } from '@/hooks/useBudgets';
import {
  useApplySavingsPlanRecommendation,
  useSavingsPlanRecommendation,
} from '@/hooks/useIncomeAllocation';
import { getApiErrorMessage } from '@/utils/errors';
import type { SavingsGoalWithProgress } from '@/types/goal';
import type {
  IncomeAllocationSetting,
  SavingsPlanRecommendation,
} from '@/types/incomeAllocation';

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
  archived: 'Đã lưu trữ',
  noDeadline: 'Không có thời hạn',
  needsPerMonth: (n: string) => `Cần ${n}/tháng`,
  affordabilityWarning: (needed: string, cap: string) =>
    `Các mục tiêu đang cần ${needed}/tháng, vượt quá phân bổ Tiết kiệm hiện tại (${cap}/tháng). Hãy điều chỉnh mục tiêu hoặc tăng phân bổ Tiết kiệm.`,
  // ── Savings-plan recommendation (backend-computed) ──────────────────────────
  planAdjustable: (needed: string, cap: string) =>
    `Các mục tiêu đang cần ${needed}/tháng, vượt quá phân bổ Tiết kiệm hiện tại (${cap}/tháng).`,
  planAdjustableFix: (savingsPct: string, wantsCap: string) =>
    `Có thể nâng hũ Tiết kiệm lên ${savingsPct}% và giảm hũ Muốn còn ${wantsCap}/tháng. Hũ Cần giữ nguyên.`,
  planApplyBtn: 'Áp dụng từ tháng sau',
  planApplying: 'Đang áp dụng...',
  planAppliedTitle: 'Đã đặt lịch',
  planAppliedMsg: (savingsPct: string) =>
    `Từ đầu tháng sau, hũ Tiết kiệm sẽ là ${savingsPct}%. Tháng này giữ nguyên.`,
  planApplyError: 'Không áp dụng được. Hãy thử lại.',
  planApplyStale: 'Mục tiêu vừa thay đổi nên đề xuất không còn phù hợp. Hãy kéo xuống để tải lại.',
  // Applying replaces next month's scheduled split. Warn first when that split isn't already
  // what we're about to write — silently discarding one the customer set themselves is a
  // surprise, not a convenience.
  planOverwriteTitle: 'Thay thế phân bổ đã đặt cho tháng sau?',
  planOverwriteMsg: (current: string, next: string) =>
    `Tháng sau bạn đã đặt ${current}. Áp dụng đề xuất sẽ thay bằng ${next}.`,
  planOverwriteConfirm: 'Thay thế',
  planSplitLabel: (needs: string, wants: string, savings: string) =>
    `Cần ${needs}% / Muốn ${wants}% / Tiết kiệm ${savings}%`,
  planInfeasible: (needed: string, max: string) =>
    `Các mục tiêu cần ${needed}/tháng nhưng kế hoạch hiện tại nhiều nhất chỉ dành ra được ${max}/tháng mà không cắt hũ Cần.`,
  planInfeasibleMonths: (months: number, when: string) =>
    `Cần ít nhất ${months} tháng tích luỹ, tức giãn thời hạn tới ${when}.`,
  // The month count is whole months from today, so it drops by one the day the deadline's
  // day-of-month falls behind today's. Without saying so, the number looks unstable.
  planMonthRuleNote: 'Số tháng tính tròn từ hôm nay, nên có thể đổi khi sang ngày mới.',
  planInfeasibleTarget: (amount: string) =>
    `Hoặc hạ mục tiêu xuống ${amount} nếu giữ nguyên thời hạn.`,
  planInfeasibleFallback: 'Hãy giãn thời hạn, hạ mục tiêu, hoặc tăng thu nhập.',
  planNoIncome: 'Chưa có thu nhập hàng tháng nên không tính được mức chi tiêu phù hợp. Hãy đặt thu nhập trong phần Phân bổ ngân sách.',
  // Positive confirmation, not a warning: without it the customer can't tell "checked, you're
  // fine" apart from "never checked".
  planOnTrack: (needed: string, cap: string) =>
    `Mục tiêu của bạn nằm trong phân bổ Tiết kiệm — cần ${needed}/tháng, hạn mức ${cap}/tháng.`,
  planNoDeadlineNote: (n: number) =>
    `${n} mục tiêu chưa có thời hạn nên không được tính vào con số trên. Mở từng mục tiêu để thêm thời hạn.`,
  // Single goal: name it and make the note the action, so the fix is one tap instead of a hunt.
  planNoDeadlineAction: (goalName: string) =>
    `"${goalName}" chưa có thời hạn nên không được tính vào con số trên. Chạm để thêm thời hạn.`,
  ok: 'OK',
  newGoalTitle: 'Tạo mục tiêu mới',
  nameLabel: 'Tên mục tiêu',
  namePlaceholder: 'VD: Mua MacBook Pro',
  targetLabel: 'Số tiền mục tiêu',
  targetPlaceholder: 'Nhập số tiền',
  deadlineLabel: 'Thời hạn',
  save: 'Tạo mục tiêu',
  cancel: 'Huỷ',
  saveError: 'Không thể lưu. Hãy thử lại.',
  months: [
    'Tháng 1','Tháng 2','Tháng 3','Tháng 4',
    'Tháng 5','Tháng 6','Tháng 7','Tháng 8',
    'Tháng 9','Tháng 10','Tháng 11','Tháng 12',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * "tháng 8/2027" for a count of whole months from today. The backend returns a month count, but
 * a user reading "cần ít nhất 12 tháng" still has to work out what date to type into the picker —
 * so name the month for them.
 */
function monthsFromNowLabel(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Drops a trailing `.00` so a whole percentage reads "25%", not "25.00%". */
function formatPct(pct: number): string {
  return String(Number(pct.toFixed(2)));
}

function formatVND(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return amount.toLocaleString('vi-VN');
}

/**
 * Exact đồng, no compaction. The savings-plan banner uses this instead of `formatVND` because
 * its figures are the ones a customer cross-checks against the Budget Allocation screen — and
 * `formatVND` renders 1.176.471đ as "1.2M", which reads as a different number from the 23,53%
 * shown there. Compact form is still right on the goal cards, where space is tight and nothing
 * has to reconcile.
 */
function formatExactVND(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

function daysUntil(isoDate: string | null): number {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** YYYY-MM-DD for `days` from today (local time). */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * The one goal the "add a deadline" shortcut should open, or null when there isn't exactly one.
 *
 * Two sources have to agree: the backend's count (which is what the banner's other figures were
 * computed against) and the local goal list (which is what a tap can actually navigate to). When
 * they disagree — a goal completed or archived between the two reads — the note stays plain text
 * rather than sending the customer to a goal that isn't the one being skipped.
 *
 * Exported for testing: silently opening the wrong goal is the kind of defect nothing else here
 * would catch.
 */
export function resolveSingleMissingDeadlineGoal<T>(
  backendCount: number,
  localGoalsMissingDeadline: readonly T[],
): T | null {
  if (backendCount !== 1 || localGoalsMissingDeadline.length !== 1) return null;
  return localGoalsMissingDeadline[0];
}

/**
 * Would applying the recommendation discard a *different* split the customer already scheduled
 * for next month?
 *
 * Exported so it's directly testable. Applying upserts next month's row, so an existing draft is
 * replaced silently — that was a real data-loss surprise in testing (a hand-set 61/23,4/15,6 was
 * overwritten with no prompt). Re-applying an identical split is still a no-op the user
 * shouldn't have to confirm, hence the comparison rather than a bare null check.
 */
export function replacesDifferentPendingSplit(
  pending: Pick<IncomeAllocationSetting, 'needsPct' | 'wantsPct' | 'savingsPct'> | null | undefined,
  proposed: { needsPct: number | null; wantsPct: number | null; savingsPct: number | null },
): boolean {
  if (!pending) return false;
  return (
    pending.needsPct !== proposed.needsPct ||
    pending.wantsPct !== proposed.wantsPct ||
    pending.savingsPct !== proposed.savingsPct
  );
}

/**
 * Do this month's active goals collectively need more than the customer's own
 * Savings allocation? Exported so the comparison is directly testable —
 * neither the mobile mock nor the real backend compares these two numbers on
 * its own, so a customer can otherwise commit to goals their own plan can't
 * fund with no warning anywhere in the app.
 */
export function computeGoalAffordability(
  activeGoals: Pick<SavingsGoalWithProgress, 'requiredMonthlySaving'>[],
  savingsCap: number,
): { totalRequiredMonthly: number; isOverAllocated: boolean } {
  const totalRequiredMonthly = activeGoals.reduce((sum, g) => sum + g.requiredMonthlySaving, 0);
  return {
    totalRequiredMonthly,
    isOverAllocated: savingsCap > 0 && totalRequiredMonthly > savingsCap,
  };
}

function deadlineBadge(goal: SavingsGoalWithProgress, colors: ThemeColors): { label: string; color: string; bg: string } {
  if (goal.isDeleted) return { label: S.archived, color: colors.onSurfaceVariant, bg: colors.surfaceVariant };
  if (goal.isCompleted) return { label: S.completed, color: colors.tertiary, bg: withAlpha(colors.tertiary, 0.13) };
  if (!goal.deadline) return { label: S.noDeadline, color: colors.onSurfaceVariant, bg: colors.surfaceVariant };
  const days = daysUntil(goal.deadline);
  if (days <= 30) return { label: S.daysLeft(days), color: colors.secondary, bg: withAlpha(colors.secondary, 0.13) };
  return { label: S.monthsLeft(goal.monthsRemaining), color: colors.onSurfaceVariant, bg: colors.surfaceVariant };
}

function barColor(goal: SavingsGoalWithProgress, colors: ThemeColors): string {
  if (goal.isCompleted) return colors.tertiary;
  if (goal.progressPercentage >= 75) return colors.primary;
  return colors.secondary;
}

// ─── New Goal Sheet ───────────────────────────────────────────────────────────

function NewGoalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const createGoal = useCreateGoal();
  const [name, setName] = useState('');
  const [targetRaw, setTargetRaw] = useState('');
  // Default the deadline to 90 days out so it's always valid + in the future.
  const [deadline, setDeadline] = useState(() => isoDaysFromNow(90));
  const [targetFocused, setTargetFocused] = useState(false);

  // Deadline must be in the future — earliest selectable date is tomorrow.
  const minDeadline = isoDaysFromNow(1);

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
    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        targetAmount: parsedTarget,
        deadline,
      });
      setName(''); setTargetRaw(''); setDeadline(isoDaysFromNow(90)); setTargetFocused(false);
      onClose();
    } catch (err) {
      Alert.alert('', getApiErrorMessage(err, S.saveError));
    }
  }, [name, parsedTarget, deadline, createGoal, onClose]);

  const isValid = name.trim() && targetRaw && deadline.match(/^\d{4}-\d{2}-\d{2}$/);

  return (
    <>
    <DraggableSheet visible={visible} onClose={onClose}>
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={[styles.sheet, targetFocused && { paddingBottom: NUMPAD_HEIGHT }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sheetTitle}>{S.newGoalTitle}</Text>

        <Text style={styles.fieldLabel}>{S.nameLabel}</Text>
        <TextInput value={name} onChangeText={setName}
          placeholder={S.namePlaceholder}
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
          <MaterialIcon name="dialpad" size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>{S.deadlineLabel}</Text>
        <DatePickerField
          value={deadline}
          onChange={setDeadline}
          minDate={minDeadline}
        />

        <View style={styles.sheetActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.saveBtn, (!isValid || createGoal.isPending) && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!isValid || createGoal.isPending}>
            {createGoal.isPending
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <Text style={styles.saveText}>{S.save}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const badge = deadlineBadge(goal, colors);
  const color = barColor(goal, colors);
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
            <View style={[styles.goalIconWrap, { backgroundColor: withAlpha(colors.primary, 0.13) }]}>
              <MaterialIcon name="savings" size={20} color={colors.primary} />
            </View>
          )}
          <View style={styles.goalNameWrap}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            {/* monthlySavingNeeded is genuinely undefined without a deadline (both
                mock and real agree) — show nothing rather than a fabricated
                0đ/tháng or remaining/1 figure. Unreachable via the app's own
                create flow today (deadline is required), kept defensive. */}
            {!isCompleted && goal.deadline && (
              <Text style={styles.goalMonthly}>
                {S.needsPerMonth(formatVND(goal.requiredMonthlySaving) + 'đ')}
              </Text>
            )}
            {isCompleted && (
              <Text style={[styles.goalMonthly, { color: colors.tertiary }]}>
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
          <Text style={[styles.goalCurrent, isCompleted && { color: colors.tertiary }]}>
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

// ─── Savings-plan banner ──────────────────────────────────────────────────────

/**
 * Renders the backend's savings-plan verdict. Only the three statuses the
 * customer can act on show anything — `on_track`, `no_goals` and
 * `invalid_allocation` render nothing, because a banner saying "everything is
 * fine" on a screen that already shows every goal's progress is just noise.
 */
function SavingsPlanBanner({
  plan,
  isApplying,
  onApply,
  goalsMissingDeadline,
  onOpenGoal,
}: {
  plan: SavingsPlanRecommendation;
  isApplying: boolean;
  onApply: () => void;
  /** Active goals with no deadline, from the list this banner sits above. */
  goalsMissingDeadline: SavingsGoalWithProgress[];
  onOpenGoal: (goal: SavingsGoalWithProgress) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /**
   * Goals with no deadline are excluded from the figures above — say so, and where possible let
   * the user act on it instead of leaving them to work out that a deadline is what's missing.
   *
   * The count comes from the backend so it can't contradict the numbers it qualifies, but the
   * tap needs a real goal object. Only offered when both sources agree there is exactly one;
   * if they disagree the note stays plain text rather than sending the user to the wrong goal.
   */
  const missingDeadlineCount = plan.goalsWithoutDeadline;
  const singleMissingGoal = resolveSingleMissingDeadlineGoal(
    missingDeadlineCount,
    goalsMissingDeadline,
  );

  const deadlineNote =
    missingDeadlineCount > 0 ? (
      singleMissingGoal ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onOpenGoal(singleMissingGoal)}
          accessibilityRole="button"
          accessibilityLabel={S.planNoDeadlineAction(singleMissingGoal.name)}>
          <Text style={styles.planBannerNoteLink}>
            {S.planNoDeadlineAction(singleMissingGoal.name)}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.planBannerNote}>
          {S.planNoDeadlineNote(missingDeadlineCount)}
        </Text>
      )
    ) : null;

  // Nothing to fund, or a split that can't produce a proposal — the empty state and the goal
  // list already say everything there is to say.
  if (plan.status === 'no_goals' || plan.status === 'invalid_allocation') {
    return null;
  }

  // Confirm explicitly when the plan already covers the goals. Rendering nothing leaves the
  // customer unable to tell "checked, you're fine" apart from "never checked" — the ambiguity
  // an external review flagged. Kept visually quiet: a single positive line, not a warning card.
  if (plan.status === 'on_track') {
    return (
      <View style={styles.planOkBanner}>
        <MaterialIcon name="check_circle" size={18} color={colors.tertiary} />
        <View style={styles.planBannerBody}>
          <Text style={styles.planOkText}>
            {S.planOnTrack(
              formatExactVND(plan.requiredMonthlySavings),
              formatExactVND(plan.currentSavingsCap),
            )}
          </Text>
          {deadlineNote}
        </View>
      </View>
    );
  }

  if (plan.status === 'no_income') {
    return (
      <View style={styles.affordabilityBanner}>
        <MaterialIcon name="warning" size={18} color={colors.secondary} />
        <Text style={styles.affordabilityBannerText}>{S.planNoIncome}</Text>
      </View>
    );
  }

  if (plan.status === 'infeasible') {
    // The plan already knows how far the deadline would have to move, and — for a single goal —
    // how far the target would have to drop. Showing only "hãy giãn thời hạn" would make the
    // user guess at a number the system has already computed.
    // `typeof === 'number'`, not `!== null`: against a backend that predates these fields they
    // arrive as `undefined`, and `undefined !== null` is true — which would render
    // "Cần ít nhất undefined tháng" instead of falling back.
    const months = typeof plan.minimumMonthsToFund === 'number' ? plan.minimumMonthsToFund : null;
    const maxTarget =
      typeof plan.maximumFundableTargetAmount === 'number'
        ? plan.maximumFundableTargetAmount
        : null;
    const hasConcreteFix = months !== null || maxTarget !== null;

    return (
      <View style={styles.affordabilityBanner}>
        <MaterialIcon name="warning" size={18} color={colors.secondary} />
        <View style={styles.planBannerBody}>
          <Text style={styles.affordabilityBannerText}>
            {S.planInfeasible(
              formatExactVND(plan.requiredMonthlySavings),
              formatExactVND(plan.maxFundableMonthlySavings ?? 0),
            )}
          </Text>
          {months !== null && (
            <>
              <Text style={styles.affordabilityBannerText}>
                {S.planInfeasibleMonths(months, monthsFromNowLabel(months))}
              </Text>
              <Text style={styles.planBannerNote}>{S.planMonthRuleNote}</Text>
            </>
          )}
          {maxTarget !== null && (
            <Text style={styles.affordabilityBannerText}>
              {S.planInfeasibleTarget(formatExactVND(maxTarget))}
            </Text>
          )}
          {/* No headroom at all (ceiling is 0) — there is genuinely no number to offer. */}
          {!hasConcreteFix && (
            <Text style={styles.affordabilityBannerText}>{S.planInfeasibleFallback}</Text>
          )}
          {deadlineNote}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.affordabilityBanner}>
      <MaterialIcon name="warning" size={18} color={colors.secondary} />
      <View style={styles.planBannerBody}>
        <Text style={styles.affordabilityBannerText}>
          {S.planAdjustable(
            formatExactVND(plan.requiredMonthlySavings),
            formatExactVND(plan.currentSavingsCap),
          )}
        </Text>
        <Text style={styles.affordabilityBannerText}>
          {S.planAdjustableFix(
            formatPct(plan.proposedSavingsPct ?? 0),
            formatExactVND(plan.proposedWantsCap ?? 0),
          )}
        </Text>
        {deadlineNote}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.planApplyBtn, isApplying && styles.planApplyBtnDisabled]}
          onPress={onApply}
          disabled={isApplying}
          accessibilityRole="button"
          accessibilityLabel={S.planApplyBtn}
          accessibilityState={{ disabled: isApplying, busy: isApplying }}>
          {isApplying ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.planApplyBtnText}>{S.planApplyBtn}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { data: goals = [], isLoading, isError, error, refetch } = useGoals();
  const {
    data: archivedGoals = [],
    isError: isArchivedError,
    error: archivedError,
    refetch: refetchArchived,
  } = useArchivedGoals();
  const { data: bucketAllocation } = useBudgetBuckets();
  const { data: savingsPlan, refetch: refetchPlan } = useSavingsPlanRecommendation();
  const applyPlan = useApplySavingsPlanRecommendation();
  const [newGoalVisible, setNewGoalVisible] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  const activeGoals = useMemo(() =>
    (goals as SavingsGoalWithProgress[]).filter((g) => !g.isDeleted && !g.isCompleted)
      .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline)),
    [goals]);

  // The banner reports how many goals its figures had to skip; this is the same set locally, so
  // it can offer to open the one that needs a deadline instead of only naming the problem.
  const goalsMissingDeadline = useMemo(
    () => activeGoals.filter((g) => !g.deadline),
    [activeGoals],
  );

  // `savingsCap` is already an absolute VND amount, correctly scaled (see
  // real/budgets.ts's toBucket normalization) — no further conversion needed.
  const savingsCap = bucketAllocation?.buckets.find((b) => b.bucket === 'savings')?.allocationCap ?? 0;
  const { totalRequiredMonthly, isOverAllocated } = useMemo(
    () => computeGoalAffordability(activeGoals, savingsCap),
    [activeGoals, savingsCap],
  );

  // The backend now does this comparison and can also propose a fix, so prefer
  // it. `savingsPlan` is null against a deployment that predates the endpoint
  // (see real/incomeAllocation.ts) — fall back to the local check then, so the
  // warning never silently disappears mid-rollout.
  const showLocalWarning = !savingsPlan && isOverAllocated;

  const runApplyPlan = useCallback(() => {
    applyPlan.mutate(undefined, {
      onSuccess: (scheduled) => {
        Alert.alert(S.planAppliedTitle, S.planAppliedMsg(formatPct(scheduled.savingsPct)));
      },
      onError: (err) => {
        // A 422 here means the plan went stale between fetch and tap (a goal was
        // edited or contributed to elsewhere) — the backend recomputes and
        // refuses rather than writing a split that no longer fits.
        Alert.alert(S.planApplyError, getApiErrorMessage(err, S.planApplyStale));
      },
    });
  }, [applyPlan]);

  const handleApplyPlan = useCallback(() => {
    const pending = savingsPlan?.pendingBeforeApply ?? null;

    const replacesDifferentSplit = replacesDifferentPendingSplit(pending, {
      needsPct: savingsPlan?.proposedNeedsPct ?? null,
      wantsPct: savingsPlan?.proposedWantsPct ?? null,
      savingsPct: savingsPlan?.proposedSavingsPct ?? null,
    });

    if (!replacesDifferentSplit || pending === null) {
      runApplyPlan();
      return;
    }

    Alert.alert(
      S.planOverwriteTitle,
      S.planOverwriteMsg(
        S.planSplitLabel(
          formatPct(pending.needsPct),
          formatPct(pending.wantsPct),
          formatPct(pending.savingsPct),
        ),
        S.planSplitLabel(
          formatPct(savingsPlan?.proposedNeedsPct ?? 0),
          formatPct(savingsPlan?.proposedWantsPct ?? 0),
          formatPct(savingsPlan?.proposedSavingsPct ?? 0),
        ),
      ),
      [
        { text: S.cancel, style: 'cancel' },
        { text: S.planOverwriteConfirm, style: 'destructive', onPress: runApplyPlan },
      ],
    );
  }, [savingsPlan, runApplyPlan]);

  const completedGoals = useMemo(() =>
    (goals as SavingsGoalWithProgress[]).filter((g) => !g.isDeleted && g.isCompleted),
    [goals]);

  const handleGoalPress = useCallback((goal: SavingsGoalWithProgress) => {
    router.push({ pathname: '/(tabs)/budgets/goals/[id]', params: { id: goal.id } });
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchArchived(), refetchPlan()]);
  }, [refetch, refetchArchived, refetchPlan]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || isArchivedError)
    return (
      <ErrorState
        message={((error ?? archivedError) as Error)?.message}
        onRetry={handleRefresh}
      />
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn}
          onPress={() => router.dismissTo('/(tabs)/budgets')}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name="arrow_back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.createBtn}
          onPress={() => setNewGoalVisible(true)}>
          <MaterialIcon name="add" size={16} color={colors.onBackground} />
          <Text style={styles.createBtnText}>{S.createBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle pill */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggle}>
          <TouchableOpacity activeOpacity={0.7} style={styles.toggleOption}
            onPress={() => router.dismissTo('/(tabs)/budgets')}>
            <Text style={styles.toggleTextInactive}>{S.tabBudget}</Text>
          </TouchableOpacity>
          <View style={[styles.toggleOption, styles.toggleOptionActive]}>
            <Text style={styles.toggleTextActive}>{S.tabGoals}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />}>

        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcon name="savings" size={48} color={colors.outlineVariant} />
            <Text style={styles.emptyTitle}>{S.emptyTitle}</Text>
            <Text style={styles.emptyHint}>{S.emptyHint}</Text>
          </View>
        ) : (
          <>
            {showLocalWarning && (
              <View style={styles.affordabilityBanner}>
                <MaterialIcon name="warning" size={18} color={colors.secondary} />
                <Text style={styles.affordabilityBannerText}>
                  {S.affordabilityWarning(formatVND(totalRequiredMonthly), formatVND(savingsCap))}
                </Text>
              </View>
            )}
            {savingsPlan && (
              <SavingsPlanBanner
                plan={savingsPlan}
                isApplying={applyPlan.isPending}
                onApply={handleApplyPlan}
                goalsMissingDeadline={goalsMissingDeadline}
                onOpenGoal={handleGoalPress}
              />
            )}
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onPress={() => handleGoalPress(goal)} />
            ))}
            {completedGoals.length > 0 && (
              <>
                <View style={styles.sectionDivider}>
                  <MaterialIcon name="check_circle" size={14} color={colors.tertiary} />
                  <Text style={styles.sectionDividerText}>Đã hoàn thành</Text>
                </View>
                {completedGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onPress={() => handleGoalPress(goal)} />
                ))}
              </>
            )}
          </>
        )}

        {archivedGoals.length > 0 && (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.archivedHeader}
              onPress={() => setIsArchivedExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isArchivedExpanded }}
            >
              <View style={styles.archivedHeaderLabel}>
                <MaterialIcon name="archive" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.archivedHeaderText}>{S.archived}</Text>
                <Text style={styles.archivedCount}>{archivedGoals.length}</Text>
              </View>
              <MaterialIcon
                name={isArchivedExpanded ? 'expand_less' : 'expand_more'}
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {isArchivedExpanded && archivedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onPress={() => handleGoalPress(goal)} />
            ))}
          </>
        )}
      </ScrollView>

      <NewGoalSheet visible={newGoalVisible} onClose={() => setNewGoalVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerTitle: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[1],
    backgroundColor: colors.inversePrimary, paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2], borderRadius: BORDER_RADIUS.full,
  },
  createBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onBackground },
  toggleWrap: { paddingHorizontal: SPACING[4], marginBottom: SPACING[2] },
  toggle: {
    flexDirection: 'row', backgroundColor: colors.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.full, padding: 4,
  },
  toggleOption: { flex: 1, paddingVertical: SPACING[2], alignItems: 'center', borderRadius: BORDER_RADIUS.full },
  toggleOptionActive: { backgroundColor: colors.primary },
  toggleTextActive: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onPrimary },
  toggleTextInactive: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[3] },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING[16], gap: SPACING[3] },
  emptyTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  emptyHint: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, textAlign: 'center' },
  affordabilityBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2],
    backgroundColor: withAlpha(colors.secondary, 0.1),
    borderWidth: 1, borderColor: withAlpha(colors.secondary, 0.3),
    borderRadius: BORDER_RADIUS.lg, padding: SPACING[3],
  },
  affordabilityBannerText: { flex: 1, fontSize: FONT_SIZE.xs, color: colors.onSurface, lineHeight: 18 },
  planBannerBody: { flex: 1, gap: SPACING[2] },
  planBannerNote: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, lineHeight: 18 },
  planBannerNoteLink: {
    fontSize: FONT_SIZE.xs, color: colors.primary, lineHeight: 18,
    fontWeight: FONT_WEIGHT.semibold, textDecorationLine: 'underline',
  },
  // Deliberately lighter than affordabilityBanner: this confirms rather than warns, so it uses
  // the positive tone and no heavy border.
  planOkBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2],
    backgroundColor: withAlpha(colors.tertiary, 0.08),
    borderRadius: BORDER_RADIUS.lg, padding: SPACING[3],
  },
  planOkText: { flex: 1, fontSize: FONT_SIZE.xs, color: colors.onSurface, lineHeight: 18 },
  planApplyBtn: {
    alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full, backgroundColor: colors.primary,
  },
  planApplyBtnDisabled: { opacity: 0.6 },
  planApplyBtnText: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onPrimary,
  },
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    paddingVertical: SPACING[2], borderTopWidth: 1, borderTopColor: colors.surfaceVariant,
    marginTop: SPACING[2],
  },
  sectionDividerText: { fontSize: FONT_SIZE.xs, color: colors.tertiary, fontWeight: FONT_WEIGHT.semibold },
  archivedHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING[3], borderTopWidth: 1, borderTopColor: colors.surfaceVariant,
    marginTop: SPACING[2],
  },
  archivedHeaderLabel: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  archivedHeaderText: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, fontWeight: FONT_WEIGHT.semibold },
  archivedCount: {
    minWidth: 22, paddingHorizontal: SPACING[1], paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full, backgroundColor: colors.surfaceVariant,
    fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, textAlign: 'center',
  },
  // Goal card
  goalCard: {
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], borderWidth: 1, borderColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  goalCardCompleted: { borderColor: withAlpha(colors.tertiary, 0.19) },
  completedAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: withAlpha(colors.tertiary, 0.38),
  },
  goalCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING[3] },
  goalCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], flex: 1 },
  goalIconWrap: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center',
  },
  goalEmoji: { fontSize: 20 },
  goalNameWrap: { flex: 1 },
  goalName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  goalMonthly: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginTop: 2 },
  badgeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING[2], paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full, flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold },
  goalProgress: { gap: SPACING[1] },
  goalProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  goalCurrent: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  goalTarget: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
  barTrack: { height: 4, backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  // Sheet
  sheetScroll: {
    // Bounded so the form scrolls inside the sheet and the Save button is always reachable.
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  amountDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountDisplayFocused: { borderColor: colors.primary },
  amountText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  amountPlaceholder: { color: colors.onSurfaceVariant, fontWeight: FONT_WEIGHT.normal },
  sheetHandle: {
    width: 40, height: 4, borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: SPACING[4],
  },
  sheetTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, marginBottom: SPACING[4] },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant, marginBottom: SPACING[1], marginTop: SPACING[3] },
  fieldInput: {
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48,
    fontSize: FONT_SIZE.sm, color: colors.onSurface,
  },
  sheetActions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[6] },
  cancelBtn: {
    flex: 1, height: 56, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant },
  saveBtn: {
    flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onPrimary },
  });
}
