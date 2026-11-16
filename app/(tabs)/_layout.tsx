import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import React, { useState } from 'react';

import TabBar from '@/components/ui/TabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { TabSwipeLockProvider } from '../../contexts/TabSwipeContext';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const [swipeLocked, setSwipeLocked] = useState(false);

  return (
    // Верхній відступ під статус-бар екрани додають самі: градієнт на головній заходить під нього
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" translucent />
      <TabSwipeLockProvider value={setSwipeLocked}>
        <MaterialTopTabs
          tabBarPosition="bottom"
          tabBar={(props: React.ComponentProps<typeof TabBar>) => <TabBar {...props} />}
          screenOptions={{ swipeEnabled: !swipeLocked }}>
          <MaterialTopTabs.Screen name="HomeScreen" options={{ title: 'Головна' }} />
          <MaterialTopTabs.Screen name="AddScreen" options={{ title: 'Додати' }} />
          <MaterialTopTabs.Screen name="DetailsScreen" options={{ title: 'Деталі' }} />
        </MaterialTopTabs>
      </TabSwipeLockProvider>
    </SafeAreaView>
  );
}
