import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Vibration, useWindowDimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/ui/Icon';

export const isReceiptUrl = (data: string) => data.includes('cabinet.tax.gov.ua/cashregs/check');

interface ReceiptCameraProps {
  onClose: () => void;
  onReceipt: (url: string) => void;
}

type ScanState = 'idle' | 'wrong' | 'found';

const DIM = 'rgba(0, 0, 0, 0.6)';
const CORNER = 28;
const CORNER_WIDTH = 4;
const STATE_COLORS: Record<ScanState, string> = {
  idle: '#FFFFFF',
  wrong: '#FF6B6B',
  found: '#4CD964',
};
// Скільки показувати підказку про «чужий» QR-код і скільки чекати після успіху перед переходом
const WRONG_HINT_MS = 2500;
const FOUND_DELAY_MS = 450;

// Повноекранна камера: прорізане вікно сканування, ліхтарик і миттєвий відгук на кожен знайдений код
const ReceiptCamera: React.FC<ReceiptCameraProps> = ({ onClose, onReceipt }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const boxSize = Math.min(width * 0.72, 300);
  const [torch, setTorch] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const scanLine = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const lockedRef = useRef(false);
  // Камера шле десятки подій за секунду, тому стан «чужого» коду тримаємо в ref, а не чекаємо ререндеру
  const wrongRef = useRef(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>();
  const foundTimer = useRef<ReturnType<typeof setTimeout>>();

  // Лінія, що бігає рамкою, показує, що сканування триває само собою
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      clearTimeout(wrongTimer.current);
      clearTimeout(foundTimer.current);
    };
  }, [scanLine]);

  const showWrong = () => {
    if (wrongRef.current) return;
    wrongRef.current = true;
    setScanState('wrong');
    Vibration.vibrate(30);
    Animated.timing(hintOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => {
      Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      wrongRef.current = false;
      setScanState('idle');
    }, WRONG_HINT_MS);
  };

  const handleScanned = ({ data }: { data: string }) => {
    if (lockedRef.current) return;
    if (!isReceiptUrl(data)) {
      showWrong();
      return;
    }
    lockedRef.current = true;
    clearTimeout(wrongTimer.current);
    hintOpacity.setValue(0);
    setScanState('found');
    Vibration.vibrate(60);
    foundTimer.current = setTimeout(() => onReceipt(data), FOUND_DELAY_MS);
  };

  const accent = STATE_COLORS[scanState];
  const lineY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [12, boxSize - 14] });

  const corner = (position: object) => (
    <View style={[styles.corner, position, { borderColor: accent }]} />
  );

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScanned}
      />

      {/* Затемнення з прорізаним вікном: рамка лишається світлою, все навколо — приглушене */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.dim, styles.flex]} />
        <View style={{ flexDirection: 'row', height: boxSize }}>
          <View style={[styles.dim, styles.flex]} />
          <View style={{ width: boxSize, height: boxSize }}>
            {corner({ top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 20 })}
            {corner({ top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 20 })}
            {corner({ bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 20 })}
            {corner({ bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 20 })}
            {scanState === 'found' ? (
              <View style={styles.foundBadge}>
                <Icon name="success" size={56} color={accent} />
              </View>
            ) : (
              <Animated.View style={[styles.scanLine, { backgroundColor: accent, transform: [{ translateY: lineY }] }]} />
            )}
          </View>
          <View style={[styles.dim, styles.flex]} />
        </View>
        <View style={[styles.dim, styles.flex, styles.bottomArea]}>
          <Text style={styles.title}>
            {scanState === 'found' ? 'Чек знайдено' : 'Наведіть на QR-код чека'}
          </Text>
          <Text style={styles.subtitle}>
            {scanState === 'found'
              ? 'Завантажуємо позиції…'
              : 'Код зазвичай надрукований унизу фіскального чека. Сканування відбудеться автоматично.'}
          </Text>
          <Animated.View style={[styles.wrongHint, { opacity: hintOpacity }]}>
            <Icon name="alert" size={18} color="#fff" />
            <Text style={styles.wrongHintText}>Це не QR-код фіскального чека</Text>
          </Animated.View>
        </View>
      </View>

      {/* Верхня панель поверх камери */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрити сканер"
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Сканер чеків</Text>
        <TouchableOpacity
          style={[styles.roundButton, torch && styles.roundButtonActive]}
          onPress={() => setTorch(value => !value)}
          accessibilityRole="switch"
          accessibilityState={{ checked: torch }}
          accessibilityLabel="Ліхтарик"
        >
          <Icon name={torch ? 'flashlight' : 'flashlight-off'} size={22} color={torch ? '#000' : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  dim: {
    backgroundColor: DIM,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
  },
  foundBadge: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomArea: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 28,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  wrongHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(198, 40, 40, 0.9)',
  },
  wrongHintText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundButtonActive: {
    backgroundColor: '#fff',
  },
});

export default ReceiptCamera;
