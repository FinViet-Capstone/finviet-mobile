import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { CustomSlider } from '@/components/common/CustomSlider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS, ALLOCATION_PRESETS } from '@/data/onboardingData';

type BucketKey = 'essential' | 'wants' | 'savings';

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

  const [lockedBucket, setLockedBucket] = useState<BucketKey | null>(null);
  const [activeField, setActiveField] = useState<BucketKey | null>(null);
  const [pctRaw, setPctRaw] = useState('');

  const calculateAmount = (percentage: number): string => {
    const amount = (income * percentage) / 100;
    return amount.toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';
  };

  const handleSliderChange = useCallback((key: BucketKey, newValue: number) => {
    if (key === lockedBucket) return; // the locked bucket's own share is fixed
    const rounded = Math.round(newValue);
    const otherKeys = (['essential', 'wants', 'savings'] as const).filter(k => k !== key);
    const [key1, key2] = otherKeys;

    if (lockedBucket === key1 || lockedBucket === key2) {
      // One of the other two buckets is locked: clamp the dragged value
      // against the locked share, and give the entire remainder to the
      // other (unlocked) bucket rather than splitting proportionally.
      const lockedValue = allocations[lockedBucket];
      const freeKey = lockedBucket === key1 ? key2 : key1;
      const clamped = Math.min(Math.max(rounded, 0), 100 - lockedValue);
      onChangeAllocation(key, clamped);
      onChangeAllocation(freeKey, 100 - lockedValue - clamped);
      return;
    }

    // No lock: redistribute proportionally between the other two, as before.
    const remaining = 100 - rounded;
    const total1and2 = allocations[key1] + allocations[key2];

    if (total1and2 === 0) {
      // If both are 0, split evenly
      onChangeAllocation(key1, Math.floor(remaining / 2));
      onChangeAllocation(key2, remaining - Math.floor(remaining / 2));
    } else {
      // Distribute proportionally
      const ratio1 = allocations[key1] / total1and2;
      const new1 = Math.round(remaining * ratio1);
      const new2 = remaining - new1;

      onChangeAllocation(key1, new1);
      onChangeAllocation(key2, new2);
    }

    onChangeAllocation(key, rounded);
  }, [allocations, lockedBucket, onChangeAllocation]);

  const openField = useCallback((key: BucketKey) => {
    if (key === lockedBucket) return;
    setPctRaw('');
    setActiveField(key);
  }, [lockedBucket]);

  const handleKeypadNumberPress = useCallback((key: string) => {
    setPctRaw((prev) => {
      if (key === '000') return prev;
      const next = prev + key;
      return next.length > 3 ? prev : next;
    });
  }, []);

  const handleKeypadBackspace = useCallback(() => setPctRaw((prev) => prev.slice(0, -1)), []);
  const handleKeypadClear = useCallback(() => setPctRaw(''), []);
  const handleKeypadClose = useCallback(() => { setActiveField(null); setPctRaw(''); }, []);

  const handleKeypadDone = useCallback(() => {
    if (activeField) {
      const clamped = Math.min(100, Math.max(0, parseInt(pctRaw || '0', 10)));
      handleSliderChange(activeField, clamped);
    }
    setActiveField(null);
    setPctRaw('');
  }, [activeField, pctRaw, handleSliderChange]);

  const isValid = allocations.essential + allocations.wants + allocations.savings === 100;

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, activeField !== null && { paddingBottom: NUMPAD_HEIGHT }]}
      showsVerticalScrollIndicator={false}
    >
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
          const key = preset.id as BucketKey;
          const percentage = allocations[key];
          const colorMap = {
            primary: COLORS.primary,
            secondary: COLORS.secondary,
            tertiary: COLORS.tertiary,
          };
          const color = colorMap[preset.color as keyof typeof colorMap];
          const isLocked = key === lockedBucket;

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
                    <View style={styles.pctControls}>
                      <TouchableOpacity
                        onPress={() => setLockedBucket((prev) => (prev === key ? null : key))}
                        style={styles.lockBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isLocked }}
                        accessibilityLabel={
                          isLocked
                            ? ONBOARDING_STRINGS.allocation.unlockLabel(preset.name)
                            : ONBOARDING_STRINGS.allocation.lockLabel(preset.name)
                        }
                      >
                        <MaterialIcon
                          name={isLocked ? 'lock' : 'lock_open'}
                          size={14}
                          color={isLocked ? color : COLORS.onSurfaceVariant}
                          filled={isLocked}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={isLocked ? 1 : 0.6}
                        disabled={isLocked}
                        onPress={() => openField(key)}
                        style={styles.pctRow}
                        accessibilityRole="button"
                        accessibilityLabel={ONBOARDING_STRINGS.allocation.editPctLabel(preset.name, percentage)}
                      >
                        <Text style={[styles.percentage, { color }, isLocked && styles.percentageDisabled]}>
                          {percentage}%
                        </Text>
                        {!isLocked && <MaterialIcon name="edit" size={12} color={color} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <Text style={styles.description}>{preset.description}</Text>
                    <Text style={styles.amount}>{calculateAmount(percentage)}</Text>
                  </View>

                  {/* Interactive Slider */}
                  <CustomSlider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={percentage}
                    onValueChange={(value) => handleSliderChange(key, value)}
                    minimumTrackTintColor={color}
                    maximumTrackTintColor={`${COLORS.outline}33`}
                    thumbTintColor={color}
                    disabled={isLocked}
                  />
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
    </ScrollView>
    <NumericKeypad
      visible={activeField !== null}
      onClose={handleKeypadClose}
      onNumberPress={handleKeypadNumberPress}
      onBackspace={handleKeypadBackspace}
      onClear={handleKeypadClear}
      onDone={handleKeypadDone}
    />
    </>
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
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[6],
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
    alignItems: 'center',
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
  percentageDisabled: {
    opacity: 0.5,
  },
  pctControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  lockBtn: {
    padding: 2,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  slider: {
    width: '100%',
    height: 40,
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
