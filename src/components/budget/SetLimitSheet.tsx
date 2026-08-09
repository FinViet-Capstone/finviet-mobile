import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomSlider } from '@/components/common/CustomSlider';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { useCreateBudget } from '@/hooks/useBudgets';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Đặt hạn mức',
  amountLabel: 'Hạn mức hàng tháng',
  save: 'Lưu',
  cancel: 'Huỷ',
  monthly: '/ tháng',
  noIncome: 'Chưa có thu nhập — vào Cài đặt để thêm.',
  remaining: 'Còn lại trong nhóm',
  overWarningTitle: 'Vượt phân bổ',
  overWarningConfirm: (bucket: string, cap: string) =>
    `Tổng hạn mức nhóm ${bucket} sẽ vượt phân bổ ${cap}. Tiếp tục?`,
  proceed: 'Tiếp tục',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  categoryId: string;
  categoryName: string;
  bucket: string;
  existingLimit?: number;
  /** income × bucketPct — slider track max and bucket denominator */
  allocationCap: number;
  /** allocationCap − Σ(other category limits in same bucket) — soft marker */
  remainingCap: number;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString('vi-VN');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetLimitSheet({
  visible,
  categoryId,
  categoryName,
  bucket,
  existingLimit,
  allocationCap,
  remainingCap,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const createBudget = useCreateBudget();

  const [sliderValue, setSliderValue] = useState(existingLimit ?? 0);
  const [amountFocused, setAmountFocused] = useState(false);
  const [amountRaw, setAmountRaw] = useState('');

  const sliderMax = allocationCap > 0 ? allocationCap : 10_000_000;
  const hasIncome = allocationCap > 0;
  const isOverRemaining = sliderValue > remainingCap;
  const markerPct = sliderMax > 0 ? Math.min(100, (remainingCap / sliderMax) * 100) : 0;

  const openAmountKeypad = useCallback(() => {
    setAmountRaw('');
    setAmountFocused(true);
  }, []);

  const handleAmountNumberPress = useCallback((key: string) => {
    setAmountRaw((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
  }, []);

  const handleAmountBackspace = useCallback(() => setAmountRaw((prev) => prev.slice(0, -1)), []);
  const handleAmountClear = useCallback(() => setAmountRaw(''), []);

  const handleAmountClose = useCallback(() => {
    setAmountFocused(false);
    setAmountRaw('');
  }, []);

  const handleAmountDone = useCallback(() => {
    const typed = parseInt(amountRaw || '0', 10);
    setSliderValue(Math.min(Math.max(typed, 0), sliderMax));
    setAmountFocused(false);
    setAmountRaw('');
  }, [amountRaw, sliderMax]);

  const doSave = useCallback(async () => {
    await createBudget.mutateAsync({ categoryId, monthlyLimit: Math.round(sliderValue) });
    onClose();
  }, [sliderValue, categoryId, createBudget, onClose]);

  const handleSave = useCallback(() => {
    // 0đ là giá trị hợp lệ (đặt hạn mức = 0) — không chặn.
    if (isOverRemaining) {
      Alert.alert(
        S.overWarningTitle,
        S.overWarningConfirm(bucket, `${formatVND(allocationCap)}đ`),
        [
          { text: S.cancel, style: 'cancel' },
          { text: S.proceed, onPress: doSave },
        ],
      );
    } else {
      doSave();
    }
  }, [sliderValue, isOverRemaining, bucket, allocationCap, doSave]);

  const thumbColor = isOverRemaining ? COLORS.secondary : COLORS.primary;
  const trackColor = isOverRemaining ? COLORS.secondary : COLORS.primary;

  return (
    <>
      <DraggableSheet visible={visible} onClose={onClose}>
        <View style={styles.sheet}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, amountFocused && { paddingBottom: NUMPAD_HEIGHT }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{S.title}</Text>
              <Text style={styles.categoryName}>{categoryName}</Text>
            </View>

            {/* Slider */}
            <Text style={styles.sectionLabel}>{S.amountLabel}</Text>

            {!hasIncome && (
              <Text style={styles.noIncomeHint}>{S.noIncome}</Text>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.sliderAmountRow}
              onPress={openAmountKeypad}
              accessibilityRole="button"
              accessibilityLabel={S.amountLabel}
            >
              <Text style={[styles.sliderAmount, isOverRemaining && { color: COLORS.secondary }]}>
                {amountFocused
                  ? `${parseInt(amountRaw || '0', 10) > 0 ? formatVND(parseInt(amountRaw, 10)) : '0'}đ`
                  : sliderValue > 0 ? `${formatVND(Math.round(sliderValue))}đ` : '0đ'}
              </Text>
              <Text style={styles.sliderSuffix}>{S.monthly}</Text>
              <MaterialIcon name="edit" size={14} color={isOverRemaining ? COLORS.secondary : COLORS.primary} />
            </TouchableOpacity>

            {/* Slider track with remainingCap marker */}
            <View style={styles.sliderWrap}>
              <CustomSlider
                style={styles.slider}
                minimumValue={0}
                maximumValue={sliderMax}
                step={50_000}
                value={sliderValue}
                onValueChange={setSliderValue}
                minimumTrackTintColor={trackColor}
                maximumTrackTintColor={COLORS.surfaceVariant}
                thumbTintColor={thumbColor}
              />
              {/* Remaining cap marker */}
              {hasIncome && markerPct > 0 && markerPct < 100 && (
                <View style={[styles.marker, { left: `${markerPct}%` as any }]} />
              )}
            </View>

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelMin}>0đ</Text>
              {hasIncome && remainingCap > 0 && remainingCap < allocationCap && (
                <Text style={[styles.sliderLabelMarker, isOverRemaining && { color: COLORS.secondary }]}>
                  {S.remaining}: {formatVND(remainingCap)}đ
                </Text>
              )}
              {hasIncome && (
                <Text style={styles.sliderLabelMax}>{formatVND(sliderMax)}đ</Text>
              )}
            </View>

            {/* Over-remaining warning */}
            {isOverRemaining && (
              <View style={styles.overWarning}>
                <MaterialIcon name="warning" size={14} color={COLORS.secondary} />
                <Text style={styles.overWarningText}>
                  Vượt ngân sách còn lại của nhóm {bucket}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions — pinned below the scroll area so they're always reachable */}
          <View style={[styles.actions, { paddingBottom: insets.bottom + SPACING[2] }]}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.saveBtn, createBudget.isPending && styles.saveBtnDisabled,
                isOverRemaining && styles.saveBtnWarning]}
              onPress={handleSave}
              disabled={createBudget.isPending}
            >
              {createBudget.isPending
                ? <ActivityIndicator size="small" color={COLORS.onPrimary} />
                : <Text style={styles.saveText}>{S.save}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </DraggableSheet>

      <NumericKeypad
        visible={amountFocused}
        onClose={handleAmountClose}
        onNumberPress={handleAmountNumberPress}
        onBackspace={handleAmountBackspace}
        onClear={handleAmountClear}
        onDone={handleAmountDone}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flexShrink: 1,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  header: { marginBottom: SPACING[4] },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  categoryName: { fontSize: FONT_SIZE.sm, color: COLORS.primary, marginTop: SPACING[1] },
  sectionLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: SPACING[2],
  },
  noIncomeHint: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant, marginBottom: SPACING[3] },
  sliderAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING[1], marginBottom: SPACING[2] },
  sliderAmount: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  sliderSuffix: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  sliderWrap: { position: 'relative' },
  slider: { width: '100%', height: 40 },
  marker: {
    position: 'absolute',
    top: 16,
    width: 2,
    height: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 1,
    marginLeft: -1,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING[2] },
  sliderLabelMin: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  sliderLabelMarker: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  sliderLabelMax: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  overWarning: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[2],
    backgroundColor: `${COLORS.secondary}15`, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3], marginBottom: SPACING[3],
    borderWidth: 1, borderColor: `${COLORS.secondary}30`,
  },
  overWarningText: { fontSize: FONT_SIZE.xs, color: COLORS.secondary, flex: 1 },
  actions: {
    flexDirection: 'row', gap: SPACING[3],
    paddingHorizontal: SPACING[4], paddingTop: SPACING[3],
    borderTopWidth: 1, borderTopColor: COLORS.outlineVariant,
  },
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
  saveBtnWarning: { backgroundColor: COLORS.secondary },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.onPrimary },
});
