import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS, ALLOCATION_PRESETS } from '@/data/onboardingData';

export interface OnboardingAllocationProps {
  readonly allocations: {
    essential: number;
    wants: number;
    savings: number;
  };
  readonly monthlyIncome: string;
  readonly onChangeAllocation: (key: 'essential' | 'wants' | 'savings', value: number) => void;
  readonly onResetToDefault: () => void;
  readonly onNext: () => void;
}

export function OnboardingAllocation({
  allocations,
  monthlyIncome,
  onChangeAllocation,
  onResetToDefault,
  onNext,
}: OnboardingAllocationProps) {
  const income = parseFloat(monthlyIncome.replace(/\./g, '')) || 15000000;

  const calculateAmount = (percentage: number): string => {
    const amount = (income * percentage) / 100;
    return amount.toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';
  };

  const isValid = allocations.essential + allocations.wants + allocations.savings === 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{ONBOARDING_STRINGS.allocation.title}</Text>
        <Text style={styles.subtitle}>{ONBOARDING_STRINGS.allocation.subtitle}</Text>
      </View>

      {/* Default Button */}
      <View style={styles.defaultButtonContainer}>
        <TouchableOpacity
          style={styles.defaultButton}
          onPress={onResetToDefault}
          activeOpacity={0.7}
        >
          <Text style={styles.sparkleIcon}>✨</Text>
          <Text style={styles.defaultButtonText}>
            {ONBOARDING_STRINGS.allocation.defaultButton}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Allocation Cards */}
      <View style={styles.cardsContainer}>
        {ALLOCATION_PRESETS.map((preset) => {
          const key = preset.id as keyof typeof allocations;
          const percentage = allocations[key];
          const colorMap = {
            primary: COLORS.primary,
            secondary: COLORS.secondary,
            tertiary: COLORS.tertiary,
          };
          const color = colorMap[preset.color as keyof typeof colorMap];

          return (
            <View
              key={preset.id}
              style={[
                styles.allocationCard,
                { borderLeftColor: color, borderLeftWidth: 4 },
              ]}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconCircle, { backgroundColor: `${color}1A` }]}>
                  <Text style={styles.iconText}>{getIconForType(preset.icon)}</Text>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{preset.name}</Text>
                    <Text style={[styles.percentage, { color }]}>{percentage}%</Text>
                  </View>

                  <View style={styles.cardDetails}>
                    <Text style={styles.description}>{preset.description}</Text>
                    <Text style={styles.amount}>{calculateAmount(percentage)}</Text>
                  </View>

                  {/* Slider - Note: React Native doesn't have native range input, using TouchableOpacity as placeholder */}
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <View
                        style={[
                          styles.sliderFill,
                          { width: `${percentage}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Validation Message */}
      {isValid && (
        <View style={styles.validationSuccess}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.validationText}>
            {ONBOARDING_STRINGS.allocation.validationSuccess}
          </Text>
        </View>
      )}

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={onNext}
          disabled={!isValid}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>{ONBOARDING_STRINGS.allocation.button}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getIconForType = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    home: '🏠',
    shopping_bag: '🛍️',
    savings: '💰',
  };
  return iconMap[iconName] || '📊';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },
  header: {
    marginBottom: SPACING[8],
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  defaultButtonContainer: {
    alignItems: 'center',
    marginBottom: SPACING[8],
  },
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.surfaceContainer,
  },
  sparkleIcon: {
    fontSize: 20,
  },
  defaultButtonText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  cardsContainer: {
    gap: SPACING[3],
    marginBottom: SPACING[8],
  },
  allocationCard: {
    backgroundColor: `${COLORS.surfaceContainerHigh}66`,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    gap: SPACING[4],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
  },
  percentage: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  description: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
  amount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
  },
  sliderContainer: {
    marginTop: SPACING[1],
  },
  sliderTrack: {
    height: 4,
    backgroundColor: `${COLORS.outline}33`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  validationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: `${COLORS.tertiary}1A`,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[4],
  },
  checkIcon: {
    fontSize: 20,
    color: COLORS.tertiary,
  },
  validationText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.tertiary,
    fontWeight: FONT_WEIGHT.medium,
  },
  buttonContainer: {
    paddingBottom: SPACING[8],
  },
  button: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
});
