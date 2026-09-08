import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONT_WEIGHT } from '@/theme';

export interface BudgetDonutProps {
  /** spent / limit × 100 — unclamped; the arc itself caps at 100%. */
  readonly percentage: number;
  /** Arc color; the caller owns status → color mapping. */
  readonly color: string;
  /** Unfilled remainder of the ring. */
  readonly trackColor: string;
  /** Outer diameter in points. */
  readonly size?: number;
  readonly strokeWidth?: number;
  /** Renders the rounded percentage in the middle. */
  readonly showLabel?: boolean;
  /** Label color — defaults to `color`. */
  readonly labelColor?: string;
  readonly labelSize?: number;
  /** Rendered under the percentage (detail screen only). */
  readonly caption?: string;
  readonly captionColor?: string;
  readonly captionSize?: number;
}

/**
 * Circular budget-progress ring. Replaces the old linear track on the
 * Budgets tab's category rows and is reused, larger, on the category
 * progress-detail screen.
 *
 * The arc is capped at 100% (a 340%-spent ring would otherwise wrap and read
 * as 40%), while the printed percentage stays truthful — the same split the
 * bucket cards already use.
 */
export function BudgetDonut({
  percentage,
  color,
  trackColor,
  size = 46,
  strokeWidth = 5,
  showLabel = true,
  labelColor,
  labelSize,
  caption,
  captionColor,
  captionSize,
}: BudgetDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(percentage, 100)) / 100;
  const dashOffset = circumference * (1 - filled);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {filled > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            fill="none"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      {showLabel && (
        <View style={styles.center} pointerEvents="none">
          <Text
            style={[
              styles.label,
              { color: labelColor ?? color, fontSize: labelSize ?? Math.round(size * 0.24) },
            ]}
            numberOfLines={1}
          >
            {`${Math.round(percentage)}%`}
          </Text>
          {!!caption && (
            <Text
              style={[
                styles.caption,
                { color: captionColor ?? color, fontSize: captionSize ?? Math.round(size * 0.1) },
              ]}
              numberOfLines={1}
            >
              {caption}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: FONT_WEIGHT.bold,
  },
  caption: {
    fontWeight: FONT_WEIGHT.medium,
    marginTop: 2,
  },
});
