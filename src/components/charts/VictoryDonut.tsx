import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryPie } from 'victory-native';
import { PieChart } from 'lucide-react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { COLORS } from '@/constants/theme';

export interface DonutDatum {
  /** Label shown on the legend / tooltip */
  x: string;
  /** Numeric value (must be > 0 to appear as a slice) */
  y: number;
  /** Hex fill color for the slice */
  color: string;
}

export interface VictoryDonutProps {
  data: DonutDatum[];
  /** Inner radius for the donut hole — defaults to 70 */
  innerRadius?: number;
  /** Chart height in pixels — defaults to 220 */
  height?: number;
}

/**
 * Donut chart wrapping VictoryPie (Victory Native v36 API).
 * Renders EmptyState when data is empty or all values are zero.
 *
 * Victory Native v36 notes:
 *  - `innerRadius` prop creates the donut hole on VictoryPie
 *  - `style.data.fill` accepts a function receiving `{ datum }` for per-slice colors
 *  - Do NOT use CartesianChart or useChartPressState (those are v37+ XL API)
 */
export function VictoryDonut({
  data,
  innerRadius = 70,
  height = 220,
}: VictoryDonutProps) {
  const hasData = data.length > 0 && data.some((d) => d.y > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={PieChart}
        title="Chưa có dữ liệu"
        subtitle="Thêm giao dịch để xem biểu đồ"
      />
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <VictoryPie
        data={data}
        innerRadius={innerRadius}
        height={height}
        padding={{ top: 16, bottom: 16, left: 16, right: 16 }}
        style={{
          data: {
            fill: ({ datum }: { datum?: DonutDatum }) => datum?.color ?? COLORS.gray[300],
            stroke: COLORS.white,
            strokeWidth: 2,
          },
          labels: { display: 'none' },
        }}
        labels={() => ''}
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
});
