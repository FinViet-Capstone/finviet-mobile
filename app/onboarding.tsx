import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { OnboardingIncome } from '@/components/onboarding/OnboardingIncome';
import { OnboardingAllocation } from '@/components/onboarding/OnboardingAllocation';
import { OnboardingCategories } from '@/components/onboarding/OnboardingCategories';
import { OnboardingWallet } from '@/components/onboarding/OnboardingWallet';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS } from '@/data/onboardingData';

export default function OnboardingScreen() {
  const router = useRouter();
  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);
  const [loading, setLoading] = useState(false);

  const {
    state,
    goToNextStep,
    goToPreviousStep,
    updateMonthlyIncome,
    updateAllocation,
    resetToDefaultAllocation,
    addCategory,
    removeCategory,
    updateWalletType,
    updateWalletName,
    updateWalletBalance,
    updateWalletCurrency,
    isAllocationValid,
    canFinish,
  } = useOnboardingFlow();

  const handleFinish = () => {
    if (!canFinish()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      markOnboardingDone();
      router.replace('/(tabs)/report');
    }, 500);
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <OnboardingIncome
            value={state.monthlyIncome}
            onChangeValue={updateMonthlyIncome}
            onNext={goToNextStep}
          />
        );
      case 2:
        return (
          <OnboardingAllocation
            allocations={state.allocations}
            monthlyIncome={state.monthlyIncome}
            onChangeAllocation={updateAllocation}
            onResetToDefault={resetToDefaultAllocation}
            onNext={goToNextStep}
          />
        );
      case 3:
        return (
          <OnboardingCategories
            categories={state.categories}
            onAddCategory={addCategory}
            onRemoveCategory={removeCategory}
            onSkip={goToNextStep}
            onNext={goToNextStep}
          />
        );
      case 4:
        return (
          <OnboardingWallet
            walletType={state.walletType}
            walletName={state.walletName}
            walletBalance={state.walletBalance}
            walletCurrency={state.walletCurrency}
            onChangeWalletType={updateWalletType}
            onChangeWalletName={updateWalletName}
            onChangeWalletBalance={updateWalletBalance}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {state.currentStep > 1 && (
          <TouchableOpacity
            onPress={goToPreviousStep}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.stepIndicator}>
            {ONBOARDING_STRINGS.stepIndicator(state.currentStep)}
          </Text>
        </View>

        {state.currentStep === 3 && (
          <TouchableOpacity
            onPress={goToNextStep}
            style={styles.skipButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        )}

        {state.currentStep !== 3 && state.currentStep > 1 && (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Step Content */}
      <View style={styles.content}>
        {renderStepContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    minHeight: 64,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  backArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  skipButton: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[2],
  },
  skipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
});
