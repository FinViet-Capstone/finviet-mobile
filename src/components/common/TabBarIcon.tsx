import React from 'react';
import { Text, StyleSheet } from 'react-native';

// Minimal glyph-based icon using Unicode/emoji characters.
// Replace with @expo/vector-icons (e.g. Ionicons, MaterialCommunityIcons)
// once the team agrees on an icon set.

interface TabBarIconProps {
  glyph: string;
  color?: string;
  size?:  number;
}

export default function TabBarIcon({ glyph, color = '#64748B', size = 22 }: TabBarIconProps) {
  return (
    <Text style={[styles.icon, { color, fontSize: size }]}>{glyph}</Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
