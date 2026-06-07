import React, { ReactNode, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function TextInput({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  secureTextEntry,
  ...rest
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? COLORS.error
    : isFocused
    ? COLORS.primary
    : COLORS.outlineVariant;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, { borderColor }]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <RNTextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : undefined,
            rightIcon ? styles.inputWithRight : undefined,
          ]}
          placeholderTextColor={COLORS.outline}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING[1],
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceVariant + '80', // 50% opacity
    minHeight: 48,
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
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
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
    color: COLORS.error,
  },
});
