import React, { useCallback, useEffect, useState } from 'react';
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
import { NumericKeypad } from '@/components/common/NumericKeypad';
import {
  useEffectiveIncomeAllocation,
  useScheduledIncomeAllocation,
  useScheduleIncomeAllocationChange,
} from '@/hooks/useIncomeAllocation';
import { getApiErrorMessage } from '@/utils/errors';

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
  resetDefault: 'Dùng mặc định 50/30/20',
  totalValid: 'Tổng: 100%',
  totalInvalid: (n: number) => `Tổng: ${n}% — phải bằng 100%`,
  saveSuccess: 'Đã lên lịch — thay đổi sẽ áp dụng từ tháng tới.',
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

// ─── Bucket card ──────────────────────────────────────────────────────────────

function BucketCard({
  label,
  hint,
  icon,
  color,
  pct,
  amount,
  onChangePct,
}: {
  label: string;
  hint: string;
  icon: string;
  color: string;
  pct: number;
  amount: number;
  onChangePct: (v: number) => void;
}) {
  return (
    <View style={[styles.bucketCard, { borderColor: `${color}30` }]}>
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
          <Text style={[styles.bucketPct, { color }]}>{pct}%</Text>
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
  const [incomeFocused, setIncomeFocused] = useState(false);
  const [seeded, setSeeded] = useState(false);

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

  const parsedIncome = parseInt(incomeRaw || '0', 10);
  const income = parsedIncome > 0 ? parsedIncome : (current?.monthlyIncome ?? 0);
  const total = needs + wants + savings;
  const isValid = total === 100;

  const needsAmount = Math.round((needs / 100) * income);
  const wantsAmount = Math.round((wants / 100) * income);
  const savingsAmount = Math.round((savings / 100) * income);

  const handleIncomeNumberPress = useCallback((key: string) => {
    setIncomeRaw((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
  }, []);

  const handleIncomeBackspace = useCallback(() => setIncomeRaw((prev) => prev.slice(0, -1)), []);
  const handleIncomeClear = useCallback(() => setIncomeRaw(''), []);

  const handleNeeds = useCallback((v: number) => {
    setNeeds(v);
    const rem = 100 - v;
    const wRatio = wants / (wants + savings) || 0.6;
    setWants(Math.round(rem * wRatio));
    setSavings(rem - Math.round(rem * wRatio));
  }, [wants, savings]);

  const handleWants = useCallback((v: number) => {
    setWants(v);
    const rem = 100 - v;
    const nRatio = needs / (needs + savings) || 0.7;
    setNeeds(Math.round(rem * nRatio));
    setSavings(rem - Math.round(rem * nRatio));
  }, [needs, savings]);

  const handleSavings = useCallback((v: number) => {
    setSavings(v);
    const rem = 100 - v;
    const nRatio = needs / (needs + wants) || 0.625;
    setNeeds(Math.round(rem * nRatio));
    setWants(rem - Math.round(rem * nRatio));
  }, [needs, wants]);

  const handleReset = useCallback(() => {
    setNeeds(50); setWants(30); setSavings(20);
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

  if (currentLoading) return <LoadingSpinner />;

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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
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
          style={[styles.incomeCard, incomeFocused && styles.incomeCardFocused]}
          onPress={() => setIncomeFocused(true)}
        >
          <Text style={styles.incomeLabel}>{S.incomeLabel}</Text>
          <Text style={styles.incomeAmount}>
            {parsedIncome > 0
              ? parsedIncome.toLocaleString('vi-VN') + 'đ'
              : income > 0 ? formatVND(income) : S.incomePlaceholder}
            <Text style={styles.incomeUnit}>{S.incomeUnit}</Text>
          </Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.resetBtn} onPress={handleReset}>
            <MaterialIcon name="auto_awesome" size={16} color={COLORS.primary} filled />
            <Text style={styles.resetText}>{S.resetDefault}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Bucket sliders */}
        <BucketCard label={S.buckets.needs.label} hint={S.buckets.needs.hint}
          icon="home" color={COLORS.primary}
          pct={needs} amount={needsAmount} onChangePct={handleNeeds} />

        <BucketCard label={S.buckets.wants.label} hint={S.buckets.wants.hint}
          icon="shopping_bag" color={COLORS.secondary}
          pct={wants} amount={wantsAmount} onChangePct={handleWants} />

        <BucketCard label={S.buckets.savings.label} hint={S.buckets.savings.hint}
          icon="savings" color={COLORS.tertiary}
          pct={savings} amount={savingsAmount} onChangePct={handleSavings} />
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
        visible={incomeFocused}
        onClose={() => setIncomeFocused(false)}
        onNumberPress={handleIncomeNumberPress}
        onBackspace={handleIncomeBackspace}
        onClear={handleIncomeClear}
        onDone={() => setIncomeFocused(false)}
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
  incomeLabel: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  incomeAmount: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  incomeUnit: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.normal, color: COLORS.onSurfaceVariant },
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
  bucketPct: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
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
