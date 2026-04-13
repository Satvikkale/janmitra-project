import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalAuth } from '../auth/useLocalAuth';

import logo from '../../assets/JanMitra-logo.jpg';


const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#10B981',
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  inputBg: '#F9FAFB',
};

export default function Login({ onNavigateRegister }: { onNavigateRegister?: () => void }) {
  const { login } = useLocalAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert('Validation Error', 'Please enter email or phone');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await login(identifier, password);
    } catch (e: any) {
      Alert.alert('Login Error', e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = identifier.trim() && password.trim() && password.length >= 6;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Brand Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoImage}>
              <Image source={logo} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.appName}>JanMitra</Text>
            <Text style={styles.tagline}>Your trusted companion</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.instructionText}>Sign in to continue</Text>

            <View style={styles.form}>
              {/* Email/Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email or Phone</Text>
                <View style={[styles.inputWrapper, !identifier.trim() && styles.inputInactive]}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email or phone number"
                    placeholderTextColor="#9CA3AF"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrapper, !password.trim() && styles.inputInactive]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Login Button */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.card} />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.button, !isFormValid && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={!isFormValid}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </TouchableOpacity>
              )}

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onNavigateRegister} activeOpacity={0.7}>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bottom decorative element */}
          <View style={styles.bottomDecoration}>
            <Text style={styles.decorativeText}>© 2024 JanMitra. All rights reserved.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  inputInactive: {
    borderColor: COLORS.border,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#FFF',
    fontSize: 20,
    marginLeft: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  footerLink: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '700',
  },
  bottomDecoration: {
    alignItems: 'center',
    marginTop: 32,
  },
  decorativeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
