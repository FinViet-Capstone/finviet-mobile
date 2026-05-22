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
  /** Format VND amounts for axis labels. */
  formatValue: (value: number) => string;
  /** Chart height in pixels. */
  chartHeight?: number;
  /** Called with the ISO date when the user taps a bar. */
  onDayPress?: (iso: string) => void;
}

/**
 * Horizontal pager for the 7-day spending bar chart. Each page renders a single
 * Monday→Sunday week. The user starts on the current week (last page) and can
 * swipe right-to-left to step backwards through history.
 *
 * Uses snapToInterval + decelerationRate="fast" (instead of pagingEnabled) so
 * that pages whose width is smaller than the screen still snap cleanly on any
 * swipe — no half-swipe drift.
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
  onDayPress,
}: WeeklySpendingSwiperProps) {
  const { width } = useWindowDimensions();
  // PAGE_PAD lines up with the surrounding card padding so each page fills the
  // card without overflowing the screen edge.
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
  // 50 % threshold: the active page is whichever one occupies more than half
  // the visible area — gives crisp index tracking without flickering.
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 50 }).current;

  const listRef = React.useRef<FlatList<WeekRange>>(null);

  const goTo = (index: number) =>
    listRef.current?.scrollToIndex({ index, animated: true });

  return (
    <View style={styles.container}>
      {/* Week navigator header */}
      <View style={styles.header}>
        <TouchableOpacity
          disabled={activeIndex === 0}
          onPress={() => goTo(Math.max(0, activeIndex - 1))}
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
          onPress={() => goTo(Math.min(lastIndex, activeIndex + 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight
            size={20}
            color={activeIndex === lastIndex ? COLORS.gray[300] : COLORS.gray[700]}
          />
        </TouchableOpacity>
      </View>

      {/*
        snapToInterval instead of pagingEnabled: guarantees a full-page snap
        regardless of swipe velocity or the page width being narrower than the
        device screen.
      */}
      <FlatList
        ref={listRef}
        data={weeks}
        keyExtractor={(w) => w.startIso}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageWidth}
        snapToAlignment="start"
        decelerationRate="fast"
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
              onDayPress={onDayPress}
            />
          </View>
        )}
      />
    </View>
  );
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface WeekRange {
  startIso: string;
  endIso: string;
  start: Date;
  end: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMondayAnchoredWeeks(weeksBack: number): WeekRange[] {
  const today = new Date();
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
    result.push({ start, end, startIso: ymd(start), endIso: ymd(end) });
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

// ─── WeekPage ────────────────────────────────────────────────────────────────

interface WeekPageProps {
  range: WeekRange;
  dayLabels: readonly string[];
  formatValue: (value: number) => string;
  chartHeight: number;
  onDayPress?: (iso: string) => void;
}

function WeekPage({ range, dayLabels, formatValue, chartHeight, onDayPress }: WeekPageProps) {
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
      return {
        day: dayLabels[i],
        iso,
        amount: categorized + uncategorized,
        categorized,
        uncategorized,
      };
    });
  }, [txs, range.startIso, dayLabels]);

  return (
    <BarWeek
      data={data}
      formatValue={formatValue}
      height={chartHeight}
      onDayPress={onDayPress}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
