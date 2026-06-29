/**
 * KeyboardAwareScrollView — one place for "tap a field → it scrolls into view".
 *
 * Wraps KeyboardAvoidingView + ScrollView and turns on the built-in iOS behaviour
 * (`automaticallyAdjustKeyboardInsets`, RN 0.70+) that insets the scroll content
 * by the keyboard height and scrolls the focused TextInput into view. Combined
 * with `keyboardShouldPersistTaps="handled"` (taps on other controls work without
 * an extra dismiss tap) and `keyboardDismissMode="interactive"` (drag to dismiss).
 *
 * Use for any screen/sheet with system-keyboard text inputs. Amount fields use the
 * custom NumericKeypad instead — that overlay dismisses the system keyboard on open
 * (see NumericKeypad), so the two never fight over focus.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Style for the outer KeyboardAvoidingView. */
  containerStyle?: ViewStyle;
}

export function KeyboardAwareScrollView({
  children,
  containerStyle,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  ...rest
}: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        // iOS: inset content by the keyboard and scroll the focused input into view.
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
