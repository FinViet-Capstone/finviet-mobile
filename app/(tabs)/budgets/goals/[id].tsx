import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { TextInput } from '@/components/common/TextInput';
import { WalletPickerSheet } from '@/components/transaction/WalletPickerSheet';
import { DatePickerField } from '@/components/common/DatePickerField';
import {
  useGoalById,
  useAddContribution,
  useDeleteGoal,
  useGoalContributions,
  useUpdateGoal,
  useWithdrawFromGoal,
} from '@/hooks/useGoals';
import { useWallets } from '@/hooks/useWallets';
import { getApiErrorMessage } from '@/utils/errors';
import { executeGoalWithdrawal } from '@/utils/goalWithdrawal';
import type { SavingsGoalWithProgress, GoalContribution, UpdateGoalInput } from '@/types/goal';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  back: 'arrow_back',
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
  sourceLabel: 'Nguồn tiền (ví)',
  sourcePlaceholder: 'Chọn ví để trích tiền',
  noBasicWallet: 'Bạn chưa có ví cơ bản nào để trích tiền.',
  save: 'Lưu',
  cancel: 'Huỷ',
  saveError: 'Không thể lưu. Hãy thử lại.',
  available: (s: string) => `Số dư khả dụng: ${s}`,
  errInsufficient: (s: string) => `Số dư ví không đủ (Hiện có: ${s})`,
  errOverRemaining: (s: string) => `Chỉ cần ${s} là đủ`,
  zeroBalance: (name: string) => `Ví ${name} đã hết số dư. Vui lòng chọn ví khác.`,
  edit: 'Sửa mục tiêu',
  editTitle: 'Sửa mục tiêu',
  editNameLabel: 'Tên mục tiêu',
  editNamePlaceholder: 'VD: Mua MacBook Pro',
  editTargetLabel: 'Số tiền mục tiêu',
  editTargetPlaceholder: 'Nhập số tiền',
  editDeadlineLabel: 'Thời hạn',
  editSave: 'Lưu thay đổi',
  editNoChange: 'Chưa có thay đổi nào',
  // Mirrors the backend rule (target can't drop below what's already saved) so the user is told
  // before they submit, instead of getting a server error back.
  editTargetBelowSaved: (s: string) => `Không thể đặt thấp hơn số đã tiết kiệm (${s})`,
  editError: 'Không lưu được thay đổi. Hãy thử lại.',
  archiveTitle: 'Lưu trữ mục tiêu?',
  archiveMsg: 'Mục tiêu sẽ chuyển vào mục Đã lưu trữ. Lịch sử đóng góp và giao dịch vẫn được giữ nguyên.',
  archiveConfirm: 'Lưu trữ',
  withdrawBeforeArchiveTitle: 'Rút hết tiền trước khi lưu trữ',
  withdrawBeforeArchiveMsg:
    'Hãy rút toàn bộ số tiền còn lại về một ví thường. Sau khi số dư mục tiêu bằng 0đ, bạn có thể lưu trữ mục tiêu.',
  gotIt: 'Đã hiểu',
  archiveError: 'Không thể lưu trữ mục tiêu. Vui lòng thử lại.',
  archived: 'Đã lưu trữ',
  noDeadline: 'Không có thời hạn',
  noHistory: 'Chưa có lần nào đóng góp',
  withdraw: 'Rút tiền',
  withdrawTitle: 'Rút tiền tiết kiệm',
  fillAll: 'Tất cả',
  destLabel: 'Ví nhận tiền',
  destPlaceholder: 'Chọn ví nhận tiền',
  errOverSaved: (s: string) => `Vượt số tiền đã tiết kiệm (${s})`,
  availableSaved: (s: string) => `Đã tiết kiệm: ${s}`,
  historyContribNote: 'Nạp tiền tiết kiệm',
  historyWithdrawNote: 'Rút tiền tiết kiệm',
  withdrawError: 'Không thể rút tiền tiết kiệm. Vui lòng thử lại.',
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

