import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import type { RawFieldPair } from '@/types/extraction';

/**
 * Renders however many {header, value} pairs a row actually has — never a fixed
 * column set or count, since different banks export different columns.
 */
export function RawFieldsTable({ fields }: { fields: RawFieldPair[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.table}>
      {fields.map((field, i) => (
        <View key={`${field.header}_${i}`} style={[styles.row, i > 0 && styles.rowBorder]}>
          <Text style={styles.header} numberOfLines={2}>{field.header}</Text>
          <Text style={styles.value} numberOfLines={4}>{field.value}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    table: {
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row' },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.outlineVariant },
    header: {
      flex: 1,
      backgroundColor: colors.surfaceContainerHigh,
      color: colors.onSurfaceVariant,
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[1] + 2,
    },
    value: {
      flex: 1.4,
      color: colors.onSurface,
      fontSize: FONT_SIZE.xs,
      paddingHorizontal: SPACING[2],
      paddingVertical: SPACING[1] + 2,
    },
  });
}
