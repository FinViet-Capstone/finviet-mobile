import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { TextInput } from '@/components/common/TextInput';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { ONBOARDING_STRINGS, WALLET_TYPES, formatVietnameseCurrency } from '@/data/onboardingData';

export interface OnboardingWalletProps {
  readonly walletType: 'basic' | 'linked';
  readonly walletName: string;
  readonly walletBalance: string;
  readonly walletCurrency: string;
  readonly onChangeWalletType: (type: 'basic' | 'linked') => void;
  readonly onChangeWalletName: (name: string) => void;
  readonly onChangeWalletBalance: (balance: string) => void;
  readonly onFinish: () => void;
}

export function OnboardingWallet({
  walletType,
  walletName,
  walletBalance,
  walletCurrency,
  onChangeWalletType,
  onChangeWalletName,
  onChangeWalletBalance,
  onFinish,
}: OnboardingWalletProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isBalanceFocused, setIsBalanceFocused] = useState(false);

  const handleNumberPress = (num: string) => {
    const currentValue = walletBalance.replace(/\./g, '');
    const newValue = currentValue + num;
    const formatted = formatVietnameseCurrency(newValue);
    onChangeWalletBalance(formatted);
  };

  const handleBackspace = () => {
    const currentValue = walletBalance.replace(/\./g, '');
    if (currentValue.length > 0) {
      const newValue = currentValue.slice(0, -1);
      const formatted = formatVietnameseCurrency(newValue);
      onChangeWalletBalance(formatted);
    }
  };

  const handleClear = () => {
    onChangeWalletBalance('');
  };

  const handleDismissKeypad = () => {
    setIsBalanceFocused(false);
  };

  const canFinish = walletName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={handleDismissKeypad}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            // Extra bottom space so the balance field can scroll above the keypad.
            isBalanceFocused && { paddingBottom: NUMPAD_HEIGHT },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{ONBOARDING_STRINGS.wallet.title}</Text>
            <Text style={styles.subtitle}>{ONBOARDING_STRINGS.wallet.subtitle}</Text>
          </View>

          {/* Wallet Type Selection */}
          <View style={styles.typeSelection}>
            {WALLET_TYPES.map((type) => {
              const isSelected = walletType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    isSelected && styles.typeCardSelected,
                  ]}
                  onPress={() => onChangeWalletType(type.id as 'basic' | 'linked')}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}

                  <View style={[
                    styles.typeIcon,
                    isSelected
                      ? { backgroundColor: colors.primaryContainer }
                      : { backgroundColor: colors.surfaceVariant }
                  ]}>
                    <Text style={styles.typeIconText}>{getIconForType(type.icon)}</Text>
                  </View>

                  <Text style={[
                    styles.typeLabel,
                    isSelected ? { color: colors.onBackground } : { color: colors.onSurfaceVariant }
                  ]}>
                    {type.label}
                  </Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Expanded Form for Basic Wallet */}
          {walletType === 'basic' && (
            <View style={styles.formCard}>
              {/* Wallet Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{ONBOARDING_STRINGS.wallet.nameLabel}</Text>
                <TextInput
                  leftIcon={<Text style={styles.inputIcon}>✏️</Text>}
                  placeholder={ONBOARDING_STRINGS.wallet.namePlaceholder}
                  value={walletName}
                  onChangeText={onChangeWalletName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Current Balance */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{ONBOARDING_STRINGS.wallet.balanceLabel}</Text>
                <TouchableOpacity
                  style={[
                    styles.inputContainer,
                    isBalanceFocused && styles.inputContainerFocused,
                  ]}
                  onPress={() => setIsBalanceFocused(true)}
                  activeOpacity={1}
                >
                  <Text style={styles.currencySymbol}>₫</Text>
                  <Text style={[styles.balanceDisplay, !walletBalance && styles.balancePlaceholder]}>
                    {walletBalance || '0'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.inputHint}>{ONBOARDING_STRINGS.wallet.balanceHint}</Text>
              </View>
            </View>
          )}

          {/* Finish Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, !canFinish && styles.buttonDisabled]}
              onPress={onFinish}
              disabled={!canFinish}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>{ONBOARDING_STRINGS.wallet.button}</Text>
              <Text style={styles.checkIconButton}>✓</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Show numeric keypad when balance is focused */}
      <NumericKeypad
        visible={isBalanceFocused && walletType === 'basic'}
        onClose={handleDismissKeypad}
        onNumberPress={handleNumberPress}
        onBackspace={handleBackspace}
        onClear={handleClear}
        onDone={handleDismissKeypad}
      />
    </KeyboardAvoidingView>
  );
}

const getIconForType = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    account_balance_wallet: '👛',
    account_balance: '🏦',
  };
  return iconMap[iconName] || '💰';
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[12],
  },
  header: {
    marginBottom: SPACING[6],
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onBackground,
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: colors.onSurfaceVariant,
    lineHeight: 24,
  },
  typeSelection: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginBottom: SPACING[6],
  },
  typeCard: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
    opacity: 0.8,
  },
  typeCardSelected: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: FONT_WEIGHT.bold,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  typeIconText: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.05),
    gap: SPACING[4],
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    gap: SPACING[2],
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputIcon: {
    fontSize: 20,
  },
  currencySymbol: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurfaceVariant,
  },
  balanceDisplay: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onBackground,
    textAlign: 'right',
  },
  balancePlaceholder: {
    color: withAlpha(colors.onSurfaceVariant, 0.5),
    fontWeight: FONT_WEIGHT.normal,
  },
  inputHint: {
    fontSize: FONT_SIZE.xs,
    color: withAlpha(colors.onSurfaceVariant, 0.7),
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: SPACING[8],
  },
  button: {
    height: 56,
    backgroundColor: colors.primaryContainer,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    shadowColor: colors.primaryContainer,
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
    color: colors.onPrimaryContainer,
  },
  checkIconButton: {
    fontSize: FONT_SIZE.xl,
    color: colors.onPrimaryContainer,
  },
  });
}
