import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';
import { View } from 'react-native';
import { FirebaseProvider } from '../contexts/FirebaseContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AppThemeProvider, useAppTheme } from '../contexts/ThemeContext';
import { SheetHost } from '../components/ui/SheetHost';
import { AppDialogHost } from '../components/ui/AppDialog';
import { firebaseReady } from '../utils/firebaseReady';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    NunitoSans: require('../assets/fonts/NunitoSans-Regular.ttf'),
    NunitoSansBold: require('../assets/fonts/NunitoSans-Bold.ttf'),
    NunitoSansExtraBold: require('../assets/fonts/NunitoSans-ExtraBold.ttf'),
    Lucide: require('../assets/fonts/Lucide.ttf'),
  });

  const [firebaseLoaded, setFirebaseLoaded] = useState(false);

  useEffect(() => {
    firebaseReady
      .catch((error) => console.error(error))
      .finally(() => setFirebaseLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || !firebaseLoaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <FirebaseProvider>
        {/* Шторки (BottomSheet) малюються тут поверх усіх екранів */}
        <SheetHost>
          <NavigationTheme>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </View>
          </NavigationTheme>
        </SheetHost>
        {/* Діалоги (appAlert) — поверх екранів і шторок */}
        <AppDialogHost />
      </FirebaseProvider>
    </AppThemeProvider>
  );
}

// Кольори навігації беруться з теми застосунку. Без цього React Navigation має свою світлу тему,
// і поки екран ще не відрендерився (старт, швидкий свайп між вкладками), видно її білий фон
function NavigationTheme({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useAppTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = useMemo(() => ({
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  }), [base, colors]);

  // Фон самого вікна Android — теж з теми: його видно в проміжках, коли вікно зсувається під клавіатуру
  // чи перемальовується, і без цього там блимав білий
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}
