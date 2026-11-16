import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from './Icon';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useAppTheme } from '../../contexts/ThemeContext';

const TABS: Record<string, { label: string; icon: IconName }> = {
  HomeScreen: { label: 'Головна', icon: 'home' },
  AddScreen: { label: 'Додати', icon: 'add' },
  DetailsScreen: { label: 'Деталі', icon: 'details' },
};

const ICON_SIZE = 24;
const FAB_SIZE = 60;
// Наскільки бар заходить на контент, щоб умістити виступ центральної кнопки
const RAISE = 24;

export default function TabBar({ state, navigation, position }: MaterialTopTabBarProps) {
  const { colors } = useAppTheme();
  const activeColor = colors.text;
  const fabColor = colors.text;
  const fabIconColor = colors.background;

  // Звідки користувач прийшов на «Додати» — туди ж повертає «×»
  const addIndex = state.routes.findIndex(route => route.name === 'AddScreen');
  const returnIndex = useRef(0);
  if (state.index !== addIndex) returnIndex.current = state.index;

  return (
    // Верхня прозора смуга (RAISE) лежить поверх контенту, щоб кнопка «Додати» виступала над баром і лишалась натискною
    <View style={styles.bar} pointerEvents="box-none">
      <View
        pointerEvents="none"
        style={[styles.barBg, { backgroundColor: colors.background, borderTopColor: colors.border }]}
      />
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;

        const isFocused = state.index === index;
        const isFab = route.name === 'AddScreen';
        // Прив'язано до позиції свайпу, тому підсвітка рухається разом з пальцем
        const progress = position.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        const inactiveOpacity = position.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [1, 0, 1],
          extrapolate: 'clamp',
        });

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          if (!isFocused) {
            navigation.navigate(route.name, route.params);
          } else if (isFab) {
            // Повторне натискання закриває форму; введене не губиться, бо екран лишається змонтованим
            const back = state.routes[returnIndex.current];
            navigation.navigate(back.name, back.params);
          }
        };

        if (isFab) {
          const label = isFocused ? 'Закрити' : 'Додати';
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={isFocused ? 'Закрити додавання боргу' : 'Додати борг'}
              hitSlop={{ top: RAISE }}
              style={styles.item}
            >
              {({ pressed }) => (
                <>
                  <View style={styles.iconWrap}>
                    <View
                      style={[
                        styles.fab,
                        {
                          backgroundColor: fabColor,
                          borderColor: colors.background,
                          shadowColor: colors.shadow,
                          transform: [{ scale: pressed ? 0.92 : 1 }],
                        },
                      ]}
                    >
                      {/* «+» повертається в «×» разом зі свайпом на екран додавання */}
                      <Animated.View
                        style={{
                          transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
                        }}
                      >
                        <Icon name="add" size={30} color={fabIconColor} />
                      </Animated.View>
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.label, { color: isFocused ? activeColor : colors.textSecondary }, isFocused && styles.labelActive]}
                  >
                    {label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
            android_ripple={{ color: colors.cardAlt, borderless: true }}
            style={styles.item}
          >
            <View style={styles.iconWrap}>
              <Animated.View style={[styles.pill, { backgroundColor: colors.cardAlt, opacity: progress }]} />
              <Animated.View style={[styles.icon, { opacity: inactiveOpacity }]}>
                <Icon name={tab.icon} size={ICON_SIZE} color={colors.textSecondary} />
              </Animated.View>
              <Animated.View style={[styles.icon, { opacity: progress }]}>
                <Icon name={tab.icon} size={ICON_SIZE} color={activeColor} />
              </Animated.View>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: isFocused ? activeColor : colors.textSecondary },
                isFocused && styles.labelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginTop: -RAISE,
    paddingTop: RAISE + 8,
    paddingBottom: 8,
  },
  barBg: {
    ...StyleSheet.absoluteFillObject,
    top: RAISE,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    position: 'absolute',
    bottom: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  item: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  icon: {
    position: 'absolute',
  },
  label: {
    fontSize: 12,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
});
