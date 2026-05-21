import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, SHADOW } from '@/constants/theme';

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
            <Ionicons name="chevron-back" size={24} color={COLORS.gray[800]} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: SPACING[4],
    backgroundColor: COLORS.white,
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
    color: COLORS.gray[900],
  },
});
