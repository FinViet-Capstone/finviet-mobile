import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryPie } from 'victory-native';
import { PieChart } from 'lucide-react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
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
  /**
   * Optional value formatter for the tooltip subline. Receives the slice value.
   * Defaults to `String(value)`.
   */
  formatValue?: (value: number) => string;
}

/**
 * Donut chart wrapping VictoryPie (Victory Native v36 API).
 * Renders EmptyState when data is empty or all values are zero.
 *
 * Tooltip behavior: hold-to-peek. Pressing a slice surfaces a label + value
 * tooltip in the donut hole; releasing clears it. The tooltip is positioned at
 * the chart's geometric center (independent of touch coords), which gives a
 * stable read point regardless of which slice is held.
 *
 * Victory Native v36 notes:
 *  - Press is wired via the `events` prop. Event coords are unreliable across
 *    SVG/RN boundaries, so we don't use them — the datum alone drives the UI.
 *  - Do NOT use CartesianChart or useChartPressState (those are v37+ XL API)
 */
export function VictoryDonut({
  data,
  innerRadius = 70,
  height = 220,
  formatValue = String,
}: VictoryDonutProps) {
  const hasData = data.length > 0 && data.some((d) => d.y > 0);
  const [active, setActive] = useState<DonutDatum | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: height });

  if (!hasData) {
    return (
      <EmptyState
        icon={PieChart}
        title="Chưa có dữ liệu"
        subtitle="Thêm giao dịch để xem biểu đồ"
      />
    );
  }

  const events = [
    {
      target: 'data' as const,
      eventHandlers: {
        onPressIn: () => [
          {
            target: 'data' as const,
            mutation: (props: { datum?: DonutDatum }) => {
              if (props.datum) setActive(props.datum);
              return null;
            },
          },
        ],
        onPressOut: () => {
          setActive(null);
          return [];
        },
      },
    },
  ];

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(e) =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      <VictoryPie
        data={data}
        innerRadius={innerRadius}
        height={height}
        padding={{ top: 16, bottom: 16, left: 16, right: 16 }}
        events={events}
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

      {active ? (
        <ChartTooltip
          x={size.w / 2}
          y={size.h / 2}
          offsetY={0}
          width={140}
          label={active.x}
          value={formatValue(active.y)}
          accent={active.color}
        />
      ) : null}
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
