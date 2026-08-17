import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export interface EmptyStateProps {
  /** Material Symbols icon name. Defaults to 'inbox'. */
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
}: EmptyStateProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <MaterialIcon name={icon} size={48} color={colors.gray[400]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING[8],
      paddingVertical: SPACING[10],
    },
    iconWrapper: {
      marginBottom: SPACING[4],
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.gray[700],
      textAlign: 'center',
      marginBottom: SPACING[2],
    },
    subtitle: {
      fontSize: FONT_SIZE.sm,
      color: colors.gray[500],
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
