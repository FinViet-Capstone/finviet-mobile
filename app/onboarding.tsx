import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { OnboardingIncome } from '@/components/onboarding/OnboardingIncome';
import { OnboardingAllocation } from '@/components/onboarding/OnboardingAllocation';
import { OnboardingPersona } from '@/components/onboarding/OnboardingPersona';
import { OnboardingWallet } from '@/components/onboarding/OnboardingWallet';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useSeedCategories } from '@/hooks/useCustomerCategories';
import { useCreateWallet } from '@/hooks/useWallets';
import { updateProfile } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS } from '@/data/onboardingData';

/** "DD/MM/YYYY" free text → "YYYY-MM-DD" (or null if incomplete/invalid). */
function toIsoDate(dob: string | null): string | null {
  if (!dob) return null;
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const customerEmail = useAuthStore((s) => s.customer?.email ?? '');
  const seedCategories = useSeedCategories();
  const createWallet = useCreateWallet();
  const [loading, setLoading] = useState(false);

  const {
    state,
    goToNextStep,
    goToPreviousStep,
    updateMonthlyIncome,
    updateAllocation,
    resetToDefaultAllocation,
    updateDisplayName,
    updateGender,
    updateDateOfBirth,
    updateWalletType,
    updateWalletName,
    updateWalletBalance,
    updateWalletCurrency,
    isAllocationValid,
    canFinish,
  } = useOnboardingFlow();

  const handleFinish = async () => {
    if (!canFinish() || loading) return;

    setLoading(true);
    try {
      // Display name is optional in step 3 — fall back to the email local-part.
      const fullName =
        state.displayName.trim() ||
        (customerEmail ? customerEmail.split('@')[0] : 'Người dùng');
      const income = Number(state.monthlyIncome.replace(/\D/g, '')) || null;
      const balance = Number(state.walletBalance.replace(/\D/g, '')) || 0;

      // Persist profile (name, expected income, gender, DOB) so onboarding sticks
      // across reloads — the backend infers onboardingDone from monthly income.
      await updateProfile({
        fullName,
        monthlyIncomeExpected: income,
        gender: state.gender,
        dateOfBirth: toIsoDate(state.dateOfBirth),
      });

      // Create the first wallet for real (this was previously never sent anywhere).
      await createWallet.mutateAsync({
        name: state.walletName.trim(),
        type: state.walletType,
        balance,
      });

      // Seed the per-customer category set (real backend seeds lazily; mock seeds here).
      seedCategories.mutate({ gender: state.gender, dateOfBirth: state.dateOfBirth });

      updateCustomer({ displayName: fullName, monthlyIncome: income });
      markOnboardingDone();
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert(
        'Không thể hoàn tất',
        'Đã xảy ra lỗi khi lưu thiết lập. Vui lòng kiểm tra kết nối và thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 4 "Liên kết ngân hàng": persist the profile (income/name/…) first so
  // onboarding data isn't lost, then open the Finverse link flow. The linked wallet
  // it creates satisfies the "first wallet" requirement; link-bank marks onboarding done.
  const handleLinkBank = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const fullName =
        state.displayName.trim() ||
        (customerEmail ? customerEmail.split('@')[0] : 'Người dùng');
      const income = Number(state.monthlyIncome.replace(/\D/g, '')) || null;
      await updateProfile({
        fullName,
        monthlyIncomeExpected: income,
        gender: state.gender,
        dateOfBirth: toIsoDate(state.dateOfBirth),
      });
      updateCustomer({ displayName: fullName, monthlyIncome: income });
      router.push('/link-bank');
    } catch {
      Alert.alert(
        'Không thể tiếp tục',
        'Đã xảy ra lỗi khi lưu thông tin. Vui lòng kiểm tra kết nối và thử lại.',
      );
    } finally {
      setLoading(false);
    }
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
          <OnboardingPersona
            displayName={state.displayName}
            gender={state.gender}
            dateOfBirth={state.dateOfBirth}
            onChangeDisplayName={updateDisplayName}
            onChangeGender={updateGender}
            onChangeDateOfBirth={updateDateOfBirth}
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
            onLinkBank={handleLinkBank}
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
