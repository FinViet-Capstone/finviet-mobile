import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { EmptyState } from '@/components/common/EmptyState';
import { COLORS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export interface DonutDatum {
  /** Label shown when the slice is focused */
  x: string;
  /** Numeric value (must be > 0 to appear as a slice) */
  y: number;
  /** Hex fill color for the slice */
  color: string;
}

export interface DonutProps {
  data: DonutDatum[];
  /** Inner radius for the donut hole — defaults to 60 */
  innerRadius?: number;
  /** Outer radius — defaults to 100 */
  radius?: number;
  /** Optional value formatter for the center label. Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
  /** Heading shown above the value when no slice is focused. Defaults to "Tổng". */
  totalLabel?: string;
}

/**
 * Donut chart with sectionAutoFocus — pressing a slice pulls it outward and
 * surfaces its label + value in the center hole. Releasing reverts the focus.
 *
 * Slices are pre-sorted by value descending so the largest sits at 12 o'clock.
 *
 * Built on `react-native-gifted-charts` (SVG-based, Expo Go compatible).
 */
export function Donut({
  data,
  innerRadius = 60,
  radius = 100,
  formatValue = String,
  totalLabel = 'Tổng',
}: DonutProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const sorted = [...data]
    .filter((d) => d.y > 0)
    .sort((a, b) => b.y - a.y);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon="pie_chart"
        title="Chưa có dữ liệu"
        subtitle="Thêm giao dịch để xem biểu đồ"
      />
    );
  }

  const total = sorted.reduce((s, d) => s + d.y, 0);

  const pieData = sorted.map((d, i) => ({
    value: d.y,
    color: d.color,
    focused: focusedIndex === i,
  }));

  const focused = focusedIndex !== null ? sorted[focusedIndex] : null;

  return (
    <View style={styles.container}>
      <PieChart
        data={pieData}
        donut
        radius={radius}
        innerRadius={innerRadius}
        sectionAutoFocus
        focusOnPress
        innerCircleColor={COLORS.white}
        onPress={(_item: unknown, index: number) =>
          setFocusedIndex((cur) => (cur === index ? null : index))
        }
        centerLabelComponent={() => (
          <View style={styles.centerLabel}>
            {focused ? (
              <>
                <Text
                  style={[styles.centerHeading, { color: focused.color }]}
                  numberOfLines={1}
                >
                  {focused.x}
                </Text>
                <Text style={styles.centerValue} numberOfLines={1}>
                  {formatValue(focused.y)}
                </Text>
                <Text style={styles.centerSub} numberOfLines={1}>
                  {((focused.y / total) * 100).toFixed(0)}%
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.centerHeading} numberOfLines={1}>
                  {totalLabel}
                </Text>
                <Text style={styles.centerValue} numberOfLines={1}>
                  {formatValue(total)}
                </Text>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHeading: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  centerValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  centerSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
});
