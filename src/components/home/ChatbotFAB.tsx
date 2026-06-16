import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, BORDER_RADIUS } from '@/constants/theme';

const BASE_BOTTOM = 24;

export interface ChatbotFABProps {
  readonly extraBottomOffset?: number;
  readonly onOpen: () => void;
}

export function ChatbotFAB({ extraBottomOffset = 0, onOpen }: ChatbotFABProps) {
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
        <MaterialIcon name="smart_toy" size={26} color={COLORS.onPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
});
