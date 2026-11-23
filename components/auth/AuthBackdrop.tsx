import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

// М'яке кольорове світло без нативних модулів: стос концентричних кіл із малою прозорістю.
// Накладаючись, вони дають плавний перехід від яскравого центру до прозорого краю,
// а шум зверху ховає сходинки між колами і додає фактуру «паперу».
const RINGS = 28;

interface BlobProps {
  size: number;
  color: string;
  x: number;
  y: number;
  ringOpacity: number;
  // Куди і за скільки мілісекунд пляма пливе туди-назад
  drift: { x: number; y: number; duration: number };
}

const Blob = ({ size, color, x, y, ringOpacity, drift }: BlobProps) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: drift.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: drift.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [progress, drift.duration]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, drift.x] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, drift.y] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        { width: size, height: size, left: x - size / 2, top: y - size / 2, transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      {Array.from({ length: RINGS }, (_, index) => {
        const ringSize = size * (1 - index / RINGS);
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              backgroundColor: color,
              opacity: ringOpacity,
            }}
          />
        );
      })}
    </Animated.View>
  );
};

// Фон екрана входу: м'яке біле світло зверху, як студійне освітлення
export default function AuthBackdrop({ isDark }: { isDark: boolean }) {
  const { width: w, height: h } = useWindowDimensions();
  const strength = isDark ? 1 : 0.6;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Blob
        size={w * 1.6}
        color="#FFFFFF"
        x={w * 0.5}
        y={h * 0.08}
        ringOpacity={0.007 * strength}
        drift={{ x: w * 0.05, y: h * 0.03, duration: 9000 }}
      />
      <Image
        source={require('../../assets/images/noise.png')}
        resizeMode="repeat"
        style={[styles.noise, { opacity: isDark ? 1 : 0.5 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noise: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
