import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import authStyles from '../styles/AuthStyles';
import { useFirebase } from '../contexts/FirebaseContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const AuthScreen = () => {
  const { auth, db, setUser, getCurrentUser } = useFirebase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. Якщо є активний користувач у Firebase - підтягуємо з Firestore
        if (auth.currentUser) {
          const user = await getCurrentUser();
          if (user) {
            setUser(user);
            router.replace('/(tabs)/HomeScreen');
            return;
          }
        }
        // 2. Якщо є кешований користувач - піднімаємо з кешу
        const cachedUser = await AsyncStorage.getItem('cachedUser');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          router.replace('/(tabs)/HomeScreen');
          return;
        }
      } catch (error) {
        console.log('No active session');
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
      await signInWithEmailAndPassword(auth, email, password);
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      await setDoc(doc(db, 'users', userId), {
        name: username,
        email: email,
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
    return <View style={{flex: 1, backgroundColor: '#fff'}} />
  }

  return (
    <SafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.content}
      >
        <View style={authStyles.logoContainer}>
          <Text style={authStyles.logo}>eBorg</Text>
          <Text style={authStyles.subtitle}>Manage your debts easily</Text>
        </View>

        <View style={authStyles.formContainer}>
          {!isLogin && (
            <TextInput
              style={authStyles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#666"
            />
          )}
          
          <TextInput
            style={authStyles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#666"
          />
          
          <TextInput
            style={authStyles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#666"
          />

          <TouchableOpacity 
            style={authStyles.button}
            onPress={handleSubmit}
          >
            <Text style={authStyles.buttonText}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={authStyles.button}
            onPress={() => router.replace('/(tabs)/HomeScreen')}>
            <Text style={authStyles.buttonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={authStyles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            {isLogin ? (
              <Text style={authStyles.switchButtonText}>
                Don't have an account? <Text style={authStyles.switchButtonTextHighlight}>Sign Up</Text>
              </Text>
            ) : (
              <Text style={authStyles.switchButtonText}>
                Already have an account? <Text style={authStyles.switchButtonTextHighlight}>Log In</Text>
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;
