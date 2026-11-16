import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View } from 'react-native';
import { FirebaseProvider } from '../contexts/FirebaseContext';
import { AppThemeProvider } from '../contexts/ThemeContext';
import { SheetHost } from '../components/ui/SheetHost';
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
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </View>
        </SheetHost>
      </FirebaseProvider>
    </AppThemeProvider>
  );
}
