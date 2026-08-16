import React, { forwardRef, ReactNode, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export type TextInputVariant = 'boxed' | 'multiline' | 'inline' | 'bare';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
  /**
   * Visual form. 'boxed' (default) is the standard bordered 48px field used
   * across the app; 'multiline' is the same box sized for a textarea.
   * 'inline' and 'bare' render no border/background of their own — for
   * embedding inside a caller-drawn field row or container (no label/error
   * wrapper is rendered for these two).
   */
  variant?: TextInputVariant;
  /** Escape hatch for text style tweaks that don't warrant a new variant. */
  inputStyle?: StyleProp<TextStyle>;
  /**
   * Escape hatch to override the computed wrapper border color (boxed/
   * multiline only) — e.g. a danger-while-typing confirmation field where
   * "focused" isn't the usual primary-color affordance.
   */
  borderColor?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    error,
    leftIcon,
    rightIcon,
    containerStyle,
    variant = 'boxed',
    inputStyle,
    borderColor: borderColorProp,
    secureTextEntry,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleFocus: NonNullable<RNTextInputProps['onFocus']> = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };
  const handleBlur: NonNullable<RNTextInputProps['onBlur']> = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  if (variant === 'inline' || variant === 'bare') {
    return (
      <RNTextInput
        ref={ref}
        style={[styles[variant], inputStyle]}
        placeholderTextColor={colors.outline}
        secureTextEntry={secureTextEntry}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
    );
  }

  const borderColor =
    borderColorProp ??
    (error ? colors.error : isFocused ? colors.primary : colors.outlineVariant);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          variant === 'multiline' ? styles.inputRowMultiline : styles.inputRow,
          { borderColor },
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <RNTextInput
          ref={ref}
          style={[
            styles.input,
            variant === 'multiline' ? styles.inputMultilineText : undefined,
            leftIcon ? styles.inputWithLeft : undefined,
            rightIcon ? styles.inputWithRight : undefined,
            inputStyle,
          ]}
          placeholderTextColor={colors.outline}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: SPACING[1],
    },
    label: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurfaceVariant,
      marginBottom: SPACING[1],
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surfaceContainer,
      height: 48,
    },
    inputRowMultiline: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surfaceContainer,
      minHeight: 80,
    },
    iconLeft: {
      paddingLeft: SPACING[3],
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconRight: {
      paddingRight: SPACING[3],
      justifyContent: 'center',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      paddingHorizontal: SPACING[4],
      fontSize: FONT_SIZE.sm,
      color: colors.onSurface,
    },
    inputMultilineText: {
      paddingVertical: SPACING[3],
      textAlignVertical: 'top',
    },
    inputWithLeft: {
      paddingLeft: SPACING[2],
    },
    inputWithRight: {
      paddingRight: SPACING[2],
    },
    error: {
      marginTop: SPACING[1],
      fontSize: FONT_SIZE.xs,
      color: colors.error,
    },
    inline: {
      fontSize: FONT_SIZE.base,
      color: colors.onSurface,
      padding: 0,
      fontWeight: FONT_WEIGHT.medium,
    },
    bare: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      color: colors.onSurface,
      padding: 0,
    },
  });
}
