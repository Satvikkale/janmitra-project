import React from 'react';
import {
  Alert,
  SafeAreaView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';

type Props = { onJoined?: () => void };

const COLORS = {
  primary: '#1976D2',
  secondary: '#FFC107',
  background: '#F5F6FA',
  card: '#FFF',
  text: '#222',
  border: '#E0E0E0',
};

export default function JoinSociety({ onJoined }: Props) {
  const { accessToken, register } = useLocalAuth();
  const [societyName, setSocietyName] = React.useState('');
  const [headName, setHeadName] = React.useState('');
  const [headEmail, setHeadEmail] = React.useState('');
  const [headPhone, setHeadPhone] = React.useState('');
  const [headPassword, setHeadPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  async function createSocietyAndRegisterHead() {
    // Validation
    if (!societyName.trim()) {
      Alert.alert('Validation', 'Please enter society name');
      return;
    }
    if (!headName.trim()) {
      Alert.alert('Validation', 'Please enter your name');
      return;
    }
    if (!headEmail.trim() && !headPhone.trim()) {
      Alert.alert('Validation', 'Please enter email or phone number');
      return;
    }
    if (headEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(headEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address');
      return;
    }
    if (!headPassword.trim() || headPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return;
    }
    if (headPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }

    try {
      setCreating(true);
      
      // First register the head user
      const auth = await register({
        name: headName,
        email: headEmail || undefined,
        phone: headPhone || undefined,
        password: headPassword,
      });

      // Then create society
      const society = await apiFetch(
        '/v1/societies',
        auth.accessToken,
        { method: 'POST', body: JSON.stringify({ name: societyName.trim() }) }
      );

      Alert.alert(
        'Society Onboarding Request Submitted!',
        `Society "${society.name}" has been submitted for approval.\n\nYour account is PENDING approval by the platform admin. Once approved, you'll become the society head and can approve member requests.`,
        [{ text: 'OK', onPress: () => onJoined?.() }]
      );
      
      // Clear form
      setSocietyName('');
      setHeadName('');
      setHeadEmail('');
      setHeadPhone('');
      setHeadPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unable to register society');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Society Onboarding</Text>
            <Text style={styles.subtitle}>Register your society as Head</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Society Information</Text>
            
            <Text style={styles.label}>Society Name *</Text>
            <TextInput
              value={societyName}
              onChangeText={setSocietyName}
              placeholder="Enter society name"
              placeholderTextColor="#999"
              style={styles.input}
              editable={!creating}
            />

            <Text style={styles.sectionTitle}>Your Information (Society Head)</Text>
            
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              value={headName}
              onChangeText={setHeadName}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              style={styles.input}
              editable={!creating}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              value={headEmail}
              onChangeText={setHeadEmail}
              placeholder="your.email@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              editable={!creating}
            />

            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              value={headPhone}
              onChangeText={setHeadPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              style={styles.input}
              editable={!creating}
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              value={headPassword}
              onChangeText={setHeadPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#999"
              secureTextEntry
              style={styles.input}
              editable={!creating}
            />

            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor="#999"
              secureTextEntry
              style={styles.input}
              editable={!creating}
            />

            <Text style={styles.hint}>
              ℹ️ Your society and account will be pending until platform admin approves. Once approved, you can manage member requests.
            </Text>

            {creating ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  (!societyName || !headName || !headPassword || headPassword !== confirmPassword)
                    ? styles.buttonDisabled
                    : null,
                ]}
                onPress={createSocietyAndRegisterHead}
                disabled={!societyName || !headName || !headPassword || headPassword !== confirmPassword}
              >
                <Text style={styles.buttonText}>Register Society & Head</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
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
    fontSize: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
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
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    lineHeight: 20,
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
});