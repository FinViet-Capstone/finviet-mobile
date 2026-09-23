import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import type { RawFieldPair } from '@/types/extraction';
import { RawFieldsTable } from './RawFieldsTable';

const S = {
  rawLabel: 'Dữ liệu gốc từ file',
  processedLabel: 'Kết quả đã xử lý',
  amountLabel: 'Số tiền',
  categoryLabel: 'Danh mục',
};

function formatVND(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

/**
 * One row's raw-vs-formatted content — shared verbatim by the per-row sheet and
 * every card in the global full-screen list (decision: one visual treatment,
 * not two). Read-only: no edit affordances, no selection.
 */
export function RawDataCardBody({
  amount, type, categoryLabel, categoryTone, rawFields,
}: {
  amount: number;
  type: 'expense' | 'income';
  categoryLabel: string;
  categoryTone: 'resolved' | 'failed' | 'uncategorized';
  categoryColor?: string;
  rawFields?: RawFieldPair[];
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isIncome = type === 'income';

  return (
    <View style={styles.container}>
      {/* Only rendered when this specific row has data — a batch can be partial. */}
      {rawFields && rawFields.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>{S.rawLabel}</Text>
          <RawFieldsTable fields={rawFields} />
        </View>
      )}

      <View>
        <Text style={styles.sectionLabel}>{S.processedLabel}</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{S.amountLabel}</Text>
          <Text style={[styles.fieldValue, { color: isIncome ? colors.tertiary : colors.onSurface }]}>
            {isIncome ? '+' : '-'}{formatVND(amount)}
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{S.categoryLabel}</Text>
          <Text
            style={[
              styles.fieldValue,
              categoryTone === 'failed' && { color: colors.error },
              categoryTone === 'uncategorized' && { color: colors.secondary, fontStyle: 'italic' },
            ]}
          >
            {categoryLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { gap: SPACING[3] },
    sectionLabel: {
      fontSize: 10,
      fontWeight: FONT_WEIGHT.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.onSurfaceVariant,
      marginBottom: SPACING[1],
    },
    field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 },
    fieldLabel: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, flex: 1 },
    fieldValue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface, flex: 2, textAlign: 'right' },
  });
}
