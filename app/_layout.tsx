import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { MaterialSymbolsOutlined_400Regular } from '@expo-google-fonts/material-symbols-outlined';
import { setupNotifications } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
  // Registered under the exact family name MaterialIcon expects, so the
  // ligature-based <MaterialIcon name="wallet" /> renders glyphs, not text.
  const [fontsLoaded, fontError] = useFonts({
    'Material Symbols Outlined': MaterialSymbolsOutlined_400Regular,
  });

  useEffect(() => {
    setupNotifications().catch(console.warn);
  }, []);

  // Hold on the native splash until the icon font is ready (or has errored,
  // in which case we fall through rather than blocking the app forever).
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
