import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { MaterialSymbolsOutlined_400Regular } from '@expo-google-fonts/material-symbols-outlined';
import { queryClient } from '@/lib/queryClient';
import { useBootstrapSession } from '@/hooks';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider, useThemeScheme } from '@/providers/ThemeProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { EphemeralBanner } from '@/components/common/EphemeralBanner';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/theme';
import { initSentry, captureException } from '@/lib/sentry';
import * as Sentry from '@sentry/react-native';

// Runs once at module load, before the first render.
initSentry();

export default Sentry.wrap(function RootLayout() {
  // Registered under the exact family name MaterialIcon expects, so the
  // ligature-based <MaterialIcon name="wallet" /> renders glyphs, not text.
  const [fontsLoaded, fontError] = useFonts({
    'Material Symbols Outlined': MaterialSymbolsOutlined_400Regular,
  });

  // Restore the auth session from a persisted token before the gate renders,
  // so a reload doesn't flash the login screen.
  useBootstrapSession();
  const hydrated = useAuthStore((s) => s.hydrated);

  // Hold on the native splash until the icon font is ready (or has errored, in
  // which case we fall through) AND the session has been rehydrated.
  if ((!fontsLoaded && !fontError) || !hydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SafeAreaProvider>
            <NotificationProvider>
              <ThemedStatusBar />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
              </Stack>
              <EphemeralBanner />
            </NotificationProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});

/**
 * `expo-status-bar`'s `style="auto"` derives its content color from the OS
 * color scheme, not from `user.theme` — so a light-OS device showed dark
 * status-bar icons on top of the app's dark palette (invisible clock/battery)
 * whenever the resolved app theme didn't match the OS. Resolve explicitly
 * from `useThemeScheme()` instead. Rendered inside `ThemeProvider`.
 */
function ThemedStatusBar() {
  const scheme = useThemeScheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/**
 * Root error boundary — Expo Router renders this in place of the app when a
 * render error escapes a screen. Uses the theme-invariant `COLORS` export
 * directly (not useThemeColors()) since ThemeProvider may not have mounted
 * successfully if the error occurred above it in the tree.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <View style={boundaryStyles.container}>
      <Text style={boundaryStyles.title}>Đã có lỗi xảy ra</Text>
      <Text style={boundaryStyles.message}>{error.message}</Text>
      <TouchableOpacity style={boundaryStyles.retryBtn} onPress={retry} activeOpacity={0.7}>
        <Text style={boundaryStyles.retryText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const boundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING[8],
    gap: SPACING[3],
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  message: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
});
