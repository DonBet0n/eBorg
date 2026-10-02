import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import authStyles from '../styles/AuthStyles';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAppTheme } from '../contexts/ThemeContext';

const AuthScreen = () => {
  const { auth, db, setUser, getCurrentUser } = useFirebase();
  const { colors, theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

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

      } catch (error) {
        // No active session
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [auth, getCurrentUser, setUser]);

  const validateForm = () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }
    if (!isLogin && (username.length > 36 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(username))) {
      Alert.alert('Error', 'Username must be less than 36 characters and can only contain letters, numbers, period, hyphen, and underscore. Cannot start with special characters.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password);
      const user = await getCurrentUser();
      if (user) {
        router.replace('/(tabs)/HomeScreen');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'Invalid credentials. Please try again.');
      Vibration.vibrate(500);
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const userId = userCredential.user.uid;
      await db().collection('users').doc(userId).set({
        name: username,
        email: email,
        updatedAt: db.FieldValue.serverTimestamp(),
      });
      await handleLogin();
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', 'Failed to register. Please try again.');
      Vibration.vibrate(500);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (isLogin) {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  if (isLoading) {
    return <View style={{flex: 1, backgroundColor: colors.background}} />
  }

  return (
    <SafeAreaView style={[authStyles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.content}
      >
        <View style={authStyles.logoContainer}>
          <Text style={[authStyles.logo, { color: colors.text }]}>eBorg</Text>
          <Text style={[authStyles.subtitle, { color: colors.textSecondary }]}>Manage your debts easily</Text>
        </View>

        <View style={authStyles.formContainer}>
          {!isLogin && (
            <TextInput
              style={[authStyles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor={colors.textSecondary}
            />
          )}
          
          <TextInput
            style={[authStyles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textSecondary}
          />
          
          <TextInput
            style={[authStyles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity 
            style={[authStyles.button, { backgroundColor: colors.buttonBg }]}
            onPress={handleSubmit}
          >
            <Text style={[authStyles.buttonText, { color: colors.buttonText }]}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={authStyles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            {isLogin ? (
              <Text style={[authStyles.switchButtonText, { color: colors.textSecondary }]}>
                Don't have an account? <Text style={[authStyles.switchButtonTextHighlight, { color: colors.text }]}>Sign Up</Text>
              </Text>
            ) : (
              <Text style={[authStyles.switchButtonText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={[authStyles.switchButtonTextHighlight, { color: colors.text }]}>Log In</Text>
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;
