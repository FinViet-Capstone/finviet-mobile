import React, { useEffect, useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

const BASE_BOTTOM = 24;

export interface ChatbotFABProps {
  readonly extraBottomOffset?: number;
  readonly onOpen: () => void;
}

export function ChatbotFAB({ extraBottomOffset = 0, onOpen }: ChatbotFABProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bottomAnim = useSharedValue(BASE_BOTTOM + extraBottomOffset);

  useEffect(() => {
    bottomAnim.value = withTiming(BASE_BOTTOM + extraBottomOffset, { duration: 220 });
  }, [extraBottomOffset]);

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: bottomAnim.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        style={styles.fab}
        onPress={onOpen}
        activeOpacity={0.85}
      >
        <MaterialIcon name="smart_toy" size={26} color={colors.onPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      right: 20,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  });
}
