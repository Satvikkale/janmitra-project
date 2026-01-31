import React, { useState, useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, Text, View, Alert, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useLocalAuth } from './src/auth/useLocalAuth';
import { apiFetch } from './src/api';
import JoinSociety from './src/screens/JoinSociety';
import HeadPending from './src/screens/HeadPending';
import ResidentDashboard from './src/screens/ResidentDashboard';
import Landing from './src/screens/Landing';
import Login from './src/screens/Login';
import RegisterUser from './src/screens/RegisterUser';

const COLORS = {
  primary: '#1976D2',
  secondary: '#FFC107',
  background: '#F5F6FA',
  card: '#FFF',
  text: '#222',
  border: '#E0E0E0',
};

function CustomButton({ title, onPress, disabled }: { title: string, onPress: () => void, disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? COLORS.border : COLORS.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 6,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}>
      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{title}</Text>
    </TouchableOpacity>
  );
}

type Membership = { _id: string; societyId: string; role: 'resident'|'society_head'; status: string; society?: any };

function MainApp() {
  const { user, accessToken } = useLocalAuth();
  const [currentScreen, setCurrentScreen] = useState<'Landing' | 'Login' | 'RegisterUser' | 'RegisterSociety'>('Landing');
  const [navigationStack, setNavigationStack] = useState<string[]>(['Landing']);

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationStack.length <= 1) {
        // At root screen, exit app
        return false;
      } else {
        // Go back in navigation stack
        handleBack();
        return true;
      }
    });

    return () => backHandler.remove();
  }, [navigationStack]);

  // If user is authenticated, show the authed app
  if (user && accessToken) {
    return <AuthedApp />;
  }

  // Otherwise show landing/login/register flow
  const handleNavigate = (route: 'Login' | 'RegisterUser' | 'RegisterSociety') => {
    setCurrentScreen(route);
    setNavigationStack(prev => [...prev, route]);
  };

  const handleBack = () => {
    if (navigationStack.length > 1) {
      const newStack = [...navigationStack];
      newStack.pop();
      const previousScreen = newStack.at(-1) as any;
      setNavigationStack(newStack);
      setCurrentScreen(previousScreen);
    }
  };

  const handleBackToLanding = () => {
    setCurrentScreen('Landing');
    setNavigationStack(['Landing']);
  };

  return (
    <>
      {currentScreen === 'Landing' && <Landing onNavigate={handleNavigate} />}
      {currentScreen === 'Login' && (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card }}>
            <TouchableOpacity onPress={handleBack}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: COLORS.primary, fontSize: 16 }}>Back</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Login onNavigateRegister={() => handleNavigate('RegisterUser')} />
        </SafeAreaView>
      )}
      {currentScreen === 'RegisterUser' && (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card }}>
            <TouchableOpacity onPress={handleBack}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: COLORS.primary, fontSize: 16 }}>Back</Text>
              </View>
            </TouchableOpacity>
          </View>
          <RegisterUser onNavigateLogin={() => handleNavigate('Login')} />
        </SafeAreaView>
      )}
      {currentScreen === 'RegisterSociety' && (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card }}>
            <TouchableOpacity onPress={handleBack}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: COLORS.primary, fontSize: 16 }}>Back</Text>
              </View>
            </TouchableOpacity>
          </View>
          <JoinSociety onJoined={() => {
            Alert.alert('Success', 'Society registered successfully! Waiting for platform admin approval.', [
              { text: 'OK', onPress: handleBackToLanding }
            ]);
          }} />
        </SafeAreaView>
      )}
    </>
  );
}

function AuthedApp() {
  const { user, accessToken, logout } = useLocalAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMemberships = async () => {
    if (!accessToken) return;
    try {
      const data = await apiFetch('/v1/societies/my-memberships', accessToken);
      setMemberships(data || []);
    } catch (err) {
      console.error('load memberships', err);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMemberships(); }, [accessToken]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 8 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const approved = memberships.filter((m) => m.status === 'approved' && (!m.society?.status || m.society?.status === 'approved'));
  const pending = memberships.filter((m) => m.status === 'pending' || m.society?.status === 'pending');
  const isHead = approved.some((m) => m.role === 'society_head');

  // If no approved memberships, show join/onboard flow
  if (approved.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Welcome, {user?.name}!</Text>
          {pending.length > 0 ? (
            <Text style={{ marginBottom: 12, color: '#666' }}>
              {pending.some(p => p.role === 'society_head') 
                ? 'Your society registration is awaiting platform admin approval.'
                : 'Your membership request is pending. You\'ll get access once approved.'
              }
            </Text>
          ) : (
            <Text style={{ marginBottom: 12, color: '#666' }}>
              Join an existing society or register a new one as society head.
            </Text>
          )}
        </View>
        <JoinSociety onJoined={loadMemberships} />
        <TouchableOpacity onPress={logout} style={{ padding: 12, alignItems: 'center' }}>
          <Text style={{ color: COLORS.secondary, fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // For society heads, show HeadPending screen
  // For residents, show ResidentDashboard
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {isHead ? (
        <HeadPending />
      ) : (
        <ResidentDashboard />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}