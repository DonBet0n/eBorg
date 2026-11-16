import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Vibration,
  ScrollView, StyleSheet, ActivityIndicator, Animated, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Icon from '@/components/ui/Icon';
import WelcomeView from '@/components/auth/WelcomeView';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAppTheme } from '../contexts/ThemeContext';

type Mode = 'login' | 'register';
type Field = 'name' | 'email' | 'password';

const MODES: { key: Mode; label: string }[] = [
  { key: 'login', label: 'Вхід' },
  { key: 'register', label: 'Реєстрація' },
];

const SWITCH_PADDING = 4;
const MIN_PASSWORD = 8;
const MAX_NAME = 36;

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
  const { auth, db, setUser, getCurrentUser } = useFirebase();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Спершу вітальний екран, з нього — форма входу або реєстрації
  const [showWelcome, setShowWelcome] = useState(true);
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
  const isLogin = mode === 'login';

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (auth().currentUser) {
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
  }, [auth, getCurrentUser, setUser]);

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: (isLogin ? 0 : 1) * segmentWidth,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [isLogin, segmentWidth, thumbX]);

  // «Назад» на Android із форми повертає на вітальний екран
  useEffect(() => {
    if (showWelcome) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowWelcome(true);
      return true;
    });
    return () => subscription.remove();
  }, [showWelcome]);

  const openForm = (next: Mode) => {
    switchMode(next);
    setShowWelcome(false);
  };

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
    const credential = await auth().signInWithEmailAndPassword(address, password);
    let user = await getCurrentUser();
    if (!user) {
      // Профіль міг не записатися, якщо під час реєстрації обірвався зв'язок: відновлюємо його, щоб акаунт не лишився без доступу
      try {
        await db().collection('users').doc(credential.user.uid).set({
          name: name.trim() || address.split('@')[0].slice(0, MAX_NAME),
          email: address,
          updatedAt: db.FieldValue.serverTimestamp(),
        });
        user = await getCurrentUser();
      } catch (error) {
        await auth().signOut();
        throw error;
      }
    }
    if (user) {
      router.replace('/(tabs)/HomeScreen');
    } else {
      await auth().signOut();
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
        const credential = await auth().createUserWithEmailAndPassword(email.trim(), password);
        await db().collection('users').doc(credential.user.uid).set({
          name: name.trim(),
          email: email.trim(),
          updatedAt: db.FieldValue.serverTimestamp(),
        });
      }
      await signIn();
    } catch (error: any) {
      console.error(isLogin ? 'Login error:' : 'Registration error:', error);
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
      await auth().sendPasswordResetEmail(address);
      setFormError(null);
      Alert.alert('Перевірте пошту', `Ми надіслали посилання для зміни пароля на ${address}`);
    } catch (error: any) {
      console.error('Password reset error:', error);
      fail(authErrorMessage(error?.code, 'login'));
    }
  };

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (showWelcome) {
    return <WelcomeView onStart={() => openForm('register')} onLogin={() => openForm('login')} />;
  }

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
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.back, { backgroundColor: surface }]}
            onPress={() => setShowWelcome(true)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <Icon name="arrow-forward" size={20} color={colors.icon} style={styles.backIcon} />
          </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  // Знак «E» окремо, під ним назва
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
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
    fontSize: 15,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  modeTextSelected: {
    fontSize: 15,
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
    minHeight: 56,
    borderRadius: 999,
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
