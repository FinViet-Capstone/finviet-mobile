import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVNDCompact } from '@/utils/formatters';
import {
  buildCalendarWeeks,
  type DayCell,
} from '@/hooks/useMonthlyTransactions';

const VI_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export interface TransactionCalendarProps {
  dayCells: DayCell[];
  selectedISO: string;
  /** Leading blank cells before day 1 (Monday-first week). */
  leadingBlanks: number;
  onDayPress: (cell: DayCell) => void;
  /** Full month grid when true; single active week when false. */
  expanded: boolean;
  onToggleExpanded: () => void;
}

/** Month calendar grid: per-day income/expense traces, uncategorized dot, today/selected. */
export function TransactionCalendar({
  dayCells,
  selectedISO,
  leadingBlanks,
  onDayPress,
  expanded,
  onToggleExpanded,
}: TransactionCalendarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const weeks = buildCalendarWeeks(dayCells, leadingBlanks);

  const activeIso =
    selectedISO || dayCells.find((c) => c.isToday)?.iso || dayCells[0]?.iso;
  const activeWeekIndex = Math.max(
    0,
    weeks.findIndex((week) =>
      week.some((gridCell) => gridCell.current?.iso === activeIso),
    ),
  );
  const visibleWeeks = expanded ? weeks : weeks.slice(activeWeekIndex, activeWeekIndex + 1);

  return (
    <View style={styles.calendarCard}>
      {/* Day-of-week header */}
      <View style={styles.dowRow}>
        {VI_DAYS.map((d) => (
          <Text key={d} style={[styles.dowLabel, d === 'CN' && { color: colors.error }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View>
        {visibleWeeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((gridCell) => {
              const cell = gridCell.current;
              if (!cell) {
                return (
                  <View key={gridCell.key} style={styles.cell}>
                    <View style={styles.dayCircle}>
                      <Text style={[styles.dayNumber, styles.adjacentDay]}>
                        {gridCell.day}
                      </Text>
                    </View>
                  </View>
                );
              }

              const isSelected = cell.iso === selectedISO;
              return (
                <TouchableOpacity
                  key={gridCell.key}
                  style={styles.cell}
                  onPress={() => onDayPress(cell)}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    cell.isToday && !isSelected && styles.dayCircleToday,
                  ]}>
                    <Text style={[
                      styles.dayNumber,
                      isSelected && { color: colors.onPrimary, fontWeight: FONT_WEIGHT.bold },
                      cell.isToday && !isSelected && { color: colors.primary },
                    ]}>
                      {cell.day}
                    </Text>
                    {cell.hasUncategorized && <View style={styles.uncatDot} />}
                  </View>
                  {cell.hasActivity && (
                    <View style={styles.dayAmounts}>
                      {cell.income > 0 && (
                        <Text style={[styles.dayAmt, { color: colors.tertiary }]} numberOfLines={1}>
                          +{formatVNDCompact(cell.income)}
                        </Text>
                      )}
                      {cell.expense > 0 && (
                        <Text style={[styles.dayAmt, { color: colors.error }]} numberOfLines={1}>
                          −{formatVNDCompact(cell.expense)}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.toggleHandle}
        onPress={onToggleExpanded}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Thu gọn lịch' : 'Mở rộng lịch'}
      >
        <MaterialIcon
          name={expanded ? 'expand_less' : 'expand_more'}
          size={20}
          color={colors.onSurfaceVariant}
        />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    calendarCard: {
      backgroundColor: colors.surfaceContainerLow,
      paddingHorizontal: SPACING[3],
      paddingBottom: SPACING[2],
      marginBottom: SPACING[1],
    },
    dowRow: {
      flexDirection: 'row',
      paddingVertical: SPACING[1],
    },
    dowLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurfaceVariant,
    },
    weekRow: {
      flexDirection: 'row',
    },
    cell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 2,
    },
    dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    dayCircleSelected: {
      backgroundColor: colors.primaryContainer,
    },
    dayCircleToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayNumber: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurface,
    },
    adjacentDay: {
      color: colors.onSurfaceVariant,
      opacity: 0.4,
    },
    uncatDot: {
      position: 'absolute',
      top: 1,
      right: 1,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.secondary,
    },
    dayAmounts: {
      alignItems: 'center',
      minHeight: 20,
      marginTop: 2,
    },
    dayAmt: {
      fontSize: 8,
      fontWeight: FONT_WEIGHT.medium,
      lineHeight: 10,
      textAlign: 'center',
    },
    toggleHandle: {
      alignItems: 'center',
      paddingTop: SPACING[1],
    },
  });
}
