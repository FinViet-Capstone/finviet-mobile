import React, { ReactNode, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, SHADOW } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export interface ScreenHeaderProps {
  title: string;
  /** Show the back chevron — caller must supply `onBack` to handle navigation */
  showBack?: boolean;
  onBack?: () => void;
  /** Anything you want rendered on the right edge (icon button, text link, etc.) */
  rightAction?: ReactNode;
}

export function ScreenHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
}: ScreenHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Left slot */}
      <View style={styles.side}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcon name="chevron_left" size={24} color={colors.gray[800]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right slot */}
      <View style={[styles.side, styles.sideRight]}>
        {rightAction ?? null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: SPACING[4],
      backgroundColor: colors.white,
      ...SHADOW.sm,
    },
    side: {
      width: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    sideRight: {
      alignItems: 'flex-end',
    },
    backButton: {
      padding: SPACING[1],
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.gray[900],
    },
  });
}
