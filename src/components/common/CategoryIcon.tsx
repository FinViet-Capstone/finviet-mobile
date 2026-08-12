import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SvgUri } from 'react-native-svg';
import { MaterialIcon } from './MaterialIcon';
import { useCategoryVisual } from '@/hooks/useCategoryVisual';

export interface CategoryIconProps {
  readonly categoryId: string;
  readonly size?: number;
  /** Overrides the resolved category color (Material/svg-remote paths only). */
  readonly color?: string;
}

/**
 * Renders a category's icon regardless of where it comes from: the system
 * catalog's Material Symbol mapping, a future backend-managed SVG catalog
 * (see lib/categoryVisual.ts — not populated yet), or a user-picked local
 * svg/png file for a customer-created category.
 */
export function CategoryIcon({ categoryId, size = 20, color }: CategoryIconProps) {
  const visual = useCategoryVisual(categoryId);
  const tint = color ?? visual.color;

  if (visual.iconKind === 'local-file' || visual.iconKind === 'svg-remote') {
    if (visual.iconRef.toLowerCase().endsWith('.svg')) {
      return <SvgUri uri={visual.iconRef} width={size} height={size} />;
    }
    return (
      <Image
        source={{ uri: visual.iconRef }}
        style={[styles.image, { width: size, height: size }]}
        contentFit="contain"
        transition={150}
      />
    );
  }

  return <MaterialIcon name={visual.iconRef} size={size} color={tint} />;
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 4,
  },
});
