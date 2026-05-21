import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';

export interface CategoryBadgeProps {
  /** Accepts string | null — null renders the same gray "Khác" fallback as an unknown ID */
  categoryId: string | null;
}

/**
 * Pill-shaped badge showing the Vietnamese category name with the category's
 * brand color as the background tint.
 *
 * The category icon slot uses a small colored circle (placeholder) because the
 * icon set has not yet been decided — see categories.ts comment.
 */
export function CategoryBadge({ categoryId }: CategoryBadgeProps) {
  const category = categoryId ? getCategoryById(categoryId) : undefined;

  if (!category) {
    return (
      <View style={[styles.pill, { backgroundColor: COLORS.gray[200] }]}>
        <Text style={[styles.label, { color: COLORS.gray[600] }]}>{'Khác'}</Text>
      </View>
    );
  }

  // Produce a light tint from the category's hex color by rendering it at ~15% opacity
  const backgroundColor = category.color + '26'; // hex alpha 26 ≈ 15%

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      {/* Color dot — icon placeholder until icon set is decided */}
      <View style={[styles.dot, { backgroundColor: category.color }]} />
      <Text style={[styles.label, { color: category.color }]} numberOfLines={1}>
        {category.nameVi}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    gap: SPACING[1],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
