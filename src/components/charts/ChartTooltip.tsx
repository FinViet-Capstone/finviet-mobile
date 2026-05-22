import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW } from '@/constants/theme';

export interface ChartTooltipProps {
  /** Top-left x position (px) inside the chart container's coordinate space */
  x: number;
  /** Top-left y position (px) inside the chart container's coordinate space */
  y: number;
  /** Heading line — typically the category name or weekday label */
  label: string;
  /** Subline — typically the formatted amount */
  value: string;
  /** Optional accent color (drawn as a left border) — usually the slice/bar color */
  accent?: string;
  /** Tooltip width in px — defaults to 140 */
  width?: number;
  /** Vertical offset above the touch point — defaults to 36 */
  offsetY?: number;
}

/**
 * Hold-to-peek tooltip rendered on top of a chart. The parent positions it via
 * absolute coordinates measured from the chart's top-left, then offsets up by
 * `offsetY` so the bubble sits above the touch point rather than under the
 * user's finger.
 *
 * Sits inside a `View` with `pointerEvents="none"` so taps continue reaching
 * the chart underneath.
 */
export function ChartTooltip({
  x,
  y,
  label,
  value,
  accent,
  width = 140,
  offsetY = 36,
}: ChartTooltipProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          left: x - width / 2,
          top: y - offsetY,
          width,
          borderLeftColor: accent ?? COLORS.brand[500],
        },
      ]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: COLORS.gray[900],
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    ...SHADOW.sm,
  },
  label: {
    color: COLORS.gray[100],
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: 2,
  },
  value: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});
