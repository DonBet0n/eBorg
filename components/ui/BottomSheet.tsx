import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Animated, PanResponder, Platform, BackHandler } from 'react-native';
import Icon from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSheetHost } from './SheetHost';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Наскільки потягнути вниз (або як швидко змахнути), щоб шторка закрилась
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 1;
const FADE_MS = 180;

let nextSheetId = 0;

// Спільна оболонка для вікон, що виїжджають знизу: затемнення, заголовок і кнопка закриття.
// Малюється через SheetHost поверх застосунку, а не в RN Modal (див. SheetHost)
const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, title, children }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const host = useSheetHost();
  const key = useRef(`sheet-${nextSheetId++}`).current;
  // Лишається змонтованою, поки дограває анімація закриття
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, opacity, translateY]);

  // Кнопка «Назад» на Android закриває шторку, а не екран під нею
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [visible]);

  // Жест живе на смужці й заголовку, а не на всій шторці, щоб не заважати прокрутці вмісту
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
        Animated.timing(translateY, {
          toValue: sheetHeight.current || 600,
          duration: 180,
          useNativeDriver: true,
        }).start(() => onCloseRef.current());
      } else {
        Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
    },
  })).current;

  const content = (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      {/* На iOS шторку над клавіатурою піднімає KeyboardAvoidingView. На Android вікно саме зсувається до поля
          у фокусі (adjustPan); власний зсув чи перебудова розмітки тут подвоювали підйом або збивали фокус */}
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрити" />
        <Animated.View
          style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}
          onLayout={e => { sheetHeight.current = e.nativeEvent.layout.height; }}
        >
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: colors.cardAlt }]}
                accessibilityRole="button"
                accessibilityLabel="Закрити"
              >
                <Icon name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </View>
          {children}
          {/* Продовження фону нижче краю шторки: поки клавіатура виїжджає, знизу не просвічує екран */}
          <View pointerEvents="none" style={[styles.below, { backgroundColor: colors.background }]} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  // Вміст оновлюється в SheetHost після кожного рендеру, щоб шторка бачила свіжі дані.
  // useLayoutEffect — щоб оновлення встигло до відмальовки (інакше поля вводу відставали б на кадр)
  useLayoutEffect(() => {
    if (mounted) host.mount(key, content);
    else host.unmount(key);
  });

  useEffect(() => () => host.unmount(key), [host, key]);

  return null;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  below: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    height: 1000,
  },
  // Верхній відступ шторки перенесено сюди, щоб за смужку було зручно вхопитись
  dragArea: {
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    marginRight: 12,
    fontSize: 22,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BottomSheet;
