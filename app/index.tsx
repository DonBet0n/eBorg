import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Vibration,
  ScrollView, ActivityIndicator, Animated, Image, Pressable, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Icon from '@/components/ui/Icon';
import AuthBackdrop from '@/components/auth/AuthBackdrop';
import CoinBurst from '@/components/auth/CoinBurst';
import { useFirebase } from '../contexts/FirebaseContext';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
} from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useAppTheme } from '../contexts/ThemeContext';
import { appStyles } from '@/utils/appStyles';
import { appAlert } from '@/components/ui/AppDialog';
import { BUTTON } from '@/constants/Theme';

type Mode = 'login' | 'register';
type Field = 'name' | 'email' | 'password';

const MODES: { key: Mode; label: string }[] = [
  { key: 'login', label: 'Вхід' },
  { key: 'register', label: 'Реєстрація' },
];

const SWITCH_PADDING = 4;
const MIN_PASSWORD = 8;
const MAX_NAME = 36;

// Очікувані помилки (неправильний пароль, зайнята пошта тощо) показуємо людині, але не пишемо в консоль як збій
const KNOWN_AUTH_ERRORS = [
  'auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/email-already-in-use',
  'auth/invalid-email', 'auth/weak-password', 'auth/too-many-requests', 'auth/network-request-failed',
];

// Зрозумілі повідомлення замість технічних кодів Firebase
const authErrorMessage = (code: string | undefined, mode: Mode) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неправильна пошта або пароль';
    case 'auth/email-already-in-use':
      return 'Ця пошта вже зареєстрована. Спробуйте увійти';
    case 'auth/invalid-email':
      return 'Перевірте адресу пошти';
    case 'auth/weak-password':
      return 'Пароль занадто простий';
    case 'auth/too-many-requests':
      return 'Забагато спроб. Зачекайте трохи й спробуйте знову';
    case 'auth/network-request-failed':
      return 'Немає з\'єднання з Інтернетом';
    default:
      return mode === 'login' ? 'Не вдалося увійти. Спробуйте ще раз' : 'Не вдалося зареєструватися. Спробуйте ще раз';
  }
};

