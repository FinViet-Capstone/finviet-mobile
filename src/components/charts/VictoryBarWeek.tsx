import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis } from 'victory-native';
import { EmptyState } from '@/components/common/EmptyState';
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
}

/**
 * 7-day spending bar chart wrapping VictoryBar (Victory Native v36 API).
 * Bars are colored red when `overAverage` is true, green otherwise.
 * Renders EmptyState when data is empty or all amounts are zero.
 *
 * Victory Native v36 notes:
 *  - Use VictoryChart + VictoryBar (not CartesianChart — that's v37+ XL)
 *  - `style.data.fill` accepts a function receiving `{ datum }` for conditional color
 *  - `VictoryAxis` is used for x-axis labels; y-axis left implicit for a clean look
 */
export function VictoryBarWeek({ data, height = 220 }: VictoryBarWeekProps) {
  const hasData = data.length > 0 && data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <EmptyState
        iconName="bar-chart-outline"
        title="Chưa có dữ liệu"
        subtitle="Thêm giao dịch để xem biểu đồ"
      />
    );
  }

  // Victory Native expects `x` and `y` field names by default.
  // We map our domain data into those fields while preserving the extra flag.
  const chartData = data.map((d) => ({
    x: d.day,
    y: d.amount,
    overAverage: d.overAverage,
  }));

  return (
    <View style={[styles.container, { height }]}>
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
          style={{
            data: {
              fill: ({ datum }: { datum: { overAverage: boolean } }) =>
                datum.overAverage ? COLORS.danger : COLORS.success,
            },
          }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
