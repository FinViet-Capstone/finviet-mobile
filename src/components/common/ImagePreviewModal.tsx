import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DISMISS_SPRING_CONFIG, DISMISS_THRESHOLD } from '@/constants/gestures';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface ImagePreviewModalProps {
  visible: boolean;
  uri: string | null;
  title: string;
  onClose: () => void;
}

/** Full-screen receipt preview with pinch zoom and double-tap reset/zoom. */
export function ImagePreviewModal({
  visible,
  uri,
  title,
  onClose,
}: ImagePreviewModalProps) {
  const scale = useSharedValue(MIN_SCALE);
  const gestureStartScale = useSharedValue(MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  // Swipe-down-to-close offset for the whole screen (header + image + hint),
  // separate from translateX/Y above which only pan a zoomed-in image.
  const dismissY = useSharedValue(0);

  const handleClose = () => {
    onClose();
  };

  // Reopening reuses the same component instance (the Modal just toggles
  // `visible`), so a swipe that was mid-dismiss last time must not leave the
  // screen translated/faded the next time it opens.
  useEffect(() => {
    if (visible) {
      dismissY.value = 0;
    }
  }, [visible, dismissY]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      gestureStartScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, gestureStartScale.value * event.scale),
      );
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const pan = Gesture.Pan()
    .onBegin(() => {
      gestureStartX.value = translateX.value;
      gestureStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > MIN_SCALE) {
        translateX.value = gestureStartX.value + event.translationX;
        translateY.value = gestureStartY.value + event.translationY;
        return;
      }
      // Unzoomed: only a downward drag counts as a dismiss attempt — left/
      // right/up are left alone (bounce back to 0, nothing to bounce from).
      if (event.translationY > 0) {
        dismissY.value = event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > MIN_SCALE) return;
      if (dismissY.value > DISMISS_THRESHOLD) {
        // Both call sites conditionally render this whole component off the
        // prop that onClose() flips, so it unmounts on the same tick — a
        // post-release exit tween here would never get a frame to paint.
        // The live drag-follow during .onUpdate is what actually delivers
        // the swipe feel; this just commits the close.
        runOnJS(handleClose)();
      } else {
        dismissY.value = withSpring(0, DISMISS_SPRING_CONFIG);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      } else {
        scale.value = withTiming(2.5);
      }
    });

  const zoomGesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dismissY.value }],
    opacity: Math.max(0, 1 - dismissY.value / (DISMISS_THRESHOLD * 3)),
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      {/* RN's Modal opens a separate native window on Android, which the
          app-root SafeAreaProvider (app/_layout.tsx) can't measure insets
          into — without this nested provider the header renders under the
          real status bar. */}
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Animated.View style={[styles.content, dismissStyle]}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng ảnh hóa đơn"
                >
                  <MaterialIcon name="close" size={26} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <GestureDetector gesture={zoomGesture}>
                <View style={styles.previewArea}>
                  {uri ? (
                    <Animated.Image
                      source={{ uri }}
                      style={[styles.image, animatedImageStyle]}
                      resizeMode="contain"
                      accessibilityLabel={title}
                    />
                  ) : null}
                </View>
              </GestureDetector>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.downChevron}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng ảnh hóa đơn"
                  hitSlop={8}
                >
                  <MaterialIcon name="expand_more" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.hint}>
                  Chụm hai ngón để phóng to · Kéo để xem · Vuốt xuống để đóng · Chạm đúp để đặt lại
                </Text>
              </View>
            </Animated.View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  content: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING[4],
    paddingRight: SPACING[2],
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewArea: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  footer: {
    alignItems: 'center',
    paddingBottom: SPACING[2],
  },
  downChevron: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: '#E6E1E5',
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[2],
  },
});
