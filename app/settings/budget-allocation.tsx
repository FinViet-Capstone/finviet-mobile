import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
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
  totalInvalid: (n: number) => `Tổng: ${n}% — phải bằng 100%`,
  saveSuccess: 'Đã lên lịch — thay đổi sẽ áp dụng từ tháng tới.',
  lockLabel: (bucket: string) => `Khóa ${bucket}`,
  unlockLabel: (bucket: string) => `Bỏ khóa ${bucket}`,
  editPctLabel: (bucket: string, pct: number) => `Sửa ${bucket}, hiện tại ${pct} phần trăm`,
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

// ─── Bucket card ──────────────────────────────────────────────────────────────

function BucketCard({
  label,
  hint,
  icon,
  color,
  pct,
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
  amount: number;
  onChangePct: (v: number) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onPressPct: () => void;
  onMeasured?: (y: number) => void;
}) {
  return (
    <View
      style={[styles.bucketCard, { borderColor: `${color}30` }]}
      onLayout={(e) => onMeasured?.(e.nativeEvent.layout.y)}
    >
      <View style={styles.bucketTop}>
        <View style={styles.bucketLeft}>
          <View style={[styles.bucketIcon, { backgroundColor: `${color}20` }]}>
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
                color={isLocked ? color : COLORS.onSurfaceVariant}
                filled={isLocked}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={isLocked ? 1 : 0.6}
              disabled={isLocked}
              onPress={onPressPct}
              style={styles.bucketPctRow}
              accessibilityRole="button"
              accessibilityLabel={S.editPctLabel(label, pct)}
            >
              <Text style={[styles.bucketPct, { color }, isLocked && styles.bucketPctDisabled]}>{pct}%</Text>
              {!isLocked && <MaterialIcon name="edit" size={12} color={color} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.bucketAmount}>{formatVND(amount)}</Text>
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
        maximumTrackTintColor={COLORS.surfaceVariant}
        thumbTintColor={color}
        disabled={isLocked}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BudgetAllocationScreen() {
  const router = useRouter();
  const { data: current, isLoading: currentLoading } = useEffectiveIncomeAllocation();
  const { data: scheduled, isLoading: scheduledLoading } = useScheduledIncomeAllocation();
  const scheduleChange = useScheduleIncomeAllocationChange();

  const [needs, setNeeds] = useState(50);
  const [wants, setWants] = useState(30);
  const [savings, setSavings] = useState(20);
  const [incomeRaw, setIncomeRaw] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [pctRaw, setPctRaw] = useState('');
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
  const isValid = total === 100 && isIncomeValid;

  const needsAmount = Math.round((needs / 100) * income);
  const wantsAmount = Math.round((wants / 100) * income);
  const savingsAmount = Math.round((savings / 100) * income);

  const openField = useCallback((field: Exclude<ActiveField, null>) => {
    // A locked bucket's own % is fixed — editing it requires unlocking first.
    if (field !== 'income' && field === lockedBucket) return;
    setPctRaw('');
    setActiveField(field);
    // Income is always visible near the top already; buckets are stacked
    // below it, so scroll the tapped one clear of the bottom-anchored keypad.
    if (field !== 'income') {
      const y = fieldOffsets.current[field];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - SPACING[4]), animated: true });
      }
    }
  }, [lockedBucket]);

  const handleKeypadNumberPress = useCallback((key: string) => {
    if (activeField === 'income') {
      setIncomeRaw((prev) => {
        if (key === '000') return prev === '' ? '' : prev + '000';
        return prev + key;
      });
    } else if (activeField) {
      setPctRaw((prev) => {
        if (key === '000') return prev;
        const next = prev + key;
        return next.length > 3 ? prev : next;
      });
    }
  }, [activeField]);

  const handleKeypadBackspace = useCallback(() => {
    if (activeField === 'income') setIncomeRaw((prev) => prev.slice(0, -1));
    else setPctRaw((prev) => prev.slice(0, -1));
  }, [activeField]);

  const handleKeypadClear = useCallback(() => {
    if (activeField === 'income') setIncomeRaw('');
    else setPctRaw('');
  }, [activeField]);

  const handleKeypadClose = useCallback(() => {
    setActiveField(null);
    setPctRaw('');
  }, []);

  const handleNeeds = useCallback((v: number) => {
    if (lockedBucket === 'needs') return; // defensive; its slider/% are already disabled
    if (lockedBucket === 'wants') {
      const clampedV = Math.min(Math.max(v, 0), 100 - wants);
      setNeeds(clampedV);
      setSavings(100 - wants - clampedV);
      return;
    }
    if (lockedBucket === 'savings') {
      const clampedV = Math.min(Math.max(v, 0), 100 - savings);
      setNeeds(clampedV);
      setWants(100 - savings - clampedV);
      return;
    }
    setNeeds(v);
    const rem = 100 - v;
    const wRatio = wants / (wants + savings) || 0.6;
    setWants(Math.round(rem * wRatio));
    setSavings(rem - Math.round(rem * wRatio));
  }, [wants, savings, lockedBucket]);

  const handleWants = useCallback((v: number) => {
    if (lockedBucket === 'wants') return;
    if (lockedBucket === 'needs') {
      const clampedV = Math.min(Math.max(v, 0), 100 - needs);
      setWants(clampedV);
      setSavings(100 - needs - clampedV);
      return;
    }
    if (lockedBucket === 'savings') {
      const clampedV = Math.min(Math.max(v, 0), 100 - savings);
      setWants(clampedV);
      setNeeds(100 - savings - clampedV);
      return;
    }
    setWants(v);
    const rem = 100 - v;
    const nRatio = needs / (needs + savings) || 0.7;
    setNeeds(Math.round(rem * nRatio));
    setSavings(rem - Math.round(rem * nRatio));
  }, [needs, savings, lockedBucket]);

  const handleSavings = useCallback((v: number) => {
    if (lockedBucket === 'savings') return;
    if (lockedBucket === 'needs') {
      const clampedV = Math.min(Math.max(v, 0), 100 - needs);
      setSavings(clampedV);
      setWants(100 - needs - clampedV);
      return;
    }
    if (lockedBucket === 'wants') {
      const clampedV = Math.min(Math.max(v, 0), 100 - wants);
      setSavings(clampedV);
      setNeeds(100 - wants - clampedV);
      return;
    }
    setSavings(v);
    const rem = 100 - v;
    const nRatio = needs / (needs + wants) || 0.625;
    setNeeds(Math.round(rem * nRatio));
    setWants(rem - Math.round(rem * nRatio));
  }, [needs, wants, lockedBucket]);

  const handleKeypadDone = useCallback(() => {
    if (activeField === 'needs') handleNeeds(clampPct(parseInt(pctRaw || '0', 10)));
    else if (activeField === 'wants') handleWants(clampPct(parseInt(pctRaw || '0', 10)));
    else if (activeField === 'savings') handleSavings(clampPct(parseInt(pctRaw || '0', 10)));
    setActiveField(null);
    setPctRaw('');
  }, [activeField, pctRaw, handleNeeds, handleWants, handleSavings]);

  const handleReset = useCallback(() => {
    setNeeds(50); setWants(30); setSavings(20);
    setLockedBucket(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    try {
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
          <MaterialIcon name="arrow_back" size={22} color={COLORS.onSurface} />
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
        showsVerticalScrollIndicator={false}>

        {/* Current month — read-only, locked */}
        <View style={styles.currentCard}>
          <View style={styles.currentHeaderRow}>
            <Text style={styles.currentLabel}>{S.currentLabel} · {monthLabel(new Date())}</Text>
            <MaterialIcon name="lock" size={14} color={COLORS.onSurfaceVariant} />
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
            <MaterialIcon name="edit" size={14} color={COLORS.primary} />
          </View>
          <Text style={[styles.incomeEditHintText, !isIncomeValid && styles.incomeInvalidText]}>
            {isIncomeValid ? S.incomeEditHint : S.incomeInvalid}
          </Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.resetBtn} onPress={handleReset}>
            <MaterialIcon name="auto_awesome" size={16} color={COLORS.primary} filled />
            <Text style={styles.resetText}>{S.resetDefault}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Bucket sliders */}
        <BucketCard label={S.buckets.needs.label} hint={S.buckets.needs.hint}
          icon="home" color={COLORS.primary}
          pct={needs} amount={needsAmount} onChangePct={handleNeeds}
          isLocked={lockedBucket === 'needs'}
          onToggleLock={() => setLockedBucket((prev) => (prev === 'needs' ? null : 'needs'))}
          onPressPct={() => openField('needs')}
          onMeasured={(y) => { fieldOffsets.current.needs = y; }} />

        <BucketCard label={S.buckets.wants.label} hint={S.buckets.wants.hint}
          icon="shopping_bag" color={COLORS.secondary}
          pct={wants} amount={wantsAmount} onChangePct={handleWants}
          isLocked={lockedBucket === 'wants'}
          onToggleLock={() => setLockedBucket((prev) => (prev === 'wants' ? null : 'wants'))}
          onPressPct={() => openField('wants')}
          onMeasured={(y) => { fieldOffsets.current.wants = y; }} />

        <BucketCard label={S.buckets.savings.label} hint={S.buckets.savings.hint}
          icon="savings" color={COLORS.tertiary}
          pct={savings} amount={savingsAmount} onChangePct={handleSavings}
          isLocked={lockedBucket === 'savings'}
          onToggleLock={() => setLockedBucket((prev) => (prev === 'savings' ? null : 'savings'))}
          onPressPct={() => openField('savings')}
          onMeasured={(y) => { fieldOffsets.current.savings = y; }} />
      </ScrollView>

      {/* Total validation pill */}
      <View style={styles.totalPill}>
        <View style={[styles.totalPillInner, isValid ? styles.totalPillValid : styles.totalPillInvalid]}>
          {isValid && <MaterialIcon name="check_circle" size={18} color={COLORS.tertiary} />}
          <Text style={[styles.totalPillText, { color: isValid ? COLORS.tertiary : COLORS.error }]}>
            {isValid ? S.totalValid : S.totalInvalid(total)}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface, flex: 1, textAlign: 'center',
  },
  saveBtn: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
  saveBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[16], gap: SPACING[4] },
  // Current month card
  currentCard: {
    backgroundColor: COLORS.surfaceContainerLow, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], gap: SPACING[2],
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  currentHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  currentLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  currentIncome: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  currentPctRow: { flexDirection: 'row', gap: SPACING[3], flexWrap: 'wrap' },
  currentPctItem: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  currentHint: { fontSize: 11, color: `${COLORS.onSurfaceVariant}B3` },
  nextLabel: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface,
  },
  // Income card
  incomeCard: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4], alignItems: 'center', gap: SPACING[3],
    borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  incomeCardFocused: {
    borderColor: COLORS.primary,
  },
  incomeCardInvalid: {
    borderColor: COLORS.error,
  },
  incomeLabel: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  incomeAmountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  incomeAmount: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  incomeUnit: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.normal, color: COLORS.onSurfaceVariant },
  incomeEditHintText: { fontSize: 11, color: COLORS.primary },
  incomeInvalidText: { color: COLORS.error },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.outline,
  },
  resetText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
  // Bucket card
  bucketCard: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[4], borderWidth: 1, gap: SPACING[3],
  },
  bucketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bucketLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  bucketIcon: {
    width: 32, height: 32, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  bucketLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  bucketHint: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  bucketRight: { alignItems: 'flex-end' },
  bucketRightTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
  lockBtn: { padding: 2 },
  bucketPctRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bucketPct: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  bucketPctDisabled: { opacity: 0.5 },
  bucketAmount: { fontSize: 11, color: COLORS.onSurfaceVariant },
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
    backgroundColor: COLORS.surfaceContainerHigh,
    borderColor: `${COLORS.tertiary}40`,
  },
  totalPillInvalid: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderColor: `${COLORS.error}40`,
  },
  totalPillText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
});
