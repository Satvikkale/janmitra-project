import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';

const API_BASE = (Constants.expoConfig?.extra as any).apiBase as string;

const COLORS = {
  primary: '#1976D2',
  secondary: '#FFC107',
  background: '#F5F6FA',
  card: '#FFF',
  text: '#222',
  border: '#E0E0E0',
  error: '#FF3B30',
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
      // Fetch without auth - public endpoint for approved societies
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
    // Validation
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

      // Auto-request join to selected society
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
      // Navigation happens automatically via useLocalAuth context
    } catch (e: any) {
      Alert.alert('Registration Error', e.message || 'Could not register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Join Your Society</Text>
              <Text style={styles.subtitle}>Register as a society resident</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />

              <Text style={styles.label}>Select Your Society *</Text>
              {loadingSocieties ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedSocietyId}
                    onValueChange={(value) => setSelectedSocietyId(value)}
                    enabled={!loading}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Select your society --" value="" />
                    {societies.map((soc) => (
                      <Picker.Item key={soc._id} label={soc.name} value={soc._id} />
                    ))}
                  </Picker>
                </View>
              )}
              <Text style={styles.hint}>
                💡 Don't see your society? Ask your society head to register it first from "Society Onboarding".
              </Text>

              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />

              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />

              {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    (!name || !password || !selectedSocietyId || password !== confirmPassword)
                      ? styles.buttonDisabled
                      : null,
                  ]}
                  onPress={handleRegister}
                  disabled={!name || !password || !selectedSocietyId || password !== confirmPassword}
                >
                  <Text style={styles.buttonText}>Register</Text>
                </TouchableOpacity>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={onNavigateLogin}>
                  <Text style={styles.footerLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  footerLink: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
});
