import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';

// Importing i18n also initializes it before the first screen renders.
import i18n, { deviceLanguage } from '@/i18n';
import { useSettings } from '@/store/settings';
import { AppThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

/** True once saved settings have been read from storage. */
function useSettingsHydrated() {
  return useSyncExternalStore(
    (onChange) => useSettings.persist.onFinishHydration(onChange),
    () => useSettings.persist.hasHydrated(),
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
  });
  const hydrated = useSettingsHydrated();
  const language = useSettings((s) => s.language);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    i18n.changeLanguage(language === 'system' ? deviceLanguage() : language);
  }, [language]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <Navigation />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function Navigation() {
  const { colors, dark } = useTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      primary: colors.cyan,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bots/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bots/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="table" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="analysis" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="looks" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="avatar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </ThemeProvider>
  );
}
