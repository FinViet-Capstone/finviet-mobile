import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useTransactions } from '@/hooks';
import { BarWeek, type WeekBarDatum } from '@/components/charts/BarWeek';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export interface WeeklySpendingSwiperProps {
  /** Number of past weeks to make available (in addition to the current week). Defaults to 12. */
  weeksBack?: number;
  /** Vietnamese weekday labels in Mon-first order. */
  dayLabels: readonly string[];
  /** Format VND amounts for tooltip + axis. */
  formatValue: (value: number) => string;
  /** Chart height in pixels. */
  chartHeight?: number;
}

/**
 * Horizontal pager for the 7-day spending bar chart. Each page renders a single
 * Monday→Sunday week. The user starts on the current week (last page) and can
 * swipe right-to-left to step backwards through history.
 *
 * Each visible page mounts its own `useTransactions` query, scoped to the
 * week's date range — TanStack caches per query key so revisited weeks load
 * instantly.
 */
export function WeeklySpendingSwiper({
  weeksBack = 12,
  dayLabels,
  formatValue,
  chartHeight = 260,
}: WeeklySpendingSwiperProps) {
  const { width } = useWindowDimensions();
  // PAGE_PAD lines up with the report screen's section padding so each page
  // visually fills the same area as the static chart card it replaces.
  const PAGE_PAD = SPACING[4];
  const pageWidth = width - PAGE_PAD * 2;

  // Build the week list — Monday-anchored ISO start dates, oldest first so the
  // newest week sits at the rightmost index (the FlatList initialScrollIndex).
  const weeks = useMemo(() => buildMondayAnchoredWeeks(weeksBack), [weeksBack]);
  const lastIndex = weeks.length - 1;
  const [activeIndex, setActiveIndex] = useState(lastIndex);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') setActiveIndex(first.index);
    },
  ).current;
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 60 }).current;

  const listRef = React.useRef<FlatList<WeekRange>>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          disabled={activeIndex === 0}
          onPress={() =>
            listRef.current?.scrollToIndex({
              index: Math.max(0, activeIndex - 1),
              animated: true,
            })
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft
            size={20}
            color={activeIndex === 0 ? COLORS.gray[300] : COLORS.gray[700]}
          />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{formatWeekRange(weeks[activeIndex])}</Text>
        <TouchableOpacity
          disabled={activeIndex === lastIndex}
          onPress={() =>
            listRef.current?.scrollToIndex({
              index: Math.min(lastIndex, activeIndex + 1),
              animated: true,
            })
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight
            size={20}
            color={activeIndex === lastIndex ? COLORS.gray[300] : COLORS.gray[700]}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={weeks}
        keyExtractor={(w) => w.startIso}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={lastIndex}
        getItemLayout={(_, i) => ({
          length: pageWidth,
          offset: pageWidth * i,
          index: i,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={{ width: pageWidth }}>
            <WeekPage
              range={item}
              dayLabels={dayLabels}
              formatValue={formatValue}
              chartHeight={chartHeight}
            />
          </View>
        )}
      />
    </View>
  );
}

interface WeekRange {
  startIso: string;
  endIso: string;
  start: Date;
  end: Date;
}

function buildMondayAnchoredWeeks(weeksBack: number): WeekRange[] {
  const today = new Date();
  // Monday of the current week: shift back (today.getDay() + 6) % 7 days
  const mondayOffset = (today.getDay() + 6) % 7;
  const thisMonday = new Date(today);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(today.getDate() - mondayOffset);

  const result: WeekRange[] = [];
  for (let i = weeksBack; i >= 0; i--) {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    result.push({
      start,
      end,
      startIso: ymd(start),
      endIso: ymd(end),
    });
  }
  return result;
}

function ymd(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? `0${m}` : m}-${day < 10 ? `0${day}` : day}`;
}

function formatWeekRange(w: WeekRange): string {
  const startD = w.start.getDate();
  const startM = w.start.getMonth() + 1;
  const endD = w.end.getDate();
  const endM = w.end.getMonth() + 1;
  return `${startD}/${startM} – ${endD}/${endM}`;
}

interface WeekPageProps {
  range: WeekRange;
  dayLabels: readonly string[];
  formatValue: (value: number) => string;
  chartHeight: number;
}

function WeekPage({ range, dayLabels, formatValue, chartHeight }: WeekPageProps) {
  const { data: txs } = useTransactions({
    startDate: range.startIso,
    endDate: range.endIso,
  });

  const data: WeekBarDatum[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(range.start);
      d.setDate(range.start.getDate() + i);
      const iso = ymd(d);
      const dayTx = (txs ?? []).filter(
        (t) => t.transactionDate === iso && t.type === 'expense',
      );
      const categorized = dayTx
        .filter((t) => t.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const uncategorized = dayTx
        .filter((t) => !t.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      // Monday-first labels: dayLabels indexes 0=Mon … 6=Sun
      return {
        day: dayLabels[i],
        amount: categorized + uncategorized,
        categorized,
        uncategorized,
      };
    });
  }, [txs, range.startIso, dayLabels]);

  return <BarWeek data={data} formatValue={formatValue} height={chartHeight} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[2],
  },
  headerLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[700],
  },
});
