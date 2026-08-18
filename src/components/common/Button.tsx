import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  const containerStyle = variant === 'primary'
    ? styles.primary
    : variant === 'secondary'
    ? styles.secondary
    : styles.ghost;

  const labelStyle = variant === 'primary'
    ? styles.primaryLabel
    : variant === 'secondary'
    ? styles.secondaryLabel
    : styles.ghostLabel;

  const spinnerColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.base, containerStyle, isDisabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text style={[styles.label, labelStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      height: 48,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING[6],
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.transparent,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    ghost: {
      backgroundColor: colors.transparent,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.semibold,
    },
    primaryLabel: {
      color: colors.onPrimary,
    },
    secondaryLabel: {
      color: colors.onSurface,
    },
    ghostLabel: {
      color: colors.primary,
    },
  });
}
