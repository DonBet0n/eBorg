import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

// Гаманець із купюрами й монетами, намальований з View: не потрібні картинки чи SVG-модуль.
// Повільно «пливе» вгору-вниз, щоб вітальний екран не був статичним.
const Banknote = ({ color, style }: { color: string; style: object }) => (
  <View style={[styles.note, { backgroundColor: color }, style]}>
    <View style={styles.noteInner} />
    <View style={styles.noteSeal}>
      <Text style={styles.noteSymbol}>₴</Text>
    </View>
  </View>
);

const Coin = ({ size, style }: { size: number; style: object }) => (
  <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.08 }, style]}>
    <Text style={[styles.coinSymbol, { fontSize: size * 0.46, lineHeight: size * 0.56 }]}>₴</Text>
  </View>
);

export default function WalletIllustration() {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={styles.container} accessible accessibilityLabel="Гаманець із грошима">
      <Animated.View style={[styles.art, { transform: [{ translateY }] }]}>
        <Banknote color="#10B981" style={styles.noteBack} />
        <Banknote color="#34D399" style={styles.noteFront} />

        <View style={styles.wallet}>
          <View style={styles.walletLip} />
          <View style={styles.stitch} />
        </View>
        <View style={styles.strap}>
          <View style={styles.clasp}>
            <View style={styles.claspInner} />
          </View>
        </View>

        <Coin size={40} style={styles.coinBack} />
        <Coin size={58} style={styles.coinFront} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 210,
    alignItems: 'center',
  },
  art: {
    width: 220,
    height: 190,
  },
  note: {
    position: 'absolute',
    width: 132,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  noteSeal: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteSymbol: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '800',
  },
  noteBack: {
    left: 72,
    top: 8,
    transform: [{ rotate: '9deg' }],
  },
  noteFront: {
    left: 26,
    top: 20,
    transform: [{ rotate: '-10deg' }],
  },
  wallet: {
    position: 'absolute',
    left: 10,
    top: 62,
    width: 200,
    height: 118,
    borderRadius: 28,
    backgroundColor: '#7C4A1E',
    overflow: 'hidden',
  },
  // Світліший верх надає гаманцю об'єму
  walletLip: {
    height: 18,
    backgroundColor: '#99602A',
  },
  stitch: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  strap: {
    position: 'absolute',
    left: 132,
    top: 98,
    width: 92,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#5E3714',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 14,
  },
  clasp: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claspInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  coin: {
    position: 'absolute',
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinSymbol: {
    color: '#92400E',
    fontWeight: '800',
    textAlign: 'center',
  },
  coinBack: {
    left: 44,
    top: 150,
  },
  coinFront: {
    left: -4,
    top: 130,
  },
});
