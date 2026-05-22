import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { BarChart3 } from 'lucide-react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { COLORS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export interface WeekBarDatum {
  /** Day label e.g. "T2", "T3" … "CN" (Vietnamese weekday abbreviations) */
  day: string;
  /** Total spending amount for that day in VND (categorized + uncategorized) */
  amount: number;
  /** Categorized portion of the day's spend */
  categorized: number;
  /** Uncategorized portion of the day's spend (renders as gray segment on top) */
  uncategorized: number;
  /** true when the day's amount exceeds the weekly daily average — currently
   *  unused by the renderer (color encoding moved to category vs uncategorized)
   *  but kept in the type so existing callers compile. */
  overAverage?: boolean;
}

export interface BarWeekProps {
  data: WeekBarDatum[];
  /** Chart height in pixels — defaults to 220 */
  height?: number;
  /** Optional value formatter for tooltip and y-axis labels. Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
}

/**
 * 7-day stacked bar chart inspired by iOS Screen Time.
 *
 * Each bar has two stacked segments:
 *   - Bottom: categorized spend (brand color)
 *   - Top:    uncategorized spend (neutral gray)
 *
 * A dashed reference line is rendered at the weekly daily average so users can
 * see at a glance which days went over.
 *
 * Built on `react-native-gifted-charts` (SVG-based, Expo Go compatible).
 */
export function BarWeek({
  data,
  height = 240,
  formatValue = String,
}: BarWeekProps) {
  const hasData = data.length > 0 && data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Chưa có dữ liệu"
        subtitle="Thêm giao dịch để xem biểu đồ"
      />
    );
  }

  const dailyAverage = data.reduce((s, d) => s + d.amount, 0) / data.length;

  const stackData = data.map((d) => ({
    label: d.day,
    stacks: [
      // Categorized — colored, sits at the bottom
      { value: d.categorized, color: COLORS.brand[500] },
      // Uncategorized — gray, sits on top
      { value: d.uncategorized, color: COLORS.gray[400] },
    ],
    // Compact label above the stack showing the total
    topLabelComponent: () =>
      d.amount > 0 ? (
        <Text style={styles.topLabel} numberOfLines={1}>
          {formatValue(d.amount)}
        </Text>
      ) : null,
  }));

  // Choose a "nice" max for the y-axis: round the largest day up to one
  // significant figure so tick labels read cleanly.
  const rawMax = Math.max(...data.map((d) => d.amount), dailyAverage);
  const niceMax = niceRoundUp(rawMax);

  return (
    <View style={styles.container}>
      <BarChart
        stackData={stackData}
        height={height - 40 /* leave room for x-axis labels */}
        barWidth={26}
        barBorderTopLeftRadius={4}
        barBorderTopRightRadius={4}
        spacing={14}
        initialSpacing={14}
        noOfSections={4}
        maxValue={niceMax}
        yAxisThickness={0}
        xAxisColor={COLORS.gray[300]}
        rulesColor={COLORS.gray[200]}
        rulesType="dashed"
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        formatYLabel={(label: string) => formatValue(Number(label))}
        showReferenceLine1
        referenceLine1Position={dailyAverage}
        referenceLine1Config={{
          color: COLORS.success,
          dashWidth: 4,
          dashGap: 4,
          thickness: 1,
          labelText: 'TB',
          labelTextStyle: styles.referenceLabel,
        }}
      />
    </View>
  );
}

/**
 * Rounds a number up to a clean tick value:
 *  120,000 → 200,000   8,400 → 10,000   53 → 60   0 → 1
 */
function niceRoundUp(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const fraction = n / exp;
  let nice: number;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  axisText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
  },
  topLabel: {
    fontSize: 10,
    color: COLORS.gray[600],
    fontWeight: FONT_WEIGHT.medium,
  },
  referenceLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.medium,
  },
});
