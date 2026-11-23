import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

// Пасхалка екрана входу: з іконки вилітає жменя гривневих монет і падає за край екрана
const COUNT = 28;
const DURATION = 2200;
// Точок на параболі: Animated інтерполює між ними лінійно, тож 12 вистачає, щоб політ був плавним
const STEPS = 12;
const COIN = '#F5B800';
const COIN_EDGE = '#C98F00';

interface Particle {
  size: number;
  vx: number;
  vy: number;
  spin: number;
  delay: number;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

const makeParticles = (height: number): Particle[] =>
  Array.from({ length: COUNT }, () => {
    // Віялом угору: від -170° до -10°, щоб монети розліталися, а не били стовпом
    const angle = random(-170, -10) * (Math.PI / 180);
    const speed = random(height * 0.5, height * 1.3);
    return {
      size: random(18, 34),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: random(-2.5, 2.5) * 360,
      delay: random(0, 0.12),
    };
  });

interface CoinProps {
  particle: Particle;
  progress: Animated.Value;
  gravity: number;
}

const Coin = ({ particle, progress, gravity }: CoinProps) => {
  const { size, vx, vy, spin, delay } = particle;
  // Час кожної монети стартує трохи пізніше, щоб вилітали не всі одночасно
  const input = Array.from({ length: STEPS + 1 }, (_, i) => delay + (i / STEPS) * (1 - delay));
  const times = input.map((_, i) => i / STEPS);
  const translateX = progress.interpolate({ inputRange: input, outputRange: times.map(t => vx * t), extrapolate: 'clamp' });
  const translateY = progress.interpolate({
    inputRange: input,
    outputRange: times.map(t => vy * t + 0.5 * gravity * t * t),
    extrapolate: 'clamp',
  });
  const rotate = progress.interpolate({ inputRange: [delay, 1], outputRange: ['0deg', `${spin}deg`], extrapolate: 'clamp' });
  const opacity = progress.interpolate({
    inputRange: [0, delay, delay + 0.02, 0.8, 1],
    outputRange: [0, 0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const scale = progress.interpolate({ inputRange: [delay, delay + 0.08, 1], outputRange: [0.3, 1, 0.9], extrapolate: 'clamp' });

  return (
    <Animated.View
      style={[
        styles.coin,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderWidth: Math.max(2, size * 0.1),
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      <Text style={[styles.coinText, { fontSize: size * 0.55, lineHeight: size * 0.75 }]}>₴</Text>
    </Animated.View>
  );
};

interface CoinBurstProps {
  // Кожна зміна номера запускає новий залп
  trigger: number;
  origin: { x: number; y: number };
}

export default function CoinBurst({ trigger, origin }: CoinBurstProps) {
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  // Нові випадкові траєкторії на кожен залп
  const particles = useMemo(() => (trigger > 0 ? makeParticles(height) : []), [trigger, height]);

  useEffect(() => {
    if (trigger === 0) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.linear, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [trigger, progress]);

  if (particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.origin, { left: origin.x, top: origin.y }]}>
        {particles.map((particle, index) => (
          <Coin key={`${trigger}-${index}`} particle={particle} progress={progress} gravity={height * 4.4} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  coin: {
    position: 'absolute',
    backgroundColor: COIN,
    borderColor: COIN_EDGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinText: {
    color: COIN_EDGE,
    fontFamily: 'NunitoSansExtraBold',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
