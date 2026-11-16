import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import WalletIllustration from './WalletIllustration';
import AnimatedBackdrop from './AnimatedBackdrop';

interface WelcomeViewProps {
  onStart: () => void;
  onLogin: () => void;
}

// Вітальний екран завжди темний, незалежно від теми: це «обкладинка» застосунку
const BG = '#09090B';
// Монохром, як у решті застосунку: виділене слово біле, решта приглушена
const MUTED = 'rgba(250, 250, 250, 0.6)';

export default function WelcomeView({ onStart, onLogin }: WelcomeViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <AnimatedBackdrop />

      <View style={styles.hero}>
        <WalletIllustration />

        <Text style={styles.wordmark}>eBorg</Text>

        <Text style={styles.tagline}>
          Борги між <Text style={styles.taglineAccent}>друзями</Text>
          {'\n'}без незручностей.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={onStart} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.primaryText}>Почати</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={onLogin} hitSlop={8} accessibilityRole="button">
          <Text style={styles.secondaryText}>
            Вже маєте акаунт? <Text style={styles.secondaryLink}>Увійти</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    color: '#FAFAFA',
    fontSize: 40,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    marginTop: 28,
  },
  tagline: {
    color: MUTED,
    fontSize: 24,
    lineHeight: 34,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 20,
  },
  taglineAccent: {
    color: '#FAFAFA',
  },
  actions: {
    gap: 8,
  },
  primary: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    color: BG,
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryText: {
    color: 'rgba(250, 250, 250, 0.7)',
    fontSize: 14,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  secondaryLink: {
    color: '#FAFAFA',
    fontFamily: 'NunitoSansBold',
    textDecorationLine: 'underline',
  },
});
