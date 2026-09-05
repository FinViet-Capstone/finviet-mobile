/**
 * CategoryDragOverlay — the floating chip + 3 fixed drop zones shown while a
 * category is being dragged (see app/settings/categories.tsx).
 *
 * Deliberately uses fixed, screen-anchored drop zones (computed once from
 * Dimensions.get('window')) rather than measuring the actual bucket cards'
 * current on-screen position. Those cards live inside a ScrollView with
 * variable height (expand/collapse, variable category counts), and tracking
 * their live position would need runtime `measure()` calls this environment
 * has no way to visually verify. Fixed zones need no measurement at all —
 * the hit-test is pure arithmetic against constants.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import type { BucketId } from './CategoryBucketCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ZONE_HEIGHT = 72;
export const DROP_ZONES_HEIGHT = ZONE_HEIGHT * 3;
export const DROP_ZONES_TOP = SCREEN_HEIGHT - DROP_ZONES_HEIGHT;

const ZONE_IDS: BucketId[] = ['needs', 'wants', 'savings'];

type Zone = { id: BucketId; label: string; icon: string; color: string; containerColor: string };

function getZoneOrder(colors: ThemeColors): Zone[] {
  return [
    { id: 'needs', label: 'Thiết yếu', icon: 'home', color: colors.primary, containerColor: colors.primaryContainer },
    { id: 'wants', label: 'Mong muốn', icon: 'shopping_bag', color: colors.secondary, containerColor: colors.secondaryContainer },
    { id: 'savings', label: 'Tiết kiệm', icon: 'savings', color: colors.tertiary, containerColor: colors.tertiaryContainer },
  ];
}

/** Which drop zone (if any) a screen-absolute Y coordinate falls into. Exported for the parent's onEnd handler. */
export function zoneForAbsoluteY(absoluteY: number): BucketId | null {
  if (absoluteY < DROP_ZONES_TOP) return null;
  const index = Math.floor((absoluteY - DROP_ZONES_TOP) / ZONE_HEIGHT);
  return ZONE_IDS[Math.min(Math.max(index, 0), ZONE_IDS.length - 1)] ?? null;
}

function ZoneView({ zone, index, dragY, colors }: { zone: Zone; index: number; dragY: SharedValue<number>; colors: ThemeColors }) {
  const hoverBg = withAlpha(zone.containerColor, 0.8);
  const idleBg = withAlpha(colors.surfaceContainerHigh, 0.9);
  const idleBorder = withAlpha(colors.outlineVariant, 0.5);
  const animStyle = useAnimatedStyle(() => {
    const zoneTop = DROP_ZONES_TOP + index * ZONE_HEIGHT;
    const zoneBottom = zoneTop + ZONE_HEIGHT;
    const isHover = dragY.value >= zoneTop && dragY.value < zoneBottom;
    return {
      backgroundColor: isHover ? hoverBg : idleBg,
      borderColor: isHover ? zone.color : idleBorder,
    };
  });
  return (
    <Animated.View style={[styles.zone, animStyle]}>
      <MaterialIcon name={zone.icon} size={20} color={zone.color} />
      <Text style={[styles.zoneLabel, { color: zone.color }]}>{zone.label}</Text>
    </Animated.View>
  );
}

interface Props {
  active: boolean;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  chipLabel: string | null;
  chipCategoryId: string | null;
}

export function CategoryDragOverlay({ active, dragX, dragY, chipLabel, chipCategoryId }: Props) {
  const colors = useThemeColors();
  const zoneOrder = useMemo(() => getZoneOrder(colors), [colors]);
  const chipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value - 90 },
      { translateY: dragY.value - 24 },
    ],
  }));

  if (!active) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.zones}>
        {zoneOrder.map((zone, index) => (
          <ZoneView key={zone.id} zone={zone} index={index} dragY={dragY} colors={colors} />
        ))}
      </View>

      <Animated.View style={[styles.chip, chipStyle, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outline, shadowColor: colors.black }]}>
        {chipCategoryId && <CategoryIcon categoryId={chipCategoryId} size={16} color={colors.onSurface} />}
        {chipLabel && <Text style={[styles.chipText, { color: colors.onSurface }]} numberOfLines={1}>{chipLabel}</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    elevation: 999,
  },
  zones: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: DROP_ZONES_HEIGHT,
  },
  zone: {
    height: ZONE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    borderTopWidth: 1,
  },
  zoneLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  chip: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderWidth: 1,
    maxWidth: 180,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    flexShrink: 1,
  },
});
