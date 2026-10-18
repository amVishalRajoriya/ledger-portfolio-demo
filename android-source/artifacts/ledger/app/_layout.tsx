import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LedgerProvider } from '@/context/LedgerContext';
import { useLedger } from '@/context/LedgerContext';
import { useColors } from '@/hooks/useColors';

// Keep the native splash visible while startup assets load, but never let a
// stalled font request prevent the app from opening.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient();
const FONT_LOAD_TIMEOUT_MS = 5000;

function RootLayoutNav() {
  const { isLoading, hasCompletedOnboarding } = useLedger();
  const colors = useColors();

  if (isLoading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading your Ledger"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back', animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="import" />
      <Stack.Screen name="new" />
      <Stack.Screen name="review" />
      <Stack.Screen name="shortcuts" />
      <Stack.Screen name="history-import" />
      <Stack.Screen name="account/new" />
      <Stack.Screen name="transaction/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontLoadTimedOut, setFontLoadTimedOut] = React.useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => undefined);
      return;
    }
    const timeout = setTimeout(() => {
      setFontLoadTimedOut(true);
      void SplashScreen.hideAsync().catch(() => undefined);
    }, FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !fontLoadTimedOut) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <LedgerProvider>
                  <RootLayoutNav />
                </LedgerProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
