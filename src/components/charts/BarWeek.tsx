import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { BarChart3 } from 'lucide-react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { COLORS, FONT_SIZE } from '@/constants/theme';

export interface WeekBarDatum {
  /** Day label e.g. "T2", "T3" … "CN" (Vietnamese weekday abbreviations) */
  day: string;
  /** ISO date string "YYYY-MM-DD" for this bar — used by onDayPress */
  iso: string;
  /** Total spending amount for that day in VND (categorized + uncategorized) */
  amount: number;
  /** Categorized portion of the day's spend */
  categorized: number;
  /** Uncategorized portion of the day's spend (renders as gray segment on top) */
  uncategorized: number;
}

export interface BarWeekProps {
  data: WeekBarDatum[];
  /** Chart height in pixels — defaults to 240 */
  height?: number;
  /** Value formatter for top labels and y-axis. Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
  /** Called with the ISO date when the user taps a bar. */
  onDayPress?: (iso: string) => void;
}

/**
 * 7-day stacked bar chart.
 *
 * Each bar has two stacked segments:
 *   - Bottom: categorized spend (brand color)
 *   - Top:    uncategorized spend (neutral gray)
 *
 * Built on `react-native-gifted-charts` (SVG-based, Expo Go compatible).
 */
export function BarWeek({
  data,
  height = 240,
  formatValue = String,
  onDayPress,
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

  const stackData = data.map((d) => ({
    label: d.day,
    // iso is a custom field read back in onPress to identify the tapped date
    iso: d.iso,
    stacks: [
      { value: d.categorized,   color: COLORS.brand[500] },
      { value: d.uncategorized, color: COLORS.gray[400] },
    ],
  }));

  const rawMax = Math.max(...data.map((d) => d.amount), 1);
  const niceMax = niceRoundUp(rawMax);

  return (
    <View style={styles.container}>
      <BarChart
        stackData={stackData}
        height={height - 40}
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
        onPress={(item: any) => {
          if (onDayPress && item?.iso) onDayPress(item.iso);
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
});
