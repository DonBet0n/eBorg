import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon, { IconName } from '@/components/ui/Icon';
import { useAppTheme } from '../../contexts/ThemeContext';
import { appStyles } from '@/utils/appStyles';
import { BUTTON } from '@/constants/Theme';

// Діалог у стилі застосунку замість системного Alert.alert. API той самий:
// appAlert('Заголовок', 'Текст', [{ text: 'Скасувати', style: 'cancel' }, { text: 'Видалити', style: 'destructive', onPress }])

export interface AppDialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AppDialogButton[];
}

const queue: DialogRequest[] = [];
let nextId = 0;
let notifyHost: (() => void) | null = null;

export function appAlert(title: string, message?: string, buttons?: AppDialogButton[]) {
  queue.push({
    id: nextId++,
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
  });
  notifyHost?.();
}

const OPEN_MS = 200;
const CLOSE_MS = 150;

// Значок над заголовком підказує, що це за діалог
const iconFor = (request: DialogRequest): { name: IconName; tone: 'negative' | 'neutral' } | null => {
  const text = `${request.title} ${request.message ?? ''}`;
  if (/помилка|не вдалося|немає підключення/i.test(text)) return { name: 'alert', tone: 'negative' };
  // Діалог-вибір (кілька дій) значка не має, навіть якщо одна з дій небезпечна
  if (request.buttons.length > 2) return null;
  if (request.buttons.some(button => button.style === 'destructive')) return { name: 'alert', tone: 'negative' };
  if (/успіх|перевірте пошту/i.test(text)) return { name: 'success', tone: 'neutral' };
  return null;
};

// Малює діалоги поверх усього (і поверх шторок). Ставиться один раз у кореневому layout
export function AppDialogHost() {
  const { colors, isDark } = useAppTheme();
  const [current, setCurrent] = useState<DialogRequest | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const closing = useRef(false);

  const showNext = useCallback(() => {
    setCurrent(prev => prev ?? queue.shift() ?? null);
  }, []);

  useEffect(() => {
    notifyHost = showNext;
    showNext();
    return () => {
      if (notifyHost === showNext) notifyHost = null;
    };
  }, [showNext]);

  useEffect(() => {
    if (!current) return;
    closing.current = false;
    opacity.setValue(0);
    scale.setValue(0.94);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: OPEN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [current, opacity, scale]);

  const close = useCallback((button?: AppDialogButton) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.96, duration: CLOSE_MS, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(queue.shift() ?? null);
      // Дія кнопки — після закриття: вона може сама відкрити новий діалог
      button?.onPress?.();
    });
  }, [opacity, scale]);

  const cancelButton = current?.buttons.find(button => button.style === 'cancel');
  // Тап поза діалогом і «Назад» працюють як «Скасувати»; без такої кнопки — як єдина кнопка «OK»
  const dismiss = useCallback(() => {
    if (!current) return;
    if (cancelButton) close(cancelButton);
    else if (current.buttons.length === 1) close(current.buttons[0]);
  }, [current, cancelButton, close]);

  useEffect(() => {
    if (!current) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [current, dismiss]);

  if (!current) return null;

  const icon = iconFor(current);
  const surface = isDark ? colors.card : colors.background;
  const neutralButton = colors.cardAlt;
  // Дві кнопки — в рядок (скасування зліва), більше — стовпчиком, скасування внизу
  const ordered = [
    ...current.buttons.filter(button => button.style !== 'cancel'),
    ...current.buttons.filter(button => button.style === 'cancel'),
  ];
  const inRow = ordered.length === 2;
  const buttons = inRow ? [...ordered].reverse() : ordered;

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Закрити" />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[styles.card, { backgroundColor: surface, opacity, transform: [{ scale }] }]}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          {icon && (
            <View style={[styles.iconCircle, { backgroundColor: icon.tone === 'negative' ? colors.negativeBg : colors.cardAlt }]}>
              <Icon name={icon.name} size={24} color={icon.tone === 'negative' ? colors.negativeText : colors.icon} />
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
          {!!current.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{current.message}</Text>
          )}
          <View style={inRow ? styles.buttonsRow : styles.buttonsColumn}>
            {buttons.map(button => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              // Головна дія — суцільна кнопка; скасування — нейтральна; небезпечна — червона
              const background = destructive ? colors.negativeBg : cancel ? neutralButton : colors.buttonBg;
              const color = destructive ? colors.negativeText : cancel ? colors.text : colors.buttonText;
              return (
                <TouchableOpacity
                  key={button.text}
                  style={[styles.button, inRow && styles.buttonInRow, { backgroundColor: background }]}
                  onPress={() => close(button)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.buttonText, { color }]} numberOfLines={1}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = appStyles({
  // Вище за шар шторок (SheetHost: zIndex/elevation 1000)
  layer: {
    zIndex: 2000,
    elevation: 2000,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 22,
  },
  buttonsColumn: {
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 22,
  },
  button: {
    minHeight: BUTTON.height,
    paddingHorizontal: 16,
    borderRadius: BUTTON.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInRow: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
});
