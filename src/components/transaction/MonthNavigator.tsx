import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';

const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
] as const;

export interface MonthNavigatorProps {
  /** 0-based month index (Date convention). */
  monthIdx: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  /** Jump back to the current calendar month. */
  onJumpCurrent?: () => void;
}

export function MonthNavigator({
  monthIdx,
  year,
  onPrev,
  onNext,
  onJumpCurrent,
}: MonthNavigatorProps) {
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && monthIdx === today.getMonth();
  return (
    <View style={styles.monthNav}>
      <TouchableOpacity onPress={onPrev} activeOpacity={0.75} style={styles.navBtn}>
        <MaterialIcon name="chevron_left" size={22} color={COLORS.onSurface} />
      </TouchableOpacity>
      <Text style={styles.monthLabel}>{VI_MONTHS[monthIdx]}, {year}</Text>
      <View style={styles.navRight}>
        <TouchableOpacity onPress={onNext} activeOpacity={0.75} style={styles.navBtn}>
          <MaterialIcon name="chevron_right" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        {onJumpCurrent && !isCurrentMonth ? (
          <TouchableOpacity
            onPress={onJumpCurrent}
            activeOpacity={0.75}
            style={styles.navBtn}
            accessibilityLabel="Về tháng hiện tại"
          >
            <MaterialIcon
              name="keyboard_double_arrow_right"
              size={22}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    backgroundColor: COLORS.surfaceContainerLow,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  monthLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },
});
