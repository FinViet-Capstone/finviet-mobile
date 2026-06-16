import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';

export interface MaterialIconProps {
  readonly name: string;
  readonly size?: number;
  readonly color?: string;
  readonly filled?: boolean;
  readonly style?: TextStyle;
}

/**
 * Material Symbols icon component
 * Uses Material Symbols Outlined font family
 *
 * @example
 * <MaterialIcon name="home" size={24} color="#000" />
 * <MaterialIcon name="favorite" size={20} color="red" filled />
 */
export function MaterialIcon({
  name,
  size = 24,
  color = '#000000',
  filled = false,
  style,
}: MaterialIconProps) {
  return (
    <Text
      style={[
        styles.icon,
        {
          fontSize: size,
          color,
          // Note: fontVariationSettings is not supported in React Native
          // The filled prop is here for API compatibility but won't work
          // Use Material Symbols with FILL suffix in font name instead
        },
        style,
      ]}
      allowFontScaling={false}
    >
      {name}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: 'Material Symbols Outlined',
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: undefined,
    letterSpacing: 0,
  },
});

// Icon name mappings from Lucide to Material Symbols
export const ICON_MAP = {
  // Navigation
  'chevron-left': 'chevron_left',
  'chevron-right': 'chevron_right',
  'chevron-down': 'chevron_down',
  'arrow-left': 'arrow_back',
  'arrow-right': 'arrow_forward',

  // Finance
  'wallet': 'account_balance_wallet',
  'receipt': 'receipt',
  'bar-chart-3': 'bar_chart',
  'pie-chart': 'pie_chart',
  'trending-up': 'trending_up',
  'trending-down': 'trending_down',

  // UI Elements
  'plus': 'add',
  'menu': 'menu',
  'more-vertical': 'more_vert',
  'more-horizontal': 'more_horiz',
  'check': 'check',
  'check-circle-2': 'check_circle',
  'x': 'close',
  'alert-circle': 'error',
  'info': 'info',

  // Calendar & Time
  'calendar': 'calendar_today',
  'calendar-days': 'calendar_month',
  'clock': 'schedule',

  // Content
  'list': 'list',
  'inbox': 'inbox',
  'file-text': 'description',
  'bell': 'notifications',

  // Achievement
  'trophy': 'emoji_events',

  // Categories (for budget/expenses)
  'shopping-cart': 'shopping_cart',
  'coffee': 'local_cafe',
  'utensils': 'restaurant',
  'car': 'directions_car',
  'home': 'home',
  'heart': 'favorite',
  'gift': 'card_giftcard',
  'plane': 'flight',
  'book': 'book',
  'dumbbell': 'fitness_center',
  'pill': 'medication',
  'shirt': 'checkroom',
  'bus': 'directions_bus',
  'train': 'train',
  'phone': 'phone',
  'wifi': 'wifi',
  'zap': 'bolt',
  'droplet': 'water_drop',
  'flame': 'local_fire_department',
  'briefcase': 'work',
  'graduation-cap': 'school',
  'users': 'group',
  'user': 'person',
  'pet': 'pets',
  'trees': 'park',
  'music': 'music_note',
  'film': 'movie',
  'gamepad': 'sports_esports',
  'scissors': 'content_cut',
  'wrench': 'build',
  'hammer': 'handyman',
  'paint-bucket': 'format_paint',
} as const;

/**
 * Helper to get Material Symbol name from Lucide name
 */
export function getMaterialIconName(lucideName: string): string {
  return ICON_MAP[lucideName as keyof typeof ICON_MAP] || lucideName.replace(/-/g, '_');
}
