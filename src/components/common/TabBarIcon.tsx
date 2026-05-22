import React from 'react';
import { type LucideIcon } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

interface TabBarIconProps {
  icon: LucideIcon;
  color?: string;
  size?: number;
}

export default function TabBarIcon({
  icon: Icon,
  color = COLORS.gray[500],
  size = 22,
}: TabBarIconProps) {
  return <Icon color={color} size={size} />;
}
