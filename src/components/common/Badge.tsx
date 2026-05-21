import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

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
  backgroundColor = COLORS.brand[100],
  textColor = COLORS.brand[700],
  style,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
