import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS, formatVietnameseCurrency } from '@/data/onboardingData';

export interface OnboardingIncomeProps {
  readonly value: string;
  readonly onChangeValue: (value: string) => void;
  readonly onNext: () => void;
}

export function OnboardingIncome({ value, onChangeValue, onNext }: OnboardingIncomeProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = (text: string) => {
    const formatted = formatVietnameseCurrency(text);
    onChangeValue(formatted);
  };

  return (
    <View style={styles.container}>
      {/* Header Text */}
      <View style={styles.header}>
        <Text style={styles.title}>{ONBOARDING_STRINGS.income.title}</Text>
        <Text style={styles.subtitle}>{ONBOARDING_STRINGS.income.subtitle}</Text>
      </View>

      {/* Input Area with Glassmorphism */}
      <View style={styles.inputWrapper}>
        <View style={styles.glowBackground} />
        <View style={[styles.glassCard, isFocused && styles.glassCardFocused]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={handleTextChange}
              placeholder={ONBOARDING_STRINGS.income.placeholder}
              placeholderTextColor={`${COLORS.onSurfaceVariant}80`}
              keyboardType="numeric"
              returnKeyType="done"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
            />
            <Text style={[styles.currency, isFocused && styles.currencyFocused]}>VND</Text>
          </View>

          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <Text style={styles.aiIcon}>✨</Text>
            <Text style={styles.aiLabel}>AI INSIGHT</Text>
          </View>
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
    </View>
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
  glassCardFocused: {
    borderColor: `${COLORS.primary}80`,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    width: '100%',
    gap: SPACING[2],
  },
  input: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    textAlign: 'center',
    maxWidth: 200,
    padding: 0,
    margin: 0,
    minWidth: 80,
  },
  currency: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  currencyFocused: {
    color: COLORS.primary,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: SPACING[3],
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
    marginTop: SPACING[2],
  },
  aiIcon: {
    fontSize: 14,
    color: COLORS.tertiary,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.tertiary,
    letterSpacing: 1.5,
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
