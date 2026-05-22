import React, { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';

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
import { useWallets } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatVND } from '@/utils/formatters';

// ---------------------------------------------------------------------------
// Quick-pick deadline presets (relative to today)
// ---------------------------------------------------------------------------

const DEADLINE_PRESETS: { key: string; label: string; addMonths: number }[] = [
  { key: '3m', label: '3 tháng', addMonths: 3 },
  { key: '6m', label: '6 tháng', addMonths: 6 },
  { key: '12m', label: '12 tháng', addMonths: 12 },
  { key: '24m', label: '24 tháng', addMonths: 24 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDeadlineDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  // Clamp to at least 1 so we never divide by zero in the live preview.
  return Math.max(1, months);
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreateGoalScreen() {
  const router = useRouter();
  const { data: walletsData, isLoading: walletsLoading } = useWallets();

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);
  const default6mIso = useMemo(() => toIsoDate(addMonths(today, 6)), [today]);

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadlineIso, setDeadlineIso] = useState<string>(default6mIso);
  const [activePreset, setActivePreset] = useState<string | null>('6m');
  const [fundingWalletId, setFundingWalletId] = useState<string | null>(null);
  const [initialContribution, setInitialContribution] = useState('');
  const [loading, setLoading] = useState(false);

  if (walletsLoading || !walletsData) return <LoadingSpinner />;

  const visibleWallets = walletsData.wallets.filter((w) => !w.isDeleted);
  const fundingWallet =
    visibleWallets.find((w) => w.id === fundingWalletId) ?? null;

  // ── Derived values ───────────────────────────────────────────────────────

  const targetNum = parseInt(target, 10) || 0;
  const initialNum = parseInt(initialContribution, 10) || 0;
  const remainingAfterInitial = Math.max(0, targetNum - initialNum);
  const monthsRemaining = monthsBetween(todayIso, deadlineIso);
  const requiredMonthly =
    targetNum > 0 ? Math.ceil(remainingAfterInitial / monthsRemaining) : 0;

  const canSubmit =
    name.trim().length > 0 &&
    targetNum > 0 &&
    deadlineIso > todayIso &&
    fundingWalletId !== null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePresetPress = (preset: typeof DEADLINE_PRESETS[number]) => {
    setActivePreset(preset.key);
    setDeadlineIso(toIsoDate(addMonths(today, preset.addMonths)));
  };

  const handleDeadlinePicker = () => {
    // Native datepicker requires a dev build (matches calendar/edit-entry pattern).
    Alert.alert(
      'Chọn ngày tùy chỉnh',
      'Bộ chọn ngày sẽ khả dụng sau khi nâng cấp Dev Build. Tạm thời hãy dùng các mốc nhanh phía trên.',
    );
  };

  const handleFundingWalletPicker = () => {
    if (visibleWallets.length === 0) {
      Alert.alert('Chưa có ví', 'Tạo ví trước khi đặt mục tiêu tiết kiệm.');
      return;
    }
    Alert.alert(
      'Ví nguồn',
      'Khoản đóng góp sẽ được trừ từ ví này.',
      [
        ...visibleWallets.map((w) => ({
          text: `${w.name} • ${formatVND(w.balance)}`,
          onPress: () => setFundingWalletId(w.id),
        })),
        { text: 'Hủy', style: 'cancel' as const },
      ],
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Đã tạo mục tiêu',
        `Mục tiêu "${name.trim()}" đã sẵn sàng. Hãy đóng góp đều đặn nhé!`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }, 500);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mục tiêu mới</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name + Target */}
          <View style={styles.card}>
            <TextInput
              label="Tên mục tiêu"
              value={name}
              onChangeText={setName}
              placeholder="VD: Du lịch Đà Nẵng hè 2026"
              autoCapitalize="sentences"
              containerStyle={styles.field}
              maxLength={60}
            />

            <TextInput
              label="Số tiền mục tiêu (VND)"
              value={target}
              onChangeText={(t) => setTarget(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              containerStyle={styles.field}
            />
            {targetNum > 0 ? (
              <Text style={styles.preview}>{formatVND(targetNum)}</Text>
            ) : null}
          </View>

          {/* Deadline presets */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Hạn hoàn thành</Text>
            <View style={styles.presetRow}>
              {DEADLINE_PRESETS.map((preset) => {
                const selected = activePreset === preset.key;
                return (
                  <TouchableOpacity
                    key={preset.key}
                    style={[
                      styles.presetChip,
                      selected ? styles.presetChipSelected : styles.presetChipDefault,
                    ]}
                    onPress={() => handlePresetPress(preset)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.presetLabel,
                        selected
                          ? styles.presetLabelSelected
                          : styles.presetLabelDefault,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.dateRow}
              onPress={handleDeadlinePicker}
              activeOpacity={0.75}
            >
              <Text style={styles.dateLabel}>Ngày kết thúc</Text>
              <Text style={styles.dateValue}>
                {formatDeadlineDisplay(deadlineIso)} ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* Funding wallet */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ví nguồn</Text>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={handleFundingWalletPicker}
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

          {/* Initial contribution (optional) */}
          <View style={styles.card}>
            <TextInput
              label="Đóng góp ban đầu (tùy chọn)"
              value={initialContribution}
              onChangeText={(t) => setInitialContribution(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              containerStyle={styles.field}
            />
            {initialNum > 0 ? (
              <Text style={styles.preview}>{formatVND(initialNum)}</Text>
            ) : null}
          </View>

          {/* Live summary */}
          {targetNum > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Bạn cần tiết kiệm</Text>
              <Text style={styles.summaryAmount}>
                {formatVND(requiredMonthly)}
              </Text>
              <Text style={styles.summaryUnit}>mỗi tháng</Text>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Còn lại sau đóng góp</Text>
                <Text style={styles.summaryRowValue}>
                  {formatVND(remainingAfterInitial)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Số tháng còn lại</Text>
                <Text style={styles.summaryRowValue}>
                  {monthsRemaining} tháng
                </Text>
              </View>
            </View>
          ) : null}

          <Button
            title="Tạo mục tiêu"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            style={styles.submit}
          />

          {!canSubmit ? (
            <Text style={styles.disabledHint}>
              Hãy nhập tên, số tiền mục tiêu và chọn ví nguồn để tiếp tục.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  field: { marginBottom: 0 },
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

  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  presetChip: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
  },
  presetChipDefault: {
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[50],
  },
  presetChipSelected: {
    borderColor: COLORS.brand[500],
    backgroundColor: COLORS.brand[50],
  },
  presetLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  presetLabelDefault: { color: COLORS.gray[600] },
  presetLabelSelected: { color: COLORS.brand[600] },

  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
  },
  dateLabel: { fontSize: FONT_SIZE.sm, color: COLORS.gray[600] },
  dateValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
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
  pickerValue: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
  },
  pickerPlaceholder: { color: COLORS.gray[400] },
  pickerChevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },
  helperText: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 16,
  },

  summaryCard: {
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    alignItems: 'center',
    ...SHADOW.md,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    marginBottom: SPACING[1],
  },
  summaryAmount: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  summaryUnit: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    marginBottom: SPACING[3],
  },
  summaryDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.brand[400],
    marginBottom: SPACING[3],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: SPACING[1],
  },
  summaryRowLabel: { fontSize: FONT_SIZE.sm, color: COLORS.brand[100] },
  summaryRowValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },

  submit: { marginTop: SPACING[2] },
  disabledHint: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});