function formatDate(iso: string | null): string {
  if (!iso) return S.noDeadline;
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const addContrib = useAddContribution();
  const { data: walletData } = useWallets();
  const [amountRaw, setAmountRaw] = useState('');
  const [note, setNote] = useState('');
  const [walletPickerVisible, setWalletPickerVisible] = useState(false);
  // Numpad is a screen-level modal overlay (NOT a child of the sheet — that would
  // clip its absolute-fill). Auto-open when the sheet opens; Done/outside dismisses.
  const [amountFocused, setAmountFocused] = useState(true);
  useEffect(() => { if (visible) setAmountFocused(true); }, [visible]);

  // Only basic wallets can fund a contribution — deducting from a bank-linked wallet
  // would desync it from the real account, so those are excluded as sources.
  const basicWallets = (walletData?.wallets ?? []).filter((w) => w.type !== 'linked');
  const totalBasicBalance = basicWallets.reduce((s, w) => s + w.balance, 0);

  // The chosen source wallet. Default to the goal's funding wallet if it's basic,
  // otherwise the first available basic wallet.
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    const preferred = goal.fundingWalletId
      && basicWallets.some((w) => w.id === goal.fundingWalletId)
      ? goal.fundingWalletId
      : basicWallets[0]?.id ?? null;
    setSelectedWalletId(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const fundingWallet = selectedWalletId
    ? basicWallets.find((w) => w.id === selectedWalletId)
    : undefined;
  const walletBalance = fundingWallet ? fundingWallet.balance : null;
  const zeroBalance = walletBalance !== null && walletBalance <= 0;

  const parsedAmount = parseInt(amountRaw || '0', 10);
  const amountDisplay = parsedAmount > 0 ? parsedAmount.toLocaleString('vi-VN') + 'đ' : '';

  const overBalance = walletBalance !== null && parsedAmount > walletBalance;
  const overRemaining = !overBalance && parsedAmount > goal.remainingAmount;
  const hasError = parsedAmount > 0 && (overBalance || overRemaining);
  const canSave =
    !!amountRaw && parsedAmount > 0 && !hasError && !zeroBalance
    && !!selectedWalletId && !addContrib.isPending;

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
    try {
      await addContrib.mutateAsync({
        goalId: goal.id,
        input: {
          amount: parsedAmount,
          note: note.trim() || undefined,
          fundingWalletId: selectedWalletId ?? undefined,
        },
      });
      setAmountRaw(''); setNote('');
      onClose();
    } catch (err) {
      Alert.alert('', getApiErrorMessage(err, S.saveError));
    }
  }, [canSave, parsedAmount, note, selectedWalletId, goal.id, addContrib, onClose]);

  return (
    <>
    <DraggableSheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={[
          styles.sheet,
          amountFocused && !zeroBalance && { paddingBottom: NUMPAD_HEIGHT },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sheetTitle}>{S.contribTitle}</Text>

        {/* Source wallet — the money is deducted from here */}
        <Text style={styles.fieldLabel}>{S.sourceLabel}</Text>
        {basicWallets.length === 0 ? (
          <View style={styles.zeroBalanceBox}>
            <MaterialIcon name="account_balance_wallet" size={18} color={colors.error} />
            <Text style={styles.zeroBalanceText}>{S.noBasicWallet}</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.walletSelectRow}
            onPress={() => { setAmountFocused(false); setWalletPickerVisible(true); }}
          >
            <MaterialIcon name="account_balance_wallet" size={18} color={colors.primary} />
            <Text style={[styles.walletSelectText, !fundingWallet && styles.amountPlaceholder]}>
              {fundingWallet ? fundingWallet.name : S.sourcePlaceholder}
            </Text>
            {fundingWallet ? (
              <Text style={styles.walletSelectBalance}>{formatFull(fundingWallet.balance)}</Text>
            ) : null}
            <MaterialIcon name="expand_more" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}

        {zeroBalance ? (
          <View style={styles.zeroBalanceBox}>
            <MaterialIcon name="account_balance_wallet" size={18} color={colors.error} />
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
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={S.notePlaceholder}
          onFocus={() => setAmountFocused(false)}
          returnKeyType="done"
        />

        <View style={styles.sheetActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!canSave}>
            {addContrib.isPending
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <Text style={styles.saveText}>{S.save}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </DraggableSheet>
    <NumericKeypad
      visible={visible && amountFocused && !zeroBalance}
      onClose={() => setAmountFocused(false)}
      onNumberPress={handleNumberPress}
      onBackspace={handleBackspace}
      onClear={handleClear}
      onDone={() => setAmountFocused(false)}
    />
    <WalletPickerSheet
      visible={walletPickerVisible}
      wallets={basicWallets}
      selectedWalletId={selectedWalletId}
      totalBalance={totalBasicBalance}
      onSelect={(id) => { setSelectedWalletId(id); setWalletPickerVisible(false); }}
      onClose={() => setWalletPickerVisible(false)}
    />
    </>
  );
}

// ─── Withdraw Sheet ───────────────────────────────────────────────────────────

function WithdrawSheet({
  visible,
  goal,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  goal: SavingsGoalWithProgress;
  onClose: () => void;
  onSuccess: (drainedGoal: boolean) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const withdraw = useWithdrawFromGoal();
  const { data: walletData } = useWallets();
  const [amountRaw, setAmountRaw] = useState('');
  const [note, setNote] = useState('');
  const [walletPickerVisible, setWalletPickerVisible] = useState(false);
  const [amountFocused, setAmountFocused] = useState(true);
  useEffect(() => {
    if (!visible) return;
    setAmountRaw('');
    setAmountFocused(true);
  }, [visible]);

  // Only basic wallets can receive a withdrawal — crediting a bank-linked wallet
  // would desync it from the real account, same restriction as contributions.
  const basicWallets = (walletData?.wallets ?? []).filter((w) => w.type !== 'linked');
  const totalBasicBalance = basicWallets.reduce((s, w) => s + w.balance, 0);

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    const preferred = goal.fundingWalletId
      && basicWallets.some((w) => w.id === goal.fundingWalletId)
      ? goal.fundingWalletId
      : basicWallets[0]?.id ?? null;
    setSelectedWalletId(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const destWallet = selectedWalletId
    ? basicWallets.find((w) => w.id === selectedWalletId)
    : undefined;

  const parsedAmount = parseInt(amountRaw || '0', 10);
  const amountDisplay = parsedAmount > 0 ? parsedAmount.toLocaleString('vi-VN') + 'đ' : '';

  const overSaved = parsedAmount > goal.currentAmount;
  const hasError = parsedAmount > 0 && overSaved;
  const canSave =
    !!amountRaw && parsedAmount > 0 && !hasError
    && !!selectedWalletId && !withdraw.isPending;

  const handleNumberPress = useCallback((key: string) => {
    setAmountRaw((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
  }, []);

  const handleBackspace = useCallback(() => setAmountRaw((prev) => prev.slice(0, -1)), []);
  const handleClear = useCallback(() => setAmountRaw(''), []);

  // Quick-fill the full saved amount — the only way to reach a zero balance
  // (required before archiving) without typing the whole number by hand.
  const handleFillAll = useCallback(() => {
    setAmountRaw(String(goal.currentAmount));
    setAmountFocused(false);
  }, [goal.currentAmount]);

  const handleSave = useCallback(async () => {
    if (!canSave || !selectedWalletId) return;

    await executeGoalWithdrawal({
      mutate: () => withdraw.mutateAsync({
        goalId: goal.id,
        input: {
          amount: parsedAmount,
          walletId: selectedWalletId,
          note: note.trim() || undefined,
        },
      }),
      drainedGoal: parsedAmount >= goal.currentAmount,
      onSuccess: (drainedGoal) => {
        setAmountRaw('');
        setNote('');
        onClose();
        onSuccess(drainedGoal);
      },
      onError: (withdrawError) => {
        Alert.alert('', getApiErrorMessage(withdrawError, S.withdrawError));
      },
    });
  }, [
    canSave,
    parsedAmount,
    note,
    selectedWalletId,
    goal.id,
    goal.currentAmount,
    withdraw,
    onClose,
    onSuccess,
  ]);

  return (
    <>
    <DraggableSheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={[
          styles.sheet,
          amountFocused && { paddingBottom: NUMPAD_HEIGHT },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sheetTitle}>{S.withdrawTitle}</Text>

        <Text style={styles.fieldLabel}>{S.destLabel}</Text>
        {basicWallets.length === 0 ? (
          <View style={styles.zeroBalanceBox}>
            <MaterialIcon name="account_balance_wallet" size={18} color={colors.error} />
            <Text style={styles.zeroBalanceText}>{S.noBasicWallet}</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.walletSelectRow}
            onPress={() => { setAmountFocused(false); setWalletPickerVisible(true); }}
          >
            <MaterialIcon name="account_balance_wallet" size={18} color={colors.primary} />
            <Text style={[styles.walletSelectText, !destWallet && styles.amountPlaceholder]}>
              {destWallet ? destWallet.name : S.destPlaceholder}
            </Text>
            {destWallet ? (
              <Text style={styles.walletSelectBalance}>{formatFull(destWallet.balance)}</Text>
            ) : null}
            <MaterialIcon name="expand_more" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}

        <View style={styles.amountLabelRow}>
          <Text style={[styles.fieldLabel, styles.fieldLabelInRow]}>{S.amountLabel}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.fillAllChip}
            onPress={handleFillAll}
            accessibilityRole="button"
            accessibilityLabel={S.fillAll}
          >
            <Text style={styles.fillAllText}>{S.fillAll}</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.errorText}>{S.errOverSaved(formatFull(goal.currentAmount))}</Text>
        ) : (
          <Text style={styles.helperText}>{S.availableSaved(formatFull(goal.currentAmount))}</Text>
        )}

        <Text style={styles.fieldLabel}>{S.noteLabel}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={S.notePlaceholder}
          onFocus={() => setAmountFocused(false)}
          returnKeyType="done"
        />

        <View style={styles.sheetActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!canSave}>
            {withdraw.isPending
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <Text style={styles.saveText}>{S.save}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </DraggableSheet>
    <NumericKeypad
      visible={visible && amountFocused}
      onClose={() => setAmountFocused(false)}
      onNumberPress={handleNumberPress}
      onBackspace={handleBackspace}
      onClear={handleClear}
      onDone={() => setAmountFocused(false)}
    />
    <WalletPickerSheet
      visible={walletPickerVisible}
      wallets={basicWallets}
      selectedWalletId={selectedWalletId}
      totalBalance={totalBasicBalance}
      onSelect={(id) => { setSelectedWalletId(id); setWalletPickerVisible(false); }}
      onClose={() => setWalletPickerVisible(false)}
    />
    </>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

/** YYYY-MM-DD for `days` from today (local time). */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The fields that actually changed, as a sparse patch.
 *
 * Exported so it's directly testable: the backend treats an omitted field as "leave alone" and
 * re-validates every field it *is* given, so resending an untouched value can fail on a rule the
 * user never triggered — most obviously a deadline that was valid when the goal was created and
 * is now in the past. Returning `{}` means there is nothing to save.
 */
export function buildGoalPatch(
  goal: Pick<SavingsGoalWithProgress, 'name' | 'targetAmount' | 'deadline'>,
  draft: { name: string; targetAmount: number; deadline: string },
): UpdateGoalInput {
  const patch: UpdateGoalInput = {};
  if (draft.name !== goal.name) patch.name = draft.name;
  if (draft.targetAmount !== goal.targetAmount) patch.targetAmount = draft.targetAmount;
  if (draft.deadline !== (goal.deadline ?? '')) patch.deadline = draft.deadline;
  return patch;
}

/**
 * Edits name / target / deadline. Sends only the fields that actually changed — the backend
 * treats an omitted field as "leave alone", so submitting all three would re-validate (and could
 * reject) values the user never touched, e.g. a deadline that has since passed.
 */
function EditGoalSheet({
  goal,
  visible,
  onClose,
}: {
  goal: SavingsGoalWithProgress;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateGoal = useUpdateGoal();

  // Seeded once per mount. The parent bumps this component's `key` each time the sheet opens,
  // so a cancelled edit never lingers and the fields always follow the goal — without an effect
  // that writes state on every render pass, and without unmounting on close (which would cut
  // DraggableSheet's slide-down short).
  const [name, setName] = useState(goal.name);
  const [targetRaw, setTargetRaw] = useState(String(goal.targetAmount));
  const [deadline, setDeadline] = useState(goal.deadline ?? isoDaysFromNow(90));
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

  const trimmedName = name.trim();
  // The backend rejects a target below what's already saved; say so here rather than letting the
  // user submit into a server error.
  const belowSaved = parsedTarget > 0 && parsedTarget < goal.currentAmount;

  const patch = useMemo(
    () => buildGoalPatch(goal, { name: trimmedName, targetAmount: parsedTarget, deadline }),
    [goal, trimmedName, parsedTarget, deadline],
  );
  const changed = Object.keys(patch).length > 0;

  const isValid =
    trimmedName.length > 0 &&
    parsedTarget > 0 &&
    !belowSaved &&
    /^\d{4}-\d{2}-\d{2}$/.test(deadline) &&
    changed;

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        patch,
      });
      onClose();
    } catch (err) {
      Alert.alert('', getApiErrorMessage(err, S.editError));
    }
  }, [isValid, updateGoal, goal.id, patch, onClose]);

  return (
    <>
      <DraggableSheet visible={visible} onClose={onClose}>
        <ScrollView
          contentContainerStyle={[styles.sheet, targetFocused && { paddingBottom: NUMPAD_HEIGHT }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sheetTitle}>{S.editTitle}</Text>

          <Text style={styles.fieldLabel}>{S.editNameLabel}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={S.editNamePlaceholder}
            onFocus={() => setTargetFocused(false)}
          />

          <Text style={styles.fieldLabel}>{S.editTargetLabel}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.fieldInput, styles.amountDisplay]}
            onPress={() => setTargetFocused(true)}
          >
            <Text style={[styles.amountText, !targetDisplay && styles.amountPlaceholder]}>
              {targetDisplay || S.editTargetPlaceholder}
            </Text>
            <MaterialIcon name="dialpad" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          {belowSaved && (
            <Text style={styles.editWarning}>
              {S.editTargetBelowSaved(formatFull(goal.currentAmount))}
            </Text>
          )}

          <Text style={styles.fieldLabel}>{S.editDeadlineLabel}</Text>
          <DatePickerField value={deadline} onChange={setDeadline} minDate={isoDaysFromNow(1)} />

          <View style={styles.sheetActions}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.saveBtn, (!isValid || updateGoal.isPending) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!isValid || updateGoal.isPending}
              accessibilityRole="button"
              accessibilityLabel={S.editSave}
              accessibilityState={{ disabled: !isValid || updateGoal.isPending }}
            >
              {updateGoal.isPending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveText}>{changed ? S.editSave : S.editNoChange}</Text>
              )}
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

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: GoalContribution }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isWithdrawal = item.type === 'withdrawal';
  const label = item.note || (isWithdrawal ? S.historyWithdrawNote : S.historyContribNote);
  return (
    <View style={styles.historyRow}>
      <MaterialIcon
        name={isWithdrawal ? 'arrow_upward' : 'savings'}
        size={18}
        color={isWithdrawal ? colors.error : colors.primary}
      />
      <View style={styles.historyRowText}>
        <Text style={styles.historyRowLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.historyRowDate}>{formatDate(item.contributedAt)}</Text>
      </View>
      <Text style={[styles.historyRowAmount, isWithdrawal && styles.historyRowAmountNegative]}>
        {isWithdrawal ? '-' : '+'}{formatFull(item.amount)}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: goal, isLoading, isError, error, refetch } = useGoalById(id);
  const { data: contributions } = useGoalContributions(id);
  const deleteGoal = useDeleteGoal();
  const [editVisible, setEditVisible] = useState(false);
  // Bumped on every open so EditGoalSheet remounts with fresh values; deliberately not touched
  // on close, so the sheet stays mounted long enough to animate out.
  const [editSession, setEditSession] = useState(0);

  const handleEditPress = useCallback(() => {
    setEditSession((n) => n + 1);
    setEditVisible(true);
  }, []);
  const [contribVisible, setContribVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  // Withdrawing everything is done through the regular "Rút tiền" sheet — the
  // alert only informs, it never opens the sheet itself (opening it straight
  // from the alert's button press collided with the alert's dismissal
  // animation and read as a freeze).
  const handleArchivePress = useCallback(() => {
    if (!goal || goal.isDeleted) return;

    if (goal.currentAmount > 0) {
      Alert.alert(S.withdrawBeforeArchiveTitle, S.withdrawBeforeArchiveMsg, [
        { text: S.gotIt },
      ]);
      return;
    }

    setDeleteVisible(true);
  }, [goal]);

  const handleWithdrawSuccess = useCallback((drainedGoal: boolean) => {
    if (drainedGoal) setDeleteVisible(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!id || deleteGoal.isPending) return;
    try {
      await deleteGoal.mutateAsync(id);
      setDeleteVisible(false);
      router.dismissTo('/(tabs)/budgets/goals');
    } catch (archiveError) {
      Alert.alert('', getApiErrorMessage(archiveError, S.archiveError));
    }
  }, [id, deleteGoal, router]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !goal) return <ErrorState message={(error as Error)?.message ?? 'Không tìm thấy mục tiêu'} onRetry={refetch} />;

  const pct = Math.min(100, goal.progressPercentage);
  const days = daysUntil(goal.deadline);
  const barCol = goal.isCompleted ? colors.tertiary : pct >= 75 ? colors.primary : colors.secondary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn}
          onPress={() => router.dismissTo('/(tabs)/budgets/goals')}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name={S.back} size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenterEditable}>
          {goal.iconEmoji ? (
            <Text style={styles.headerEmoji}>{goal.iconEmoji}</Text>
          ) : (
            <MaterialIcon name="savings" size={20} color={colors.primary} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{goal.name}</Text>
        </View>
        {goal.isDeleted ? (
          <View style={styles.headerBtn} />
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerBtn}
              onPress={handleEditPress}
              accessibilityRole="button"
              accessibilityLabel={S.edit}
            >
              <MaterialIcon name="edit" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerBtn}
              onPress={handleArchivePress}
              accessibilityRole="button"
              accessibilityLabel={S.archiveConfirm}
            >
              <MaterialIcon name="archive" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}>

        {/* Progress card */}
        <View style={[styles.progressCard, goal.isCompleted && styles.progressCardCompleted]}>
          {goal.isCompleted && <View style={styles.completedAccent} />}

          <View style={styles.progressRow}>
            <Text style={[styles.pctText, { color: barCol }]}>{pct.toFixed(0)}%</Text>
            {goal.isDeleted ? (
              <View style={styles.archivedBadge}>
                <MaterialIcon name="archive" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.archivedBadgeText}>{S.archived}</Text>
              </View>
            ) : goal.isCompleted ? (
              <View style={styles.completedBadge}>
                <MaterialIcon name="check_circle" size={14} color={colors.tertiary} />
                <Text style={styles.completedBadgeText}>{S.completed}</Text>
              </View>
            ) : (
              <Text style={styles.deadlineText}>
                {days === null
                  ? S.noDeadline
                  : days <= 30
                    ? S.daysLeft(days)
                    : S.monthsLeft(goal.monthsRemaining)}
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
              <Text style={[styles.statValue, { color: colors.onSurfaceVariant }]}>
                {formatFull(goal.remainingAmount)}
              </Text>
            </View>
          </View>

          {/* monthlySavingNeeded/deadline text are both undefined without a
              deadline (both mock and real agree) — hide the whole row rather
              than showing a fabricated 0đ/tháng or remaining/1 figure next to
              a blank date. Unreachable via the app's own create flow today
              (deadline is required), kept defensive. */}
          {!goal.isCompleted && !goal.isDeleted && goal.deadline && (
            <View style={styles.monthlyRow}>
              <MaterialIcon name="savings" size={16} color={colors.primary} />
              <Text style={styles.monthlyText}>
                {S.perMonth(formatVND(goal.requiredMonthlySaving) + 'đ')}
              </Text>
              <Text style={styles.deadlineFull}>· {S.deadline}: {formatDate(goal.deadline)}</Text>
            </View>
          )}
        </View>

        {/* Add contribution / withdraw buttons */}
        {!goal.isDeleted && (
          <View style={styles.actionsRow}>
            {!goal.isCompleted && (
              <TouchableOpacity activeOpacity={0.7} style={styles.addContribBtn}
                onPress={() => setContribVisible(true)}>
                <MaterialIcon name="add" size={20} color={colors.onPrimary} />
                <Text style={styles.addContribText}>{S.addContrib}</Text>
              </TouchableOpacity>
            )}
            {goal.currentAmount > 0 && (
              <TouchableOpacity activeOpacity={0.7} style={styles.withdrawBtn}
                onPress={() => setWithdrawVisible(true)}>
                <MaterialIcon name="arrow_upward" size={20} color={colors.primary} />
                <Text style={styles.withdrawText}>{S.withdraw}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Contribution / withdrawal history */}
        <View style={styles.historySection}>
          <Text style={styles.historyLabel}>Lịch sử đóng góp</Text>
          {contributions && contributions.length > 0 ? (
            [...contributions]
              .sort((a, b) => b.contributedAt.localeCompare(a.contributedAt))
              .map((item) => <HistoryRow key={item.id} item={item} />)
          ) : (
            <Text style={styles.historyEmpty}>{S.noHistory}</Text>
          )}
        </View>
      </ScrollView>

      <EditGoalSheet key={editSession} visible={editVisible} goal={goal} onClose={() => setEditVisible(false)} />
      <ContributionSheet visible={contribVisible} goal={goal} onClose={() => setContribVisible(false)} />
      <WithdrawSheet
        visible={withdrawVisible}
        goal={goal}
        onClose={() => setWithdrawVisible(false)}
        onSuccess={handleWithdrawSuccess}
      />

      {/* Delete confirm */}
      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setDeleteVisible(false)} />
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{S.archiveTitle}</Text>
          <Text style={styles.confirmMsg}>{S.archiveMsg}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn}
              onPress={() => setDeleteVisible(false)} disabled={deleteGoal.isPending}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[styles.deleteBtn, deleteGoal.isPending && styles.saveBtnDisabled]}
              onPress={handleDelete} disabled={deleteGoal.isPending}>
              {deleteGoal.isPending
                ? <ActivityIndicator size="small" color={colors.onError} />
                : <Text style={styles.deleteText}>{S.archiveConfirm}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2] },
  // Two 40px buttons sit on the right now (edit + archive) against one on the left, so the
  // centre block can't be symmetric — let it shrink instead of pushing the title off-centre.
  headerCenterEditable: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], minWidth: 0,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  editWarning: {
    fontSize: FONT_SIZE.xs, color: colors.error, marginTop: -SPACING[1], marginBottom: SPACING[1],
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[4] },
  // Progress card
  progressCard: {
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], borderWidth: 1, borderColor: colors.surfaceVariant,
    overflow: 'hidden', gap: SPACING[3],
  },
  progressCardCompleted: { borderColor: withAlpha(colors.tertiary, 0.19) },
  completedAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: withAlpha(colors.tertiary, 0.38) },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pctText: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold },
  deadlineText: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: withAlpha(colors.tertiary, 0.13), paddingHorizontal: SPACING[2],
    paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
  },
  completedBadgeText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold, color: colors.tertiary },
  archivedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceVariant, paddingHorizontal: SPACING[2],
    paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
  },
  archivedBadgeText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant },
  barTrack: { height: 6, backgroundColor: colors.surfaceVariant, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  statDivider: { width: 1, height: 32, backgroundColor: colors.outlineVariant },
  monthlyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  monthlyText: { fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
  deadlineFull: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
  // Add contrib / withdraw buttons
  actionsRow: { flexDirection: 'row', gap: SPACING[3] },
  addContribBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.lg,
    height: 56,
  },
  addContribText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onPrimary },
  withdrawBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING[2], borderRadius: BORDER_RADIUS.lg, height: 56,
    borderWidth: 1, borderColor: colors.primary,
  },
  withdrawText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  // History
  historySection: { gap: SPACING[2] },
  historyLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  historyEmpty: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, textAlign: 'center', paddingVertical: SPACING[4] },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
    paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  historyRowText: { flex: 1, gap: 2 },
  historyRowLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: colors.onSurface },
  historyRowDate: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
  historyRowAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
  historyRowAmountNegative: { color: colors.error },
  // Sheet
  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  backdrop: { flex: 1, backgroundColor: withAlpha(colors.black, 0.5) },
  amountDisplay: {
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48, justifyContent: 'center',
  },
  amountText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  amountDisplayError: { borderColor: colors.error },
  amountPlaceholder: { color: colors.onSurfaceVariant, fontWeight: FONT_WEIGHT.normal },
  errorText: { fontSize: FONT_SIZE.xs, color: colors.error, marginTop: SPACING[1] },
  helperText: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginTop: SPACING[1] },
  zeroBalanceBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: withAlpha(colors.error, 0.08), borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: withAlpha(colors.error, 0.25),
    padding: SPACING[3], marginTop: SPACING[2],
  },
  zeroBalanceText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.error, lineHeight: 18 },
  noteDisplay: {
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48, justifyContent: 'center',
  },
  noteText: { fontSize: FONT_SIZE.sm, color: colors.onSurface },
  walletSelectRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: SPACING[4], height: 48,
  },
  walletSelectText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  walletSelectBalance: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
  sheetHandle: {
    width: 40, height: 4, borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: SPACING[4],
  },
  sheetTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, marginBottom: SPACING[2] },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant, marginBottom: SPACING[1], marginTop: SPACING[3] },
  amountLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: SPACING[3], marginBottom: SPACING[1],
  },
  fieldLabelInRow: { marginTop: 0, marginBottom: 0 },
  fillAllChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING[3], paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: colors.primary,
  },
  fillAllText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
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
  // Delete confirm dialog
  confirmDialog: {
    position: 'absolute', top: '35%', left: SPACING[6], right: SPACING[6],
    backgroundColor: colors.surfaceContainerHigh, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6], gap: SPACING[3],
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
  confirmMsg: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[2] },
  deleteBtn: {
    flex: 2, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onErrorContainer },
  });
}
