import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

// Розмитий радіальний градієнт без нативних модулів: стос концентричних кіл із малою прозорістю.
// Накладаючись, вони дають м'який перехід від яскравого центру до прозорого краю,
// а шум зверху ховає сходинки між колами.
const RINGS = 32;
// Приглушене світло: у центрі плями ~16% білого
const RING_OPACITY = 0.0055;

interface BlobProps {
  size: number;
  color: string;
  x: number;
  y: number;
  // Куди і за скільки мілісекунд пляма пливе туди-назад
  drift: { x: number; y: number; duration: number };
}

const Blob = ({ size, color, x, y, drift }: BlobProps) => {
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
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

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
              opacity: RING_OPACITY,
            }}
          />
        );
      })}
    </Animated.View>
  );
};

export default function AnimatedBackdrop() {
  // Одне джерело, як студійне світло: велика м'яка пляма зверху над гаманцем, що ледь помітно дихає.
  // Розміри в частках екрана, щоб на будь-якому телефоні лежало однаково
  const { width: w, height: h } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Blob size={w * 1.7} color="#FFFFFF" x={w * 0.5} y={h * 0.28} drift={{ x: w * 0.06, y: h * 0.03, duration: 8000 }} />
      <Image source={require('../../assets/images/noise.png')} resizeMode="repeat" style={styles.noise} />
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
