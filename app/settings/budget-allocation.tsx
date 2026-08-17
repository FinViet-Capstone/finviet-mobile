import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CustomSlider } from '@/components/common/CustomSlider';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import {
  useEffectiveIncomeAllocation,
  useScheduledIncomeAllocation,
  useScheduleIncomeAllocationChange,
} from '@/hooks/useIncomeAllocation';
import { getApiErrorMessage } from '@/utils/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveField = 'income' | 'needs' | 'wants' | 'savings' | null;
type LockedBucket = 'needs' | 'wants' | 'savings' | null;

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Phân bổ ngân sách',
  save: 'Lưu',
  currentLabel: 'Đang áp dụng',
  currentHint: 'Đã khóa cho tháng này — thay đổi bên dưới sẽ áp dụng từ tháng tới.',
  nextLabel: 'Tháng tới, bạn muốn:',
  incomeLabel: 'Thu nhập khả dụng',
  incomeUnit: '/tháng',
  incomePlaceholder: 'Nhập thu nhập',
  incomeEditHint: 'Chạm để sửa · Áp dụng từ tháng tới',
  incomeInvalid: 'Thu nhập phải lớn hơn 0',
  resetDefault: 'Dùng mặc định 50/30/20',
  totalValid: 'Tổng: 100%',
  totalInvalid: (n: string) => `Tổng: ${n}% — phải bằng 100%`,
  saveSuccess: 'Đã lên lịch — thay đổi sẽ áp dụng từ tháng tới.',
  lockLabel: (bucket: string) => `Khóa ${bucket}`,
  unlockLabel: (bucket: string) => `Bỏ khóa ${bucket}`,
  editAmountLabel: (bucket: string, amount: string) => `Sửa ${bucket}, hiện tại ${amount}`,
  buckets: {
    needs: { label: 'Thiết yếu', hint: 'Nhà ở, ăn uống, đi lại' },
    wants: { label: 'Mong muốn', hint: 'Mua sắm, giải trí' },
    savings: { label: 'Tiết kiệm', hint: 'Đầu tư, dự phòng' },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

function monthLabel(date: Date): string {
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}

function nextMonthDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Round a % to at most 2 decimal places (max precision this feature supports). */
function roundPct(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "15" for whole numbers, "15.3" for fractional — no trailing zeros. */
function formatPct(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// ─── Bucket card ──────────────────────────────────────────────────────────────

function BucketCard({
  label,
  hint,
  icon,
  color,
  pct,
  displayPct,
  amount,
  onChangePct,
  isLocked,
  onToggleLock,
  onPressPct,
  onMeasured,
}: {
  label: string;
  hint: string;
  icon: string;
  color: string;
  pct: number;
  /** % shown in the secondary line — differs from `pct` only while this
   * card's numpad is open, so it reflects what's being typed immediately
   * instead of waiting for Done. The slider stays bound to `pct` so it
   * doesn't jump mid-typing. */
  displayPct: number;
  /** VND amount shown next to the edit pencil — the numpad edits this
   * directly (amount, not %); same live-while-typing behavior as displayPct. */
  amount: number;
  onChangePct: (v: number) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onPressPct: () => void;
  onMeasured?: (y: number) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View
      style={[styles.bucketCard, { borderColor: withAlpha(color, 0.19) }]}
      onLayout={(e) => onMeasured?.(e.nativeEvent.layout.y)}
    >
      <View style={styles.bucketTop}>
        <View style={styles.bucketLeft}>
          <View style={[styles.bucketIcon, { backgroundColor: withAlpha(color, 0.13) }]}>
            <MaterialIcon name={icon} size={18} color={color} />
          </View>
          <View>
            <Text style={[styles.bucketLabel, { color }]}>{label}</Text>
            <Text style={styles.bucketHint}>{hint}</Text>
          </View>
        </View>
        <View style={styles.bucketRight}>
          <View style={styles.bucketRightTop}>
            <TouchableOpacity
              onPress={onToggleLock}
              style={styles.lockBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isLocked }}
              accessibilityLabel={isLocked ? S.unlockLabel(label) : S.lockLabel(label)}
            >
              <MaterialIcon
                name={isLocked ? 'lock' : 'lock_open'}
                size={14}
                color={isLocked ? color : colors.onSurfaceVariant}
                filled={isLocked}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={isLocked ? 1 : 0.6}
              disabled={isLocked}
              onPress={onPressPct}
              style={styles.bucketPctRow}
              accessibilityRole="button"
              accessibilityLabel={S.editAmountLabel(label, formatVND(amount))}
            >
              <Text style={[styles.bucketPct, { color }, isLocked && styles.bucketPctDisabled]}>{formatVND(amount)}</Text>
              {!isLocked && <MaterialIcon name="edit" size={12} color={color} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.bucketAmount}>{formatPct(displayPct)}%</Text>
        </View>
      </View>
      <CustomSlider
        style={styles.slider}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={pct}
        onValueChange={(v: number) => onChangePct(Math.round(v))}
        minimumTrackTintColor={color}
        maximumTrackTintColor={colors.surfaceVariant}
        thumbTintColor={color}
        disabled={isLocked}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BudgetAllocationScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: current, isLoading: currentLoading } = useEffectiveIncomeAllocation();
  const { data: scheduled, isLoading: scheduledLoading } = useScheduledIncomeAllocation();
  const scheduleChange = useScheduleIncomeAllocationChange();

  const [needs, setNeeds] = useState(50);
  const [wants, setWants] = useState(30);
  const [savings, setSavings] = useState(20);
  const [incomeRaw, setIncomeRaw] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  // Raw digits of the VND amount being typed for a bucket's numpad — the
  // numpad edits the amount directly; % is derived from it (see handleKeypadDone).
  const [bucketAmountRaw, setBucketAmountRaw] = useState('');
  const [lockedBucket, setLockedBucket] = useState<LockedBucket>(null);
  const [seeded, setSeeded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Partial<Record<'needs' | 'wants' | 'savings', number>>>({});

  // Seed the editable "next month" draft once: from an already-scheduled draft
  // if the customer already changed their mind once, else from what's currently
  // in effect. Never touches the current month's own numbers.
  useEffect(() => {
    if (seeded || currentLoading || scheduledLoading) return;
    const source = scheduled ?? current;
    if (source) {
      setNeeds(source.needsPct);
      setWants(source.wantsPct);
      setSavings(source.savingsPct);
      setIncomeRaw(source.monthlyIncome ? String(source.monthlyIncome) : '');
      setSeeded(true);
    }
  }, [seeded, currentLoading, scheduledLoading, scheduled, current]);

  const income = parseInt(incomeRaw || '0', 10);
  const isIncomeValid = income > 0;
  const total = needs + wants + savings;
  // Tolerance guards against float noise from the decimal-% redistribution
  // above (e.g. 99.99999999999999 after several proportional splits).
  const isValid = Math.abs(total - 100) < 0.01 && isIncomeValid;

  // While a bucket's numpad is open, show exactly what's being typed (not
  // round-tripped through %) so precise amounts like 530đ or 571.000đ don't
  // get mangled into a rounded percentage and back. % is derived from the
  // typed amount only for the secondary preview text.
  const typedBucketAmount = parseInt(bucketAmountRaw || '0', 10);
  const typedPct = income > 0 ? roundPct((typedBucketAmount / income) * 100) : 0;
  const needsDisplayPct = activeField === 'needs' ? typedPct : needs;
  const wantsDisplayPct = activeField === 'wants' ? typedPct : wants;
  const savingsDisplayPct = activeField === 'savings' ? typedPct : savings;

  const needsAmount = activeField === 'needs' ? typedBucketAmount : Math.round((needs / 100) * income);
  const wantsAmount = activeField === 'wants' ? typedBucketAmount : Math.round((wants / 100) * income);
  const savingsAmount = activeField === 'savings' ? typedBucketAmount : Math.round((savings / 100) * income);

  // Set by openField, consumed by scrollToField — lets onContentSizeChange
  // (below) finish the scroll once the keypad's extra bottom padding has
  // actually been laid out, not just requested. Needed because a same-tick
  // scrollTo (right after setActiveField) can clamp short for buckets near
  // the bottom (savings, the last one) since there's no extra scroll room
  // until that padding is committed.
  const pendingScrollField = useRef<Exclude<ActiveField, null> | null>(null);

  const scrollToField = useCallback((field: Exclude<ActiveField, null>) => {
    if (field === 'income') return; // always visible near the top already
    const y = fieldOffsets.current[field];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - SPACING[4]), animated: true });
    }
  }, []);

  const openField = useCallback((field: Exclude<ActiveField, null>) => {
    // A locked bucket's own % is fixed — editing it requires unlocking first.
    if (field !== 'income' && field === lockedBucket) return;
    setBucketAmountRaw('');
    setActiveField(field);
    pendingScrollField.current = field;
    // Covers switching directly between fields while the keypad is already
    // open — the extra bottom padding is already laid out, so this lands
    // correctly right away.
    scrollToField(field);
  }, [lockedBucket, scrollToField]);

  // Income and bucket fields both take a plain VND amount now, so they share
  // the same typing behavior — only which state they write to differs.
  const handleKeypadNumberPress = useCallback((key: string) => {
    const setter = activeField === 'income' ? setIncomeRaw : setBucketAmountRaw;
    if (!activeField) return;
    setter((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
  }, [activeField]);

  const handleKeypadBackspace = useCallback(() => {
    if (activeField === 'income') setIncomeRaw((prev) => prev.slice(0, -1));
    else setBucketAmountRaw((prev) => prev.slice(0, -1));
  }, [activeField]);

  const handleKeypadClear = useCallback(() => {
    if (activeField === 'income') setIncomeRaw('');
    else setBucketAmountRaw('');
  }, [activeField]);

  const handleKeypadClose = useCallback(() => {
    setActiveField(null);
    setBucketAmountRaw('');
  }, []);

  // Redistribution math rounds to 2 decimal places (not the nearest whole
  // percent) so a numpad-typed exact amount round-trips back to itself
  // instead of snapping to the nearest 1%. Drag input already arrives as a
  // whole number (BucketCard's onChangePct rounds it), so this is a no-op
  // there. Each pair's second bucket is derived as the exact remainder (not
  // independently rounded) so all three always sum to exactly 100.

  const handleNeeds = useCallback((v: number) => {
    if (lockedBucket === 'needs') return; // defensive; its slider/% are already disabled
    const rounded = roundPct(v);
    if (lockedBucket === 'wants') {
      const clampedV = Math.min(Math.max(rounded, 0), roundPct(100 - wants));
      setNeeds(clampedV);
      setSavings(roundPct(100 - wants - clampedV));
      return;
    }
    if (lockedBucket === 'savings') {
      const clampedV = Math.min(Math.max(rounded, 0), roundPct(100 - savings));
      setNeeds(clampedV);
      setWants(roundPct(100 - savings - clampedV));
      return;
    }
    setNeeds(rounded);
    const rem = roundPct(100 - rounded);
    const wRatio = wants / (wants + savings) || 0.6;
    const newWants = roundPct(rem * wRatio);
    setWants(newWants);
    setSavings(roundPct(rem - newWants));
  }, [wants, savings, lockedBucket]);

  const handleWants = useCallback((v: number) => {
    if (lockedBucket === 'wants') return;
    const rounded = roundPct(v);
    if (lockedBucket === 'needs') {
      const clampedV = Math.min(Math.max(rounded, 0), roundPct(100 - needs));
      setWants(clampedV);
      setSavings(roundPct(100 - needs - clampedV));
      return;
    }
    if (lockedBucket === 'savings') {
      const clampedV = Math.min(Math.max(rounded, 0), roundPct(100 - savings));
      setWants(clampedV);
      setNeeds(roundPct(100 - savings - clampedV));
      return;
    }
    setWants(rounded);
    const rem = roundPct(100 - rounded);
    const nRatio = needs / (needs + savings) || 0.7;
    const newNeeds = roundPct(rem * nRatio);
    setNeeds(newNeeds);
    setSavings(roundPct(rem - newNeeds));
  }, [needs, savings, lockedBucket]);

  const handleSavings = useCallback((v: number) => {
    if (lockedBucket === 'savings') return;
    const rounded = roundPct(v);
    if (lockedBucket === 'needs') {
      const clampedV = Math.min(Math.max(rounded, 0), roundPct(100 - needs));
      setSavings(clampedV);
      setWants(roundPct(100 - needs - clampedV));
      return;
    }
    if (lockedBucket === 'wants') {
      const clampedV = Math.min(Math.max(rounded, 0), roundPct(100 - wants));
      setSavings(clampedV);
      setNeeds(roundPct(100 - wants - clampedV));
      return;
    }
    setSavings(rounded);
    const rem = roundPct(100 - rounded);
    const nRatio = needs / (needs + wants) || 0.625;
    const newNeeds = roundPct(rem * nRatio);
    setNeeds(newNeeds);
    setWants(roundPct(rem - newNeeds));
  }, [needs, wants, lockedBucket]);

  const handleKeypadDone = useCallback(() => {
    const typedAmount = parseInt(bucketAmountRaw || '0', 10);
    // 2-decimal precision (not the nearest whole percent) so an exact typed
    // amount round-trips back to itself instead of snapping to the nearest 1%.
    const pct = income > 0 ? clampPct(roundPct((typedAmount / income) * 100)) : 0;
    if (activeField === 'needs') handleNeeds(pct);
    else if (activeField === 'wants') handleWants(pct);
    else if (activeField === 'savings') handleSavings(pct);
    setActiveField(null);
    setBucketAmountRaw('');
  }, [activeField, bucketAmountRaw, income, handleNeeds, handleWants, handleSavings]);

  const handleReset = useCallback(() => {
    setNeeds(50); setWants(30); setSavings(20);
    setLockedBucket(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    try {
      // needsPct/wantsPct/savingsPct support up to 2 decimal places (backend
      // columns are numeric(5,2)) so an exact typed amount round-trips cleanly.
      await scheduleChange.mutateAsync({
        monthlyIncome: income,
        needsPct: needs,
        wantsPct: wants,
        savingsPct: savings,
      });
      Alert.alert('', S.saveSuccess);
      router.back();
    } catch (err) {
      Alert.alert('', getApiErrorMessage(err, 'Không thể lưu phân bổ ngân sách.'));
    }
  }, [isValid, income, needs, wants, savings, scheduleChange, router]);

  if (currentLoading || scheduledLoading || !seeded) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name="arrow_back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.saveBtn}
          onPress={handleSave} disabled={!isValid || scheduleChange.isPending}>
          <Text style={[styles.saveBtnText, !isValid && { opacity: 0.4 }]}>{S.save}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, activeField !== null && { paddingBottom: NUMPAD_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (pendingScrollField.current) {
            scrollToField(pendingScrollField.current);
            pendingScrollField.current = null;
          }
        }}>

        {/* Current month — read-only, locked */}
        <View style={styles.currentCard}>
          <View style={styles.currentHeaderRow}>
            <Text style={styles.currentLabel}>{S.currentLabel} · {monthLabel(new Date())}</Text>
            <MaterialIcon name="lock" size={14} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.currentIncome}>
            {formatVND(current?.monthlyIncome ?? 0)}
            <Text style={styles.incomeUnit}>{S.incomeUnit}</Text>
          </Text>
          <View style={styles.currentPctRow}>
            <Text style={styles.currentPctItem}>{S.buckets.needs.label} {current?.needsPct ?? 0}%</Text>
            <Text style={styles.currentPctItem}>{S.buckets.wants.label} {current?.wantsPct ?? 0}%</Text>
            <Text style={styles.currentPctItem}>{S.buckets.savings.label} {current?.savingsPct ?? 0}%</Text>
          </View>
          <Text style={styles.currentHint}>{S.currentHint}</Text>
        </View>

        <Text style={styles.nextLabel}>{S.nextLabel} · {monthLabel(nextMonthDate())}</Text>

        {/* Income — tappable to edit via numpad */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.incomeCard,
            activeField === 'income' && styles.incomeCardFocused,
            !isIncomeValid && styles.incomeCardInvalid,
          ]}
          onPress={() => openField('income')}
          accessibilityRole="button"
          accessibilityLabel={S.incomeEditHint}
        >
          <Text style={styles.incomeLabel}>{S.incomeLabel}</Text>
          <View style={styles.incomeAmountRow}>
            <Text style={styles.incomeAmount}>
              {income > 0 ? formatVND(income) : S.incomePlaceholder}
              <Text style={styles.incomeUnit}>{S.incomeUnit}</Text>
            </Text>
            <MaterialIcon name="edit" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.incomeEditHintText, !isIncomeValid && styles.incomeInvalidText]}>
            {isIncomeValid ? S.incomeEditHint : S.incomeInvalid}
          </Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.resetBtn} onPress={handleReset}>
            <MaterialIcon name="auto_awesome" size={16} color={colors.primary} filled />
            <Text style={styles.resetText}>{S.resetDefault}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Bucket sliders */}
        <BucketCard label={S.buckets.needs.label} hint={S.buckets.needs.hint}
          icon="home" color={colors.primary}
          pct={needs} displayPct={needsDisplayPct} amount={needsAmount} onChangePct={handleNeeds}
          isLocked={lockedBucket === 'needs'}
          onToggleLock={() => setLockedBucket((prev) => (prev === 'needs' ? null : 'needs'))}
          onPressPct={() => openField('needs')}
          onMeasured={(y) => { fieldOffsets.current.needs = y; }} />

        <BucketCard label={S.buckets.wants.label} hint={S.buckets.wants.hint}
          icon="shopping_bag" color={colors.secondary}
          pct={wants} displayPct={wantsDisplayPct} amount={wantsAmount} onChangePct={handleWants}
          isLocked={lockedBucket === 'wants'}
          onToggleLock={() => setLockedBucket((prev) => (prev === 'wants' ? null : 'wants'))}
          onPressPct={() => openField('wants')}
          onMeasured={(y) => { fieldOffsets.current.wants = y; }} />

        <BucketCard label={S.buckets.savings.label} hint={S.buckets.savings.hint}
          icon="savings" color={colors.tertiary}
          pct={savings} displayPct={savingsDisplayPct} amount={savingsAmount} onChangePct={handleSavings}
          isLocked={lockedBucket === 'savings'}
          onToggleLock={() => setLockedBucket((prev) => (prev === 'savings' ? null : 'savings'))}
          onPressPct={() => openField('savings')}
          onMeasured={(y) => { fieldOffsets.current.savings = y; }} />
      </ScrollView>

      {/* Total validation pill */}
      <View style={styles.totalPill}>
        <View style={[styles.totalPillInner, isValid ? styles.totalPillValid : styles.totalPillInvalid]}>
          {isValid && <MaterialIcon name="check_circle" size={18} color={colors.tertiary} />}
          <Text style={[styles.totalPillText, { color: isValid ? colors.tertiary : colors.error }]}>
            {isValid ? S.totalValid : S.totalInvalid(formatPct(total))}
          </Text>
        </View>
      </View>

      <NumericKeypad
        visible={activeField !== null}
        onClose={handleKeypadClose}
        onNumberPress={handleKeypadNumberPress}
        onBackspace={handleKeypadBackspace}
        onClear={handleKeypadClear}
        onDone={handleKeypadDone}
      />
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
    headerTitle: {
      fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface, flex: 1, textAlign: 'center',
    },
    saveBtn: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
    saveBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[16], gap: SPACING[4] },
    // Current month card
    currentCard: {
      backgroundColor: colors.surfaceContainerLow, borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[4], gap: SPACING[2],
      borderWidth: 1, borderColor: colors.outlineVariant,
    },
    currentHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    currentLabel: {
      fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6,
    },
    currentIncome: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    currentPctRow: { flexDirection: 'row', gap: SPACING[3], flexWrap: 'wrap' },
    currentPctItem: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant },
    currentHint: { fontSize: 11, color: withAlpha(colors.onSurfaceVariant, 0.7) },
    nextLabel: {
      fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface,
    },
    // Income card
    incomeCard: {
      backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[4], alignItems: 'center', gap: SPACING[3],
      borderWidth: 1, borderColor: colors.outlineVariant,
    },
    incomeCardFocused: {
      borderColor: colors.primary,
    },
    incomeCardInvalid: {
      borderColor: colors.error,
    },
    incomeLabel: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
    incomeAmountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
    incomeAmount: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    incomeUnit: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.normal, color: colors.onSurfaceVariant },
    incomeEditHintText: { fontSize: 11, color: colors.primary },
    incomeInvalidText: { color: colors.error },
    resetBtn: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
      paddingHorizontal: SPACING[4], paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: colors.outline,
    },
    resetText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
    // Bucket card
    bucketCard: {
      backgroundColor: colors.surfaceContainer, borderRadius: BORDER_RADIUS['2xl'],
      padding: SPACING[4], borderWidth: 1, gap: SPACING[3],
    },
    bucketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bucketLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
    bucketIcon: {
      width: 32, height: 32, borderRadius: BORDER_RADIUS.full,
      alignItems: 'center', justifyContent: 'center',
    },
    bucketLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
    bucketHint: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },
    bucketRight: { alignItems: 'flex-end' },
    bucketRightTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
    lockBtn: { padding: 2 },
    bucketPctRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    bucketPct: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
    bucketPctDisabled: { opacity: 0.5 },
    bucketAmount: { fontSize: 11, color: colors.onSurfaceVariant },
    slider: { width: '100%', height: 32 },
    // Total pill
    totalPill: {
      position: 'absolute', bottom: SPACING[8], left: 0, right: 0,
      alignItems: 'center', pointerEvents: 'none',
    },
    totalPillInner: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
      paddingHorizontal: SPACING[4], paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full, borderWidth: 1,
    },
    totalPillValid: {
      backgroundColor: colors.surfaceContainerHigh,
      borderColor: withAlpha(colors.tertiary, 0.25),
    },
    totalPillInvalid: {
      backgroundColor: colors.surfaceContainerHigh,
      borderColor: withAlpha(colors.error, 0.25),
    },
    totalPillText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  });
}
