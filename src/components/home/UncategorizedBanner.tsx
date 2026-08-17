import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export interface UncategorizedBannerProps {
  readonly count: number;
}

// Renders the pill only. Caller is responsible for absolute positioning.
export function UncategorizedBanner({ count }: UncategorizedBannerProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (count === 0) return null;

  return (
    <View style={styles.bubble}>
      <View style={styles.iconWrapper}>
        <MaterialIcon name="category" size={18} color={colors.secondary} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {count} giao dịch chưa phân loại
      </Text>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => router.push('/(tabs)/transactions')}
        activeOpacity={0.8}
      >
        <Text style={styles.actionText}>Phân loại</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[3],
      backgroundColor: withAlpha(colors.secondaryContainer, 0.95),
      borderRadius: BORDER_RADIUS.full,
      paddingVertical: SPACING[2] + 2,
      paddingHorizontal: SPACING[4],
      borderWidth: 1,
      borderColor: withAlpha(colors.secondary, 0.4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    iconWrapper: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: withAlpha(colors.secondary, 0.2),
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSecondaryContainer,
    },
    actionBtn: {
      backgroundColor: colors.onSecondaryContainer,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1] + 2,
    },
    actionText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.secondaryContainer,
    },
  });
}
