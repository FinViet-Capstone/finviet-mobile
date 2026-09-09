import React, { useMemo } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';
import type { PieBucket } from './BudgetAllocationPie';

const S = {
  spent: 'Đã chi',
  limit: 'Hạn mức',
  left: 'Còn lại',
  over: 'Vượt hạn mức',
  overNote: (label: string, amount: string) =>
    `Bạn đã chi vượt hạn mức ${label} ${amount} trong tháng này.`,
  savedOver: 'Bạn đã vượt mục tiêu tiết kiệm tháng này — rất tốt.',
  noLimit: 'Bucket này chưa được phân bổ hạn mức nào.',
  cta: 'Xem chi tiết ngân sách',
  close: 'Đóng',
};

export interface BucketDetailPopupProps {
  readonly bucket: PieBucket | null;
  readonly onClose: () => void;
  readonly onOpenBudgets: () => void;
}

/**
 * Long-press detail for one pie sector. This is where the truthful overspend
 * figure lives: the ring itself caps a sector at its own share (see
 * `computePieSegments`) and the card's badge keeps Home's documented 100% clamp,
 * so "vượt bao nhiêu" has to be answerable somewhere — here.
 */
export function BucketDetailPopup({ bucket, onClose, onOpenBudgets }: BucketDetailPopupProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasLimit = !!bucket && bucket.limit > 0;
  // Truthful and uncapped, unlike the badge on the card behind this popup.
  const rawPct = hasLimit ? Math.round((bucket.spent / bucket.limit) * 100) : 0;
  const over = hasLimit ? Math.max(0, bucket.spent - bucket.limit) : 0;
  const isOver = over > 0;
  const goodOver = isOver && !!bucket?.goalMode;
  const accentColor = !isOver
    ? colors.onSurface
    : goodOver
    ? colors.budget.safe
    : colors.budget.danger;
  // The header dot identifies WHICH bucket this is, so it has to be the sector's
  // own colour — including the switch to danger/safe once over, so it still points
  // at the sector that just changed colour behind the scrim.
  const dotColor = !isOver ? (bucket?.color ?? accentColor) : accentColor;

  return (
    <Modal
      visible={!!bucket}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={S.close}>
        {/* Swallow taps on the card itself so only the backdrop dismisses. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {!!bucket && (
            <>
              <View style={styles.header}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                <Text style={styles.title}>{bucket.label}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={S.close}
                  hitSlop={8}
                >
                  <MaterialIcon name="close" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {hasLimit ? (
                <>
                  <Text style={[styles.pct, { color: accentColor }]}>{rawPct}%</Text>

                  <View style={styles.rows}>
                    <Row label={S.spent} value={formatVND(bucket.spent)} />
                    <Row label={S.limit} value={formatVND(bucket.limit)} />
                    <Row
                      label={isOver ? S.over : S.left}
                      value={formatVND(isOver ? over : bucket.limit - bucket.spent)}
                      valueColor={isOver ? accentColor : undefined}
                      emphasis
                    />
                  </View>

                  {isOver && (
                    <View style={[styles.note, { backgroundColor: withAlpha(accentColor, 0.12) }]}>
                      <MaterialIcon
                        name={goodOver ? 'check_circle' : 'warning'}
                        size={16}
                        color={accentColor}
                      />
                      <Text style={[styles.noteText, { color: accentColor }]}>
                        {goodOver ? S.savedOver : S.overNote(bucket.label, formatVND(over))}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>{S.noLimit}</Text>
              )}

              <TouchableOpacity style={styles.cta} onPress={onOpenBudgets} activeOpacity={0.7}>
                <Text style={styles.ctaText}>{S.cta}</Text>
                <MaterialIcon name="arrow_forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  value,
  valueColor,
  emphasis,
}: {
  label: string;
  value: string;
  valueColor?: string;
  emphasis?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          emphasis && styles.rowValueEmphasis,
          !!valueColor && { color: valueColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: withAlpha('#000000', 0.55),
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING[5],
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surfaceContainer,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[5],
      borderWidth: 1,
      borderColor: withAlpha(colors.outline, 0.15),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[2],
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    title: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
    },
    pct: {
      fontSize: FONT_SIZE['3xl'],
      fontWeight: FONT_WEIGHT.extrabold,
      marginTop: SPACING[3],
    },
    rows: {
      marginTop: SPACING[3],
      gap: SPACING[2],
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowLabel: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
    },
    rowValue: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurface,
    },
    rowValueEmphasis: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.bold,
    },
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING[2],
      marginTop: SPACING[4],
      padding: SPACING[3],
      borderRadius: BORDER_RADIUS.lg,
    },
    noteText: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      lineHeight: 19,
    },
    emptyText: {
      marginTop: SPACING[3],
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING[1],
      marginTop: SPACING[5],
      paddingVertical: SPACING[3],
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.primary, 0.12),
    },
    ctaText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.primary,
    },
  });
}
