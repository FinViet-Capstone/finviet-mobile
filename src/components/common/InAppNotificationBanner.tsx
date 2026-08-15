import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@/constants/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import type { AppNotification, NotificationType } from '@/types/notification';

const AUTO_DISMISS_MS = 6000;

interface InAppNotificationBannerProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onPress: (notification: AppNotification) => void;
}

export function InAppNotificationBanner({
  notification,
  onDismiss,
  onPress,
}: InAppNotificationBannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-160);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!notification) return;

    translateY.value = -160;
    opacity.value = 0;
    translateY.value = withTiming(0, { duration: 240 });
    opacity.value = withTiming(1, { duration: 180 });
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notification, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!notification) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.overlay, { top: insets.top + SPACING[2] }, animatedStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.banner}
        onPress={() => onPress(notification)}
        accessibilityRole="button"
        accessibilityLabel={`Thông báo mới: ${notification.title ?? 'FinViet'}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: notificationColor(notification.type, colors) }]}>
          <MaterialIcon
            name={notificationIcon(notification.type)}
            size={22}
            color={colors.onPrimary}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>THÔNG BÁO MỚI</Text>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title ?? 'FinViet'}
          </Text>
          {notification.body ? (
            <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.dismissButton}
          onPress={onDismiss}
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

function notificationIcon(type: NotificationType): string {
  switch (type) {
    case 'budget_alert': return 'warning';
    case 'weekly_report': return 'auto_awesome';
    case 'goal_milestone': return 'savings';
    case 'announcement': return 'campaign';
  }
}

function notificationColor(type: NotificationType, colors: ThemeColors): string {
  switch (type) {
    case 'budget_alert': return colors.error;
    case 'weekly_report': return colors.primary;
    case 'goal_milestone': return colors.tertiary;
    case 'announcement': return colors.secondary;
  }
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
