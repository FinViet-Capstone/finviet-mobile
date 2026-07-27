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

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import type { BucketId } from './CategoryBucketCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ZONE_HEIGHT = 72;
export const DROP_ZONES_HEIGHT = ZONE_HEIGHT * 3;
export const DROP_ZONES_TOP = SCREEN_HEIGHT - DROP_ZONES_HEIGHT;

const ZONE_ORDER: { id: BucketId; label: string; icon: string; color: string; containerColor: string }[] = [
  { id: 'needs', label: 'Thiết yếu', icon: 'home', color: COLORS.primary, containerColor: COLORS.primaryContainer },
  { id: 'wants', label: 'Mong muốn', icon: 'shopping_bag', color: COLORS.secondary, containerColor: COLORS.secondaryContainer },
  { id: 'savings', label: 'Tiết kiệm', icon: 'savings', color: COLORS.tertiary, containerColor: COLORS.tertiaryContainer },
];

/** Which drop zone (if any) a screen-absolute Y coordinate falls into. Exported for the parent's onEnd handler. */
export function zoneForAbsoluteY(absoluteY: number): BucketId | null {
  if (absoluteY < DROP_ZONES_TOP) return null;
  const index = Math.floor((absoluteY - DROP_ZONES_TOP) / ZONE_HEIGHT);
  return ZONE_ORDER[Math.min(Math.max(index, 0), ZONE_ORDER.length - 1)]?.id ?? null;
}

function Zone({ zone, index, dragY }: { zone: (typeof ZONE_ORDER)[number]; index: number; dragY: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => {
    const zoneTop = DROP_ZONES_TOP + index * ZONE_HEIGHT;
    const zoneBottom = zoneTop + ZONE_HEIGHT;
    const isHover = dragY.value >= zoneTop && dragY.value < zoneBottom;
    return {
      backgroundColor: isHover ? `${zone.containerColor}CC` : `${COLORS.surfaceContainerHigh}E6`,
      borderColor: isHover ? zone.color : `${COLORS.outlineVariant}80`,
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
        {ZONE_ORDER.map((zone, index) => (
          <Zone key={zone.id} zone={zone} index={index} dragY={dragY} />
        ))}
      </View>

      <Animated.View style={[styles.chip, chipStyle]}>
        {chipCategoryId && <CategoryIcon categoryId={chipCategoryId} size={16} color={COLORS.onSurface} />}
        {chipLabel && <Text style={styles.chipText} numberOfLines={1}>{chipLabel}</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.outline,
    maxWidth: 180,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
});
