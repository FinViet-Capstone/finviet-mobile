import React, { useCallback } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useThemeColors } from '@/providers/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  onValueChangeEnd?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 20;
const THUMB_SPRING = { damping: 15, stiffness: 300, mass: 0.5 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

function snap(val: number, step: number, min: number): number {
  'worklet';
  if (step <= 0) return val;
  return Math.round((val - min) / step) * step + min;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for @react-native-community/slider.
 *
 * Built with Reanimated + Gesture Handler (both bundled in Expo Go SDK 54).
 * Accepts the same core props as the community slider.
 */
export function CustomSlider({
  minimumValue,
  maximumValue,
  step = 0,
  value,
  onValueChange,
  onValueChangeEnd,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  disabled = false,
  style,
}: CustomSliderProps) {
  // Defaults resolve from the active theme rather than a fixed dark literal —
  // callers may still override any of the three explicitly.
  const colors = useThemeColors();
  const resolvedMinColor = minimumTrackTintColor ?? colors.primary;
  const resolvedMaxColor = maximumTrackTintColor ?? colors.surfaceContainerHighest;
  const resolvedThumbColor = thumbTintColor ?? colors.primary;

  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const startX = useSharedValue(0);
  const range = maximumValue - minimumValue || 1;

  // ── Layout ────────────────────────────────────────────────────────────────

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      trackWidth.value = w;
      // Position thumb to match the current value.
      const pct = clamp((value - minimumValue) / range, 0, 1);
      thumbX.value = pct * w;
    },
    [value, minimumValue, range],
  );

  // ── Value → position sync (prop-driven updates) ───────────────────────────

  // When `value` prop changes externally (e.g. reset button), update thumb.
  React.useEffect(() => {
    if (trackWidth.value > 0) {
      const pct = clamp((value - minimumValue) / range, 0, 1);
      thumbX.value = withSpring(pct * trackWidth.value, THUMB_SPRING);
    }
  }, [value, minimumValue, range]);

  // ── Gesture ───────────────────────────────────────────────────────────────

  const emitValue = useCallback(
    (v: number) => {
      onValueChange(v);
    },
    [onValueChange],
  );

  const emitValueEnd = useCallback(
    (v: number) => {
      onValueChangeEnd?.(v);
    },
    [onValueChangeEnd],
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      startX.value = thumbX.value;
    })
    .onUpdate((e) => {
      const newX = clamp(startX.value + e.translationX, 0, trackWidth.value);
      thumbX.value = newX;

      // Convert pixel position → value.
      const pct = trackWidth.value > 0 ? newX / trackWidth.value : 0;
      let rawValue = minimumValue + pct * range;
      rawValue = snap(rawValue, step, minimumValue);
      rawValue = clamp(rawValue, minimumValue, maximumValue);
      runOnJS(emitValue)(rawValue);
    })
    .onEnd(() => {
      // Snap thumb to the nearest step position.
      const pct = trackWidth.value > 0 ? thumbX.value / trackWidth.value : 0;
      let snappedValue = minimumValue + pct * range;
      snappedValue = snap(snappedValue, step, minimumValue);
      snappedValue = clamp(snappedValue, minimumValue, maximumValue);

      const snappedPct = (snappedValue - minimumValue) / range;
      thumbX.value = withSpring(snappedPct * trackWidth.value, THUMB_SPRING);
      runOnJS(emitValueEnd)(snappedValue);
    });

  // ── Tap on track to jump ──────────────────────────────────────────────────

  const tap = Gesture.Tap().enabled(!disabled).onEnd((e) => {
    const newX = clamp(e.x, 0, trackWidth.value);
    const pct = trackWidth.value > 0 ? newX / trackWidth.value : 0;
    let rawValue = minimumValue + pct * range;
    rawValue = snap(rawValue, step, minimumValue);
    rawValue = clamp(rawValue, minimumValue, maximumValue);

    const snappedPct = (rawValue - minimumValue) / range;
    thumbX.value = withSpring(snappedPct * trackWidth.value, THUMB_SPRING);
    runOnJS(emitValue)(rawValue);
    runOnJS(emitValueEnd)(rawValue);
  });

  const composed = Gesture.Race(pan, tap);

  // ── Animated styles ───────────────────────────────────────────────────────

  const filledStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.container, style, disabled && styles.disabledContainer]}
        onLayout={handleLayout}
      >
        {/* Track background (unfilled) */}
        <View style={[styles.track, { backgroundColor: resolvedMaxColor }]}>
          {/* Track filled */}
          <Animated.View
            style={[
              styles.trackFilled,
              { backgroundColor: resolvedMinColor },
              filledStyle,
            ]}
          />
        </View>

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: resolvedThumbColor,
              shadowColor: resolvedThumbColor,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  disabledContainer: {
    opacity: 0.45,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  trackFilled: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (40 - THUMB_SIZE) / 2,
    left: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
