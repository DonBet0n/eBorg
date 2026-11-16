import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
}

// Фото користувача або перша літера імені, якщо фото немає
export default function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { colors } = useAppTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={shape} />;

  return (
    <View style={[styles.fallback, shape, { backgroundColor: colors.border }]}>
      <Text style={[styles.initial, { color: colors.textSecondary, fontSize: size * 0.4 }]}>
        {name?.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: 'NunitoSansBold',
  },
});
