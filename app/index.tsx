import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

// Auth gate — redirects to the correct screen on app launch.
export default function Index() {
  const { isAuthenticated, onboardingDone } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingDone)  return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/report" />;
}
