import { useState } from 'react';
import { ONBOARDING_STEPS, ALLOCATION_PRESETS } from '@/data/onboardingData';

export interface OnboardingState {
  currentStep: number;
  monthlyIncome: string;
  allocations: {
    essential: number;
    wants: number;
    savings: number;
  };
  displayName: string;
  gender: 'male' | 'female' | 'other' | null;
  dateOfBirth: string | null;   // 'DD/MM/YYYY' free text for now
  walletType: 'basic' | 'linked';
  walletName: string;
  walletBalance: string;
  walletCurrency: string;
}

export const useOnboardingFlow = () => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    monthlyIncome: '',
    allocations: {
      essential: ALLOCATION_PRESETS[0].defaultPercentage,
      wants: ALLOCATION_PRESETS[1].defaultPercentage,
      savings: ALLOCATION_PRESETS[2].defaultPercentage,
    },
    displayName: '',
    gender: null,
    dateOfBirth: null,
    walletType: 'basic',
    walletName: '',
    walletBalance: '0',
    walletCurrency: 'VND',
  });

  const goToNextStep = () => {
    if (state.currentStep < ONBOARDING_STEPS.total) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const goToPreviousStep = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= ONBOARDING_STEPS.total) {
      setState(prev => ({ ...prev, currentStep: step }));
    }
  };

  const updateMonthlyIncome = (income: string) => {
    setState(prev => ({ ...prev, monthlyIncome: income }));
  };

  const updateAllocation = (key: keyof OnboardingState['allocations'], value: number) => {
    setState(prev => ({
      ...prev,
      allocations: { ...prev.allocations, [key]: value },
    }));
  };

  const resetToDefaultAllocation = () => {
    setState(prev => ({
      ...prev,
      allocations: {
        essential: ALLOCATION_PRESETS[0].defaultPercentage,
        wants: ALLOCATION_PRESETS[1].defaultPercentage,
        savings: ALLOCATION_PRESETS[2].defaultPercentage,
      },
    }));
  };

  const updateDisplayName = (displayName: string) => {
    setState(prev => ({ ...prev, displayName }));
  };

  const updateGender = (gender: OnboardingState['gender']) => {
    setState(prev => ({ ...prev, gender }));
  };

  const updateDateOfBirth = (dateOfBirth: string) => {
    setState(prev => ({ ...prev, dateOfBirth }));
  };

  const updateWalletType = (type: 'basic' | 'linked') => {
    setState(prev => ({ ...prev, walletType: type }));
  };

  const updateWalletName = (name: string) => {
    setState(prev => ({ ...prev, walletName: name }));
  };

  const updateWalletBalance = (balance: string) => {
    setState(prev => ({ ...prev, walletBalance: balance }));
  };

  const updateWalletCurrency = (currency: string) => {
    setState(prev => ({ ...prev, walletCurrency: currency }));
  };

  const isAllocationValid = (): boolean => {
    const total = state.allocations.essential + state.allocations.wants + state.allocations.savings;
    return total === 100;
  };

  const canFinish = (): boolean => {
    return state.walletName.trim().length > 0;
  };

  return {
    state,
    goToNextStep,
    goToPreviousStep,
    goToStep,
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
  };
};
