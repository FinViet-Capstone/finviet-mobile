import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis } from 'victory-native';
import { BarChart3 } from 'lucide-react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { COLORS, FONT_SIZE } from '@/constants/theme';

export interface WeekBarDatum {
  /** Day label e.g. "T2", "T3" … "CN" (Vietnamese weekday abbreviations) */
  day: string;
  /** Total spending amount for that day in VND */
  amount: number;
  /** true when this day's amount exceeds the weekly daily average → bar turns red */
  overAverage: boolean;
}

export interface VictoryBarWeekProps {
  data: WeekBarDatum[];
  /** Chart height in pixels — defaults to 220 */
  height?: number;
  /**
   * Optional value formatter for the tooltip subline. Receives the bar value.
   * Defaults to `String(value)`.
   */
  formatValue?: (value: number) => string;
}

/**
 * 7-day spending bar chart wrapping VictoryBar (Victory Native v36 API).
 * Bars are colored red when `overAverage` is true, green otherwise.
 * Renders EmptyState when data is empty or all amounts are zero.
 *
 * Tooltip behavior: hold-to-peek. Pressing a bar surfaces a label + value
 * tooltip directly above the bar; releasing clears it. The tooltip's x is
 * computed from the bar's index in the data array (not the touch coords),
 * which keeps the tooltip aligned with the bar even on bumpy presses.
 *
 * Victory Native v36 notes:
 *  - Use VictoryChart + VictoryBar (not CartesianChart — that's v37+ XL)
 *  - Press is wired via the `events` prop. Event coords are unreliable across
 *    SVG/RN boundaries, so we don't use them — the datum index drives layout.
 *  - VictoryAxis is used for x-axis labels; y-axis left implicit for a clean look
 */
export function VictoryBarWeek({
  data,
  height = 220,
  formatValue = String,
}: VictoryBarWeekProps) {
  const hasData = data.length > 0 && data.some((d) => d.amount > 0);
  const [active, setActive] = useState<{ index: number; datum: WeekBarDatum } | null>(null);
  const [width, setWidth] = useState(0);

  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Chưa có dữ liệu"
        subtitle="Thêm giao dịch để xem biểu đồ"
      />
    );
  }

  // Carry the original domain datum + index through to the events callback.
  const chartData = data.map((d, i) => ({
    x: d.day,
    y: d.amount,
    overAverage: d.overAverage,
    original: d,
    index: i,
  }));

  type ChartDatum = (typeof chartData)[number];

  const events = [
    {
      target: 'data' as const,
      eventHandlers: {
        onPressIn: () => [
          {
            target: 'data' as const,
            mutation: (props: { datum?: ChartDatum }) => {
              if (props.datum?.original) {
                setActive({ index: props.datum.index, datum: props.datum.original });
              }
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

  // Position the tooltip above the touched bar.
  // VictoryChart pads x: 8px on left & right; domainPadding spreads bars across the
  // remaining width. Each bar's center sits at: leftPad + (i + 0.5) * slotWidth.
  let tipX = 0;
  let tipY = 24; // sits near the top of the chart area
  if (active && width > 0) {
    const leftPad = 8;
    const rightPad = 8;
    const innerW = width - leftPad - rightPad;
    const slot = innerW / data.length;
    tipX = leftPad + slot * (active.index + 0.5);
  }

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <VictoryChart
        height={height}
        domainPadding={{ x: 16 }}
        padding={{ top: 16, bottom: 40, left: 8, right: 8 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: COLORS.gray[300] },
            tickLabels: {
              fontSize: FONT_SIZE.xs,
              fill: COLORS.gray[500],
              padding: 4,
            },
            grid: { stroke: 'transparent' },
          }}
        />
        <VictoryBar
          data={chartData}
          cornerRadius={{ top: 4 }}
          events={events}
          style={{
            data: {
              fill: ({ datum }: { datum?: { overAverage: boolean } }) =>
                datum?.overAverage ? COLORS.danger : COLORS.success,
            },
          }}
        />
      </VictoryChart>

      {active ? (
        <ChartTooltip
          x={tipX}
          y={tipY}
          offsetY={0}
          width={120}
          label={active.datum.day}
          value={formatValue(active.datum.amount)}
          accent={active.datum.overAverage ? COLORS.danger : COLORS.success}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
