import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { useEphemeralBannerStore } from '@/stores/ephemeralBannerStore';

const AUTO_DISMISS_MS = 6000;

/** Root-mounted, purely local counterpart to InAppNotificationBanner — see
 * ephemeralBannerStore for why this is a separate surface from AppNotification. */
export function EphemeralBanner() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const banner = useEphemeralBannerStore((state) => state.banner);
  const dismiss = useEphemeralBannerStore((state) => state.dismiss);
  const translateY = useSharedValue(-160);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!banner) return;

    translateY.value = -160;
    opacity.value = 0;
    translateY.value = withTiming(0, { duration: 240 });
    opacity.value = withTiming(1, { duration: 180 });
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [banner, dismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!banner) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.overlay, { top: insets.top + SPACING[2] }, animatedStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.banner}
        onPress={() => { dismiss(); banner.onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={`Thông báo mới: ${banner.title}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
          <MaterialIcon name="auto_awesome" size={22} color={colors.onPrimary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>THÔNG BÁO MỚI</Text>
          <Text style={styles.title} numberOfLines={1}>{banner.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{banner.body}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.dismissButton}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo"
          hitSlop={8}
        >
          <MaterialIcon name="close" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: SPACING[3],
      right: SPACING[3],
      zIndex: 1000,
      elevation: 20,
    },
    banner: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING[3],
      padding: SPACING[4],
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      backgroundColor: colors.surfaceContainerHigh,
      ...SHADOW.lg,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: BORDER_RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    content: {
      flex: 1,
      gap: SPACING[1],
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.primary,
      letterSpacing: 0.8,
    },
    title: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurface,
    },
    body: {
      fontSize: FONT_SIZE.sm,
      lineHeight: 19,
      color: colors.onSurfaceVariant,
    },
    dismissButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  });
}
