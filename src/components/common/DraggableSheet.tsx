import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

const DISMISS_THRESHOLD = 120;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DraggableSheet({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  // Cap the sheet so tall content scrolls inside it instead of growing past
  // the top of the screen (which left the title off-screen and
  // un-scrollable). Read via the hook, not `Dimensions.get()` at module
  // scope, since the latter can resolve before the native window is
  // measured and then stays wrong for the app's whole lifetime.
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = Math.round(windowHeight * 0.85);

  // Keep the subtree mounted while the exit animation runs — unmounting on
  // `visible === false` alone would cut the slide-down short and pop the
  // sheet out instead of animating it away.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (!visible) return;
    // Start fully offscreen so the entrance springs up instead of the sheet
    // appearing at its final position in the same frame it mounts (which
    // read as a pop/freeze when opened right as a native Alert dismisses).
    translateY.value = windowHeight;
    backdropOpacity.value = 0;
    setMounted(true);
  }, [visible, windowHeight]);

  useEffect(() => {
    if (!visible || !mounted) return;
    translateY.value = withSpring(0, SPRING_CONFIG);
    backdropOpacity.value = withTiming(1, { duration: 200 });
  }, [visible, mounted]);

  useEffect(() => {
    if (visible || !mounted) return;
    translateY.value = withTiming(windowHeight, { duration: 250 }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [visible, mounted, windowHeight]);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-5)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(0, 1 - e.translationY / DISMISS_THRESHOLD);
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        translateY.value = withTiming(600, { duration: 250 });
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            // Clear the home indicator / gesture bar so the last row isn't clipped.
            { maxHeight: maxSheetHeight, paddingBottom: insets.bottom + SPACING[2] },
            sheetStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: `${colors.black}80`,
    },
    sheet: {
      backgroundColor: colors.surfaceContainerHigh,
      borderTopLeftRadius: BORDER_RADIUS['2xl'],
      borderTopRightRadius: BORDER_RADIUS['2xl'],
      paddingTop: SPACING[2],
      overflow: 'hidden',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.outlineVariant,
      alignSelf: 'center',
      marginBottom: SPACING[4],
    },
  });
}
