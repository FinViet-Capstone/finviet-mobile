import React from 'react';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS } from '@/constants/theme';

interface TabBarIconProps {
  icon: string;
  color?: string;
  size?: number;
}

export default function TabBarIcon({
  icon,
  color = COLORS.gray[500],
  size = 22,
}: TabBarIconProps) {
  return <MaterialIcon name={icon} color={color} size={size} />;
}
