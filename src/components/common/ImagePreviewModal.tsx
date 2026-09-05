import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MaterialIcon } from '@/components/common/MaterialIcon';
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
      if (scale.value <= MIN_SCALE) return;
      translateX.value = gestureStartX.value + event.translationX;
      translateY.value = gestureStartY.value + event.translationY;
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

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

          <Text style={styles.hint}>
            Chụm hai ngón để phóng to · Kéo để xem · Chạm đúp để đặt lại
          </Text>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
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
  hint: {
    color: '#E6E1E5',
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
  },
});
