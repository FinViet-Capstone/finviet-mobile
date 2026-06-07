import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NumericKeypad } from '@/components/common/NumericKeypad';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS, formatVietnameseCurrency } from '@/data/onboardingData';

export interface OnboardingIncomeProps {
  readonly value: string;
  readonly onChangeValue: (value: string) => void;
  readonly onNext: () => void;
}

export function OnboardingIncome({ value, onChangeValue, onNext }: OnboardingIncomeProps) {
  const handleNumberPress = (num: string) => {
    const currentValue = value.replace(/\./g, '');
    const newValue = currentValue + num;
    const formatted = formatVietnameseCurrency(newValue);
    onChangeValue(formatted);
  };

  const handleBackspace = () => {
    const currentValue = value.replace(/\./g, '');
    if (currentValue.length > 0) {
      const newValue = currentValue.slice(0, -1);
      const formatted = formatVietnameseCurrency(newValue);
      onChangeValue(formatted);
    }
  };

  const handleClear = () => {
    onChangeValue('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header Text */}
      <View style={styles.header}>
        <Text style={styles.title}>{ONBOARDING_STRINGS.income.title}</Text>
        <Text style={styles.subtitle}>{ONBOARDING_STRINGS.income.subtitle}</Text>
      </View>

      {/* Input Area with Glassmorphism */}
      <View style={styles.inputWrapper}>
        <View style={styles.glowBackground} />
        <View style={styles.glassCard}>
          <View style={styles.inputRow}>
            <Text style={styles.displayText}>
              {value || ONBOARDING_STRINGS.income.placeholder}
            </Text>
            <Text style={styles.currency}>VND</Text>
          </View>

          {/* Removed AI Badge */}
        </View>
      </View>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={onNext}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>{ONBOARDING_STRINGS.income.button}</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Numeric Keypad */}
      <NumericKeypad
        onNumberPress={handleNumberPress}
        onBackspace={handleBackspace}
        onClear={handleClear}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[8],
  },
  header: {
    marginBottom: SPACING[12],
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowBackground: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${COLORS.primary}0D`,
    opacity: 0.5,
  },
  glassCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: `${COLORS.surfaceContainerLow}CC`,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[6],
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}4D`,
    alignItems: 'center',
    gap: SPACING[2],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    width: '100%',
    gap: SPACING[2],
  },
  displayText: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    textAlign: 'center',
    minWidth: 80,
  },
  currency: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  buttonContainer: {
    paddingBottom: SPACING[8],
    paddingTop: SPACING[4],
  },
  button: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
});
