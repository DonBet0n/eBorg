import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        
        tabBarStyle: {
            height: 70,
            backgroundColor: 'black',
        },

        tabBarIconStyle: {
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },

        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        
      }}>

        
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={40} name="house.fill" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="AddScreen"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <IconSymbol size={50} name="a.circle.fill" color={color} />,
        }}
      />

<Tabs.Screen
        name="DetailsScreen"
        options={{
          title: 'Details',
          tabBarIcon: ({ color }) => <IconSymbol size={40} name="doc.fill" color={color} />,
        }}
      />
    </Tabs>
    </SafeAreaView>
  );
}
