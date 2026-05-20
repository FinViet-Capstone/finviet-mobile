import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/authStore';

// Auth screens
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';

// Main app
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Login:          undefined;
  Register:       undefined;
  ForgotPassword: undefined;
  Onboarding:     undefined;
  Main:           undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, onboardingDone } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // ── Auth flow ────────────────────────────────────────────────────────
        <>
          <Stack.Screen name="Login"          component={LoginScreen} />
          <Stack.Screen name="Register"       component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : !onboardingDone ? (
        // ── Onboarding flow ──────────────────────────────────────────────────
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        // ── Main app ─────────────────────────────────────────────────────────
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
