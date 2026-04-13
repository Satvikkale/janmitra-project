import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';

const API_BASE = (Constants.expoConfig?.extra as any).apiBase as string;

const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#F59E0B',
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  inputBg: '#F9FAFB',
};

export default function RegisterUser({ onNavigateLogin }: { onNavigateLogin?: () => void }) {
  const { register } = useLocalAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedSocietyId, setSelectedSocietyId] = useState('');
  const [societies, setSocieties] = useState<any[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApprovedSocieties();
  }, []);

  const fetchApprovedSocieties = async () => {
    try {
      setLoadingSocieties(true);
      console.log('Fetching societies from:', `${API_BASE}/v1/societies`);
      const response = await fetch(`${API_BASE}/v1/societies`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch societies: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Societies fetched:', data);
      setSocieties(data || []);
    } catch (err: any) {
      console.error('Failed to fetch societies:', err);
      Alert.alert('Notice', `Could not load societies list: ${err.message}`);
    } finally {
      setLoadingSocieties(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      Alert.alert('Validation Error', 'Please enter email or phone number');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }
    if (!selectedSocietyId) {
      Alert.alert('Validation Error', 'Please select your society');
      return;
    }

    setLoading(true);
    try {
      const auth = await register({
        name,
        email: email || undefined,
        phone: phone || undefined,
        password,
      });

      if (selectedSocietyId) {
        try {
          const society = societies.find(s => s._id === selectedSocietyId);
          await apiFetch(
            `/v1/societies/${selectedSocietyId}/join`,
            auth.accessToken,
            { method: 'POST' }
          );
          Alert.alert(
            'Registration Successful!',
            `Welcome ${name}! Your request to join "${society?.name || 'society'}" has been sent.\n\nYour account is PENDING approval by your society head. You'll be able to login once approved.`,
            [{ text: 'OK', onPress: () => onNavigateLogin?.() }]
          );
        } catch (err: any) {
          Alert.alert(
            'Join Error',
            `Registration successful, but couldn't request to join society: ${err.message || 'Unknown error'}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (e: any) {
      Alert.alert('Registration Error', e.message || 'Could not register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && (email.trim() || phone.trim()) && 
    password.trim() && password.length >= 6 && 
    password === confirmPassword && selectedSocietyId;

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
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🏠</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join your society community</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.formSection}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number <Text style={styles.optional}>(Optional)</Text></Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Society Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Your Society</Text>
                {loadingSocieties ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading societies...</Text>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedSocietyId}
                      onValueChange={(value) => setSelectedSocietyId(value)}
                      enabled={!loading}
                      style={styles.picker}
                    >
                      <Picker.Item label="🏘️  Choose your society" value="" />
                      {societies.map((soc) => (
                        <Picker.Item key={soc._id} label={`🏢 ${soc.name}`} value={soc._id} />
                      ))}
                    </Picker>
                  </View>
                )}
                <Text style={styles.hint}>
                  💡 Don't see your society? Ask your society head to register it first.
                </Text>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔐</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorText}>⚠️ Passwords do not match</Text>
                )}
              </View>

              {/* Register Button */}
              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loaderText}>Creating your account...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    !isFormValid && styles.buttonDisabled
                  ]}
                  onPress={handleRegister}
                  disabled={!isFormValid}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Login Link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={onNavigateLogin} activeOpacity={0.7}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our Terms of Service
          </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  logoContainer: {
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
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  formSection: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
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
  pickerContainer: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: {
    height: 56,
    width: '100%',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textLight,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 10,
    marginLeft: 4,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 10,
    fontWeight: '600',
  },
  loaderContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  footerLink: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 20,
  },
});
