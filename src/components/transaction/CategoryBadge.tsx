import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { useCategoryCatalog } from '@/hooks/useCategoryCatalog';

export interface CategoryBadgeProps {
  /** Accepts string | null — null renders the same gray "Khác" fallback as an unknown ID */
  categoryId: string | null;
}

export function CategoryBadge({ categoryId }: CategoryBadgeProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Resolved against the customer's real catalog, so a custom label shows its
  // own name instead of the unknown-id "Khác" fallback.
  const category = useCategoryCatalog().get(categoryId);

  if (!category) {
    return (
      <View style={[styles.pill, { backgroundColor: colors.gray[200] }]}>
        <Text style={[styles.label, { color: colors.gray[600] }]}>{'Khác'}</Text>
      </View>
    );
  }

  const backgroundColor = withAlpha(category.color, 0.15); // ~15% opacity tint

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <MaterialIcon name={category.iconName} size={12} color={category.color} />
      <Text style={[styles.label, { color: category.color }]} numberOfLines={1}>
        {category.nameVi}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
}
