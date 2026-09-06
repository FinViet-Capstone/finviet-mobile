import React from 'react';
import type { ColorValue } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { useThemeColors } from '@/providers/ThemeProvider';

interface TabBarIconProps {
  icon: string;
  color?: ColorValue;
  size?: number;
}

export default function TabBarIcon({
  icon,
  color,
  size = 22,
}: TabBarIconProps) {
  const colors = useThemeColors();
  return <MaterialIcon name={icon} color={color ?? colors.gray[500]} size={size} />;
}
