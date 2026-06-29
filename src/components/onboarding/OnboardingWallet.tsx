import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { NumericKeypad, NUMPAD_HEIGHT } from '@/components/common/NumericKeypad';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
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
  readonly onLinkBank: () => void;
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
  onLinkBank,
}: OnboardingWalletProps) {
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

                  {'hasAIBadge' in type && type.hasAIBadge && (
                    <View style={styles.aiBadgeTop}>
                      <Text style={styles.aiBadgeIcon}>✨</Text>
                      <Text style={styles.aiBadgeLabel}>AI</Text>
                    </View>
                  )}

                  <View style={[
                    styles.typeIcon,
                    isSelected
                      ? { backgroundColor: COLORS.primaryContainer }
                      : { backgroundColor: COLORS.surfaceVariant }
                  ]}>
                    <Text style={styles.typeIconText}>{getIconForType(type.icon)}</Text>
                  </View>

                  <Text style={[
                    styles.typeLabel,
                    isSelected ? { color: COLORS.onBackground } : { color: COLORS.onSurfaceVariant }
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
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✏️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={ONBOARDING_STRINGS.wallet.namePlaceholder}
                    placeholderTextColor={`${COLORS.onSurfaceVariant}80`}
                    value={walletName}
                    onChangeText={onChangeWalletName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
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

          {/* Linked bank — Finverse hosted login (consumer aggregation) */}
          {walletType === 'linked' && (
            <View style={styles.comingSoonCard}>
              <Text style={styles.comingSoonIcon}>🏦</Text>
              <Text style={styles.comingSoonTitle}>Liên kết ngân hàng qua Finverse</Text>
              <Text style={styles.comingSoonText}>
                Đăng nhập ngân hàng của bạn một cách an toàn (FinViet không thấy mật khẩu)
                và tự động nhập giao dịch + số dư.
              </Text>
              <TouchableOpacity
                style={styles.linkBankAction}
                onPress={onLinkBank}
                activeOpacity={0.85}
              >
                <Text style={styles.linkBankActionText}>Liên kết ngân hàng</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onChangeWalletType('basic')} activeOpacity={0.7}>
                <Text style={styles.linkBankSecondary}>Hoặc tạo ví cơ bản</Text>
              </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.onBackground,
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
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
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
    opacity: 0.8,
  },
  typeCardSelected: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: COLORS.primary,
    opacity: 1,
    shadowColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: FONT_WEIGHT.bold,
  },
  aiBadgeTop: {
    position: 'absolute',
    top: -12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
  },
  aiBadgeIcon: {
    fontSize: 12,
  },
  aiBadgeLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimaryContainer,
    letterSpacing: 1.5,
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
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: `${COLORS.white}0D`,
    gap: SPACING[4],
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    gap: SPACING[2],
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputIcon: {
    fontSize: 20,
  },
  currencySymbol: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurfaceVariant,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.onBackground,
    padding: 0,
  },
  balanceDisplay: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
    textAlign: 'right',
  },
  balancePlaceholder: {
    color: `${COLORS.onSurfaceVariant}80`,
    fontWeight: FONT_WEIGHT.normal,
  },
  inputHint: {
    fontSize: FONT_SIZE.xs,
    color: `${COLORS.onSurfaceVariant}B3`,
    marginTop: 4,
  },
  comingSoonCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[2],
  },
  comingSoonIcon: {
    fontSize: 36,
    marginBottom: SPACING[1],
  },
  comingSoonTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkBankAction: {
    marginTop: SPACING[3],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  linkBankActionText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
  linkBankSecondary: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  buttonContainer: {
    marginTop: SPACING[8],
  },
  button: {
    height: 56,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    shadowColor: COLORS.primaryContainer,
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
    color: COLORS.onPrimaryContainer,
  },
  checkIconButton: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.onPrimaryContainer,
  },
});
