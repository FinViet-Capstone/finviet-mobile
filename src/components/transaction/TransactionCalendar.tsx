import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { formatVNDCompact } from '@/utils/formatters';
import type { DayCell } from '@/hooks/useMonthlyTransactions';

const VI_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export interface TransactionCalendarProps {
  dayCells: DayCell[];
  selectedISO: string;
  /** Leading blank cells before day 1 (Monday-first week). */
  leadingBlanks: number;
  onDayPress: (cell: DayCell) => void;
}

/** Month calendar grid: per-day net amount, uncategorized dot, today/selected. */
export function TransactionCalendar({
  dayCells,
  selectedISO,
  leadingBlanks,
  onDayPress,
}: TransactionCalendarProps) {
  return (
    <View style={styles.calendarCard}>
      {/* Day-of-week header */}
      <View style={styles.dowRow}>
        {VI_DAYS.map((d) => (
          <Text key={d} style={[styles.dowLabel, d === 'CN' && { color: COLORS.error }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`b${i}`} style={styles.cell} />
        ))}
        {dayCells.map((cell) => {
          const isSelected = cell.iso === selectedISO;
          const amtColor = cell.net >= 0 ? COLORS.tertiary : COLORS.error;
          return (
            <TouchableOpacity
              key={cell.iso}
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
                  isSelected && { color: COLORS.onPrimary, fontWeight: FONT_WEIGHT.bold },
                  cell.isToday && !isSelected && { color: COLORS.primary },
                ]}>
                  {cell.day}
                </Text>
                {cell.hasUncategorized && <View style={styles.uncatDot} />}
              </View>
              {cell.hasActivity && (
                <Text style={[styles.dayAmt, { color: amtColor }]} numberOfLines={1}>
                  {formatVNDCompact(Math.abs(cell.net))}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[2],
    marginBottom: SPACING[1],
  },
  dowRow: {
    flexDirection: 'row',
    paddingVertical: SPACING[1],
  },
  dowLabel: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285714%',
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
    backgroundColor: COLORS.primaryContainer,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
  },
  uncatDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
  },
  dayAmt: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: 2,
    textAlign: 'center',
  },
});
