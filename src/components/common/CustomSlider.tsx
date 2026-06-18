import React, { useCallback } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: ViewStyle;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 20;
const THUMB_SPRING = { damping: 15, stiffness: 300, mass: 0.5 };
const DEFAULT_MIN_COLOR = '#d0bcff';
const DEFAULT_MAX_COLOR = '#37333d';
const DEFAULT_THUMB_COLOR = '#d0bcff';

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
  minimumTrackTintColor = DEFAULT_MIN_COLOR,
  maximumTrackTintColor = DEFAULT_MAX_COLOR,
  thumbTintColor = DEFAULT_THUMB_COLOR,
  style,
}: CustomSliderProps) {
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

  const pan = Gesture.Pan()
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
    });

  // ── Tap on track to jump ──────────────────────────────────────────────────

  const tap = Gesture.Tap().onEnd((e) => {
    const newX = clamp(e.x, 0, trackWidth.value);
    const pct = trackWidth.value > 0 ? newX / trackWidth.value : 0;
    let rawValue = minimumValue + pct * range;
    rawValue = snap(rawValue, step, minimumValue);
    rawValue = clamp(rawValue, minimumValue, maximumValue);

    const snappedPct = (rawValue - minimumValue) / range;
    thumbX.value = withSpring(snappedPct * trackWidth.value, THUMB_SPRING);
    runOnJS(emitValue)(rawValue);
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
      <View style={[styles.container, style]} onLayout={handleLayout}>
        {/* Track background (unfilled) */}
        <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
          {/* Track filled */}
          <Animated.View
            style={[
              styles.trackFilled,
              { backgroundColor: minimumTrackTintColor },
              filledStyle,
            ]}
          />
        </View>

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbTintColor,
              shadowColor: thumbTintColor,
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