const AuthScreen = () => {
  const { setUser, getCurrentUser } = useFirebase();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  // Помилки полів показуємо лише після першої спроби надіслати, щоб не сварити під час введення
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [segmentWidth, setSegmentWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;

  // Пасхалка: три швидкі тапи по іконці — іконка робить сальто, а з неї сиплються монети
  const iconRef = useRef<View>(null);
  const iconSpin = useRef(new Animated.Value(0)).current;
  const taps = useRef<number[]>([]);
  const [burst, setBurst] = useState({ count: 0, origin: { x: 0, y: 0 } });

  const handleIconTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter(time => now - time < 700), now];
    if (taps.current.length < 3) return;
    taps.current = [];
    Vibration.vibrate(30);
    iconSpin.setValue(0);
    Animated.timing(iconSpin, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }).start();
    iconRef.current?.measureInWindow((x, y, width, height) => {
      setBurst(prev => ({ count: prev.count + 1, origin: { x: x + width / 2, y: y + height / 2 } }));
    });
  };
  const iconTransform = [
    { rotate: iconSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    { scale: iconSpin.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.18, 1] }) },
  ];
  const isLogin = mode === 'login';

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (getAuth().currentUser) {
          const user = await getCurrentUser();
          if (user) {
            setUser(user);
            router.replace('/(tabs)/HomeScreen');
            return;
          }
        }
      } catch {
        // Немає активної сесії
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [getCurrentUser, setUser]);

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: (isLogin ? 0 : 1) * segmentWidth,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [isLogin, segmentWidth, thumbX]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
    setFormError(null);
  };

  const errors: Partial<Record<Field, string>> = {};
  if (!isLogin) {
    if (!name.trim()) errors.name = 'Вкажіть ім\'я';
    else if (name.trim().length > MAX_NAME) errors.name = `Не довше ${MAX_NAME} символів`;
  }
  if (!email.trim()) errors.email = 'Вкажіть пошту';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Перевірте адресу пошти';
  if (!password) errors.password = 'Вкажіть пароль';
  else if (password.length < MIN_PASSWORD) errors.password = `Щонайменше ${MIN_PASSWORD} символів`;
  const hasErrors = Object.keys(errors).length > 0;

  const fail = (message: string) => {
    setFormError(message);
    Vibration.vibrate(200);
  };

  const signIn = async () => {
    const address = email.trim();
    const credential = await signInWithEmailAndPassword(getAuth(), address, password);
    let user = await getCurrentUser();
    if (!user) {
      // Профіль міг не записатися, якщо під час реєстрації обірвався зв'язок: відновлюємо його, щоб акаунт не лишився без доступу
      try {
        await setDoc(doc(getFirestore(), 'users', credential.user.uid), {
          name: name.trim() || address.split('@')[0].slice(0, MAX_NAME),
          email: address,
          updatedAt: serverTimestamp(),
        });
        user = await getCurrentUser();
      } catch (error) {
        await signOut(getAuth());
        throw error;
      }
    }
    if (user) {
      router.replace('/(tabs)/HomeScreen');
    } else {
      await signOut(getAuth());
      fail('Не вдалося завантажити профіль. Спробуйте ще раз');
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setFormError(null);
    if (hasErrors || isSubmitting) {
      if (hasErrors) Vibration.vibrate(200);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isLogin) {
        const credential = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
        await setDoc(doc(getFirestore(), 'users', credential.user.uid), {
          name: name.trim(),
          email: email.trim(),
          updatedAt: serverTimestamp(),
        });
      }
      await signIn();
    } catch (error: any) {
      if (!KNOWN_AUTH_ERRORS.includes(error?.code)) console.error(isLogin ? 'Login error:' : 'Registration error:', error);
      fail(authErrorMessage(error?.code, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setSubmitted(true);
      emailRef.current?.focus();
      fail('Введіть пошту, і ми надішлемо посилання для зміни пароля');
      return;
    }
    try {
      await sendPasswordResetEmail(getAuth(), address);
      setFormError(null);
      appAlert('Перевірте пошту', `Ми надіслали посилання для зміни пароля на ${address}`);
    } catch (error: any) {
      if (!KNOWN_AUTH_ERRORS.includes(error?.code)) console.error('Password reset error:', error);
      fail(authErrorMessage(error?.code, 'login'));
    }
  };

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Суцільні поля: фактура фону не просвічує крізь текст і кнопки
  const surface = isDark ? colors.card : colors.cardAlt;
  const fieldError = (field: Field) => (submitted ? errors[field] : undefined);
  const borderFor = (field: Field) =>
    fieldError(field) ? colors.negativeText : focused === field ? colors.text : 'transparent';

  const renderField = (
    field: Field,
    label: string,
    input: React.ComponentProps<typeof TextInput> & { ref?: React.Ref<TextInput> },
    trailing?: React.ReactNode,
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: surface, borderColor: borderFor(field) }]}>
        <TextInput
          {...input}
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setFocused(field)}
          onBlur={() => setFocused(null)}
          editable={!isSubmitting}
          accessibilityLabel={label}
        />
        {trailing}
      </View>
      {!!fieldError(field) && (
        <Text style={[styles.fieldError, { color: colors.negativeText }]}>{fieldError(field)}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthBackdrop isDark={isDark} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Pressable onPress={handleIconTap} accessible={false}>
              <Animated.View ref={iconRef} style={{ transform: iconTransform }}>
                <Image source={require('../assets/images/icon.png')} style={[styles.brandIcon, { borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'transparent' }]} />
              </Animated.View>
            </Pressable>
            <Text style={[styles.brandName, { color: colors.text }]}>eBorg</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {isLogin ? 'З поверненням' : 'Створіть акаунт'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isLogin ? 'Увійдіть, щоб побачити свої борги' : 'Записуйте борги й діліть чеки з друзями'}
          </Text>

          <View
            style={[styles.modeSwitch, { backgroundColor: surface }]}
            accessibilityRole="tablist"
            onLayout={e => {
              const { width } = e.nativeEvent.layout;
              if (width > 0) setSegmentWidth((width - SWITCH_PADDING * 2) / MODES.length);
            }}
          >
            {segmentWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[styles.modeThumb, { width: segmentWidth, backgroundColor: colors.text, transform: [{ translateX: thumbX }] }]}
              />
            )}
            {MODES.map(item => {
              const selected = mode === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.modeButton}
                  onPress={() => switchMode(item.key)}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text style={[selected ? styles.modeTextSelected : styles.modeText, { color: selected ? colors.background : colors.textSecondary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!isLogin && renderField('name', 'Ім\'я', {
            placeholder: 'Як вас називати',
            value: name,
            onChangeText: setName,
            autoCapitalize: 'words',
            autoComplete: 'name',
            textContentType: 'name',
            returnKeyType: 'next',
            onSubmitEditing: () => emailRef.current?.focus(),
            submitBehavior: 'submit',
          })}

          {renderField('email', 'Пошта', {
            ref: emailRef,
            placeholder: 'name@example.com',
            value: email,
            onChangeText: setEmail,
            keyboardType: 'email-address',
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'email',
            textContentType: 'emailAddress',
            returnKeyType: 'next',
            onSubmitEditing: () => passwordRef.current?.focus(),
            submitBehavior: 'submit',
          })}

          {renderField('password', 'Пароль', {
            ref: passwordRef,
            placeholder: isLogin ? 'Ваш пароль' : `Щонайменше ${MIN_PASSWORD} символів`,
            value: password,
            onChangeText: setPassword,
            secureTextEntry: !showPassword,
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: isLogin ? 'current-password' : 'new-password',
            textContentType: isLogin ? 'password' : 'newPassword',
            returnKeyType: 'go',
            onSubmitEditing: handleSubmit,
          }, (
            <TouchableOpacity
              onPress={() => setShowPassword(value => !value)}
              style={styles.eyeButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Сховати пароль' : 'Показати пароль'}
            >
              <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.iconSecondary} />
            </TouchableOpacity>
          ))}

          {isLogin && (
            <TouchableOpacity style={styles.forgot} onPress={handleForgotPassword} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.forgotText, { color: colors.textSecondary }]}>Забули пароль?</Text>
            </TouchableOpacity>
          )}

          {!!formError && (
            <View style={[styles.formError, { backgroundColor: colors.negativeBg }]} accessibilityLiveRegion="polite">
              <Icon name="alert" size={18} color={colors.negativeText} />
              <Text style={[styles.formErrorText, { color: colors.negativeText }]}>{formError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submit, { backgroundColor: colors.text }, isSubmitting && styles.submitBusy]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={[styles.submitText, { color: colors.background }]}>
                  {isLogin ? 'Увійти' : 'Створити акаунт'}
                </Text>
                <Icon name="arrow-forward" size={18} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <CoinBurst trigger={burst.count} origin={burst.origin} />
    </View>
  );
};

const styles = appStyles({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 40,
  },
  brandIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    borderWidth: 1,
  },
  brandName: {
    fontSize: 28,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 8,
    marginBottom: 32,
  },
  modeSwitch: {
    flexDirection: 'row',
    padding: SWITCH_PADDING,
    borderRadius: 999,
    marginBottom: 24,
  },
  // Повзунок лежить під текстом сегментів і їде до вибраного
  modeThumb: {
    position: 'absolute',
    top: SWITCH_PADDING,
    bottom: SWITCH_PADDING,
    left: SWITCH_PADDING,
    borderRadius: 999,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeText: {
    fontSize: 16,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  modeTextSelected: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginBottom: 8,
    marginLeft: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
  // Висота з вертикальних відступів, а не з minHeight і центрування: Android зсуває екран над клавіатурою
  // до нижнього краю відступу, тож поле видно повністю
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  eyeButton: {
    paddingLeft: 12,
  },
  fieldError: {
    fontSize: 13,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 6,
    marginLeft: 4,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  formErrorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  submit: {
    flexDirection: 'row',
    gap: 8,
    minHeight: BUTTON.height,
    borderRadius: BUTTON.radius,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBusy: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
});

export default AuthScreen;
