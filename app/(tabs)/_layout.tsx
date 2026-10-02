import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import React from 'react';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const { colors, theme } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <MaterialTopTabs
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#666',
          tabBarShowLabel: false,
          tabBarIndicatorStyle: { height: 0 },
          swipeEnabled: true,
          
          tabBarStyle: {
              height: 70,
              backgroundColor: '#000', // Keeps it black
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
          },

          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
          },
        }}>
        
      <MaterialTopTabs.Screen
        name="HomeScreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={40} name="house.fill" color={color} />,
        }}
      />
      
      <MaterialTopTabs.Screen
        name="AddScreen"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={50} name="a.circle.fill" color={color} />,
        }}
      />

      <MaterialTopTabs.Screen
        name="DetailsScreen"
        options={{
          title: 'Details',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={40} name="doc.fill" color={color} />,
        }}
      />
    </MaterialTopTabs>
    </SafeAreaView>
  );
}
