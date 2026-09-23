import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import type { RawFieldPair } from '@/types/extraction';
import { RawDataCardBody } from './RawDataCardBody';

const S = { title: 'Dữ liệu gốc' };

/** Opens only when the row has rawFields — csv-review.tsx never opens this for a row without data. */
export function CsvRawDataSheet({
  visible, onClose, merchant, amount, type, categoryLabel, categoryTone, rawFields,
}: {
  visible: boolean;
  onClose: () => void;
  merchant: string;
  amount: number;
  type: 'expense' | 'income';
  categoryLabel: string;
  categoryTone: 'resolved' | 'failed' | 'uncategorized';
  rawFields: RawFieldPair[];
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{S.title}</Text>
            <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.closeBtn} onPress={onClose} accessibilityLabel="Đóng">
            <MaterialIcon name="close" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
        <RawDataCardBody amount={amount} type={type} categoryLabel={categoryLabel} categoryTone={categoryTone} rawFields={rawFields} />
      </View>
    </DraggableSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { paddingHorizontal: SPACING[4], paddingTop: SPACING[1], gap: SPACING[4] },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING[2] },
    headerText: { flex: 1, minWidth: 0 },
    title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    merchant: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginTop: 2 },
    closeBtn: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.surfaceContainerHighest,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
