import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export interface UncategorizedPillProps {
  count: number;
  onPress?: () => void;
}

/** Floating pill showing how many transactions still need a category. */
export function UncategorizedPill({ count, onPress }: UncategorizedPillProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (count <= 0) return null;
  return (
    <TouchableOpacity style={styles.uncatPill} activeOpacity={0.85} onPress={onPress}>
      <MaterialIcon name="error_outline" size={15} color={colors.onSecondary} />
      <Text style={styles.uncatPillText}>{`${count} chưa phân loại`}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    uncatPill: {
      position: 'absolute',
      bottom: SPACING[5],
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[2],
      backgroundColor: colors.secondaryContainer,
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full,
    },
    uncatPillText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSecondary,
    },
  });
}
