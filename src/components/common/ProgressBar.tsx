import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS } from '@/constants/theme';

export interface ProgressBarProps {
  /**
   * Fill ratio, clamped to [0, 1].
   * 0 = empty bar, 1 = full bar.
   */
  value: number;
  /** Override the fill color — defaults to brand[500] */
  color?: string;
  /** Bar height in pixels — defaults to 8 */
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  color = COLORS.brand[500],
  height = 8,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const animatedValue = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(1, Math.max(0, value)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const widthPercent = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthPercent,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
