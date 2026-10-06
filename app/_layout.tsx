import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';

// Registers the journey task at bundle scope so Android can run it without
// mounting the React navigation tree.
import '@/src/features/tasks/journey-location-task';

import { AnimatedSplash } from '@/src/components/AnimatedSplash';
import { AuthProvider, useAuth } from '@/src/features/auth/AuthContext';
import { PushNotificationBridge } from '@/src/features/notifications/PushNotificationBridge';
import { FirstRunFeatureTour } from '@/src/features/onboarding/FirstRunFeatureTour';
import { JourneyLocationCoordinator } from '@/src/features/tasks/JourneyLocationCoordinator';
import { TourTargetProvider } from '@/src/features/onboarding/TourTargetRegistry';
import { AppThemeProvider, useAppTheme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const [fontWaitTimedOut, setFontWaitTimedOut] = useState(false);
  const startupReady = fontsLoaded || Boolean(fontError) || fontWaitTimedOut;

  useEffect(() => {
    if (startupReady) return;
    const timeout = setTimeout(() => setFontWaitTimedOut(true), 10_000);
    return () => clearTimeout(timeout);
  }, [startupReady]);

  useEffect(() => {
    if (startupReady) void SplashScreen.hideAsync();
  }, [startupReady]);

  if (!startupReady) return null;

  return (
    <AppThemeProvider>
      <AuthProvider>
        <TourTargetProvider>
          <RootNavigator />
          <ThemedStatusBar />
        </TourTargetProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);
  const finishSplash = useCallback(() => setSplashFinished(true), []);

  if (!splashFinished) {
    return <AnimatedSplash ready={!isLoading} onFinish={finishSplash} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="payout-account" />
          <Stack.Screen name="transaction-history" />
          <Stack.Screen name="emergency-contact" />
          <Stack.Screen name="task/new" />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen name="task/[id]/chat" />
          <Stack.Screen name="dispute/[taskId]" />
        </Stack.Protected>

        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
      </Stack>
      <PushNotificationBridge />
      <JourneyLocationCoordinator />
      <FirstRunFeatureTour />
    </>
  );
}
