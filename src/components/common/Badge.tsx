import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export interface BadgeProps {
  label: string;
  /** Background color hex — defaults to brand[100] */
  backgroundColor?: string;
  /** Text color hex — defaults to brand[700] */
  textColor?: string;
  style?: ViewStyle;
}

export function Badge({
  label,
  backgroundColor,
  textColor,
  style,
}: BadgeProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bg = backgroundColor ?? colors.brand[100];
  const tc = textColor ?? colors.brand[700];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: tc }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1],
    },
    label: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
    },
  });
}
