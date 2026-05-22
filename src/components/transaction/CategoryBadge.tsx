import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';

export interface CategoryBadgeProps {
  /** Accepts string | null — null renders the same gray "Khác" fallback as an unknown ID */
  categoryId: string | null;
}

export function CategoryBadge({ categoryId }: CategoryBadgeProps) {
  const category = categoryId ? getCategoryById(categoryId) : undefined;

  if (!category) {
    return (
      <View style={[styles.pill, { backgroundColor: COLORS.gray[200] }]}>
        <Text style={[styles.label, { color: COLORS.gray[600] }]}>{'Khác'}</Text>
      </View>
    );
  }

  const Icon = getCategoryIcon(category.icon);
  const backgroundColor = category.color + '26'; // ~15% opacity tint

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Icon size={12} color={category.color} />
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
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
