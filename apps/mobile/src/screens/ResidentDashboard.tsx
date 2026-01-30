import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import RaiseComplaint from './RaiseComplaint';
import MyComplaints from './MyComplaints';
import ComplaintDetails from './ComplaintDetails';
import SocietyDashboard from './SocietyDashboard';
import ManageComplaint from './ManageComplaint';
import AnnouncementsView from './AnnouncementsView';

type Society = {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
};

type Membership = {
  _id: string;
  societyId: string;
  status: string;
  role: string;
  society?: Society;
};

export default function ResidentDashboard() {
  const { accessToken, user, logout } = useLocalAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'raiseComplaint' | 'myComplaints' | 'societyDashboard' | 'complaintDetails' | 'manageComplaint' | 'announcements'>('dashboard');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  async function loadData() {
    try {
      const data = await apiFetch('/v1/societies/my-memberships', accessToken!);
      console.log('Resident memberships:', data);
      setMemberships(data || []);
    } catch (err: any) {
      console.error('Error loading memberships:', err);
      Alert.alert('Error', 'Failed to load your society information');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen !== 'dashboard') {
        setCurrentScreen('dashboard');
        return true; // Prevent default behavior
      }
      return false; // Let default behavior handle (exit app)
    });

    return () => backHandler.remove();
  }, [currentScreen]);

  // Show RaiseComplaint screen
  if (currentScreen === 'raiseComplaint') {
    return (
      <RaiseComplaint
        onComplaintRaised={() => {
          setCurrentScreen('dashboard');
          loadData(); // Refresh data after raising complaint
        }}
        onBack={() => setCurrentScreen('dashboard')}
      />
    );
  }

  // Show MyComplaints screen
  if (currentScreen === 'myComplaints') {
    return (
      <MyComplaints
        onBack={() => setCurrentScreen('dashboard')}
        onViewComplaint={(complaintId) => {
          setSelectedComplaintId(complaintId);
          setCurrentScreen('complaintDetails');
        }}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const approvedMemberships = memberships.filter(m => m.status === 'approved');
  const pendingMemberships = memberships.filter(m => m.status === 'pending');

  // Show Society Dashboard screen (for society heads)
  if (currentScreen === 'societyDashboard') {
    const societyId = approvedMemberships.find(m => m.role === 'society_head')?.societyId;
    if (!societyId) {
      setCurrentScreen('dashboard');
      return null;
    }
    return (
      <SocietyDashboard
        societyId={societyId}
        onViewComplaint={(complaintId) => {
          setSelectedComplaintId(complaintId);
          setCurrentScreen('manageComplaint');
        }}
        onBack={() => setCurrentScreen('dashboard')}
      />
    );
  }

  // Show Complaint Details screen
  if (currentScreen === 'complaintDetails' && selectedComplaintId) {
    return (
      <ComplaintDetails
        complaintId={selectedComplaintId}
        onBack={() => {
          setSelectedComplaintId(null);
          setCurrentScreen('myComplaints');
        }}
      />
    );
  }

  // Show Manage Complaint screen (for society heads)
  if (currentScreen === 'manageComplaint' && selectedComplaintId) {
    return (
      <ManageComplaint
        complaintId={selectedComplaintId}
        onBack={() => {
          setSelectedComplaintId(null);
          setCurrentScreen('societyDashboard');
        }}
        onUpdated={() => {
          loadData(); // Refresh data
        }}
      />
    );
  }

  // Show Announcements screen (for residents - view only)
  if (currentScreen === 'announcements') {
    return (
      <AnnouncementsView
        onBack={() => setCurrentScreen('dashboard')}
        onViewDetails={(announcement) => {
          // Just view, no edit for residents
          Alert.alert(
            announcement.title || 'Announcement',
            announcement.message || '',
            [{ text: 'OK' }]
          );
        }}
        isHead={false}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.userName}>{user?.name || 'Resident'}</Text>
        </View>

        {/* Pending Approval Message */}
        {pendingMemberships.length > 0 && (
          <View style={styles.section}>
            <View style={styles.pendingCard}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>PENDING</Text>
              </View>
              <Text style={styles.pendingTitle}>Approval Pending</Text>
              <Text style={styles.pendingMessage}>
                Your membership request is awaiting approval from your society head.
                You'll be notified once approved.
              </Text>
            </View>
          </View>
        )}

        {/* Society Information */}
        {approvedMemberships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Society</Text>
            {approvedMemberships.map((membership) => (
              <View key={membership._id} style={styles.societyCard}>
                <View style={styles.societyInfo}>
                  <Text style={styles.societyName}>
                    {membership.society?.name || 'Unknown Society'}
                  </Text>
                  <View style={styles.roleContainer}>
                    <Text style={styles.societyRole}>
                      {membership.role === 'society_head' ? 'Society Head' : 'Resident'}
                    </Text>
                  </View>
                  {membership.role === 'society_head' && (
                    <Text style={styles.societyNote}>
                      You can manage all society complaints & raise your own issues
                    </Text>
                  )}
                  <View style={styles.statusContainer}>
                    <Text style={styles.societyStatus}>
                      Active Member
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        {approvedMemberships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionsGrid}>
              {/* Society Dashboard - Only for Society Heads */}
              {approvedMemberships.some(m => m.role === 'society_head') && (
                <TouchableOpacity
                  style={[styles.actionCard, { backgroundColor: '#E8F5E9' }]}
                  onPress={() => setCurrentScreen('societyDashboard')}
                >
                  <Text style={styles.actionTitle}>Manage Society</Text>
                  <Text style={styles.actionSubtitle}>View & manage all complaints</Text>
                </TouchableOpacity>
              )}

              {/* Raise Complaint */}
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FFEBEE' }]}
                onPress={() => setCurrentScreen('raiseComplaint')}
              >
                <Text style={styles.actionTitle}>Raise Issue</Text>
                <Text style={styles.actionSubtitle}>Take photo & report</Text>
              </TouchableOpacity>

              {/* My Complaints */}
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#E3F2FD' }]}
                onPress={() => setCurrentScreen('myComplaints')}
              >
                <Text style={styles.actionTitle}>My Issues</Text>
                <Text style={styles.actionSubtitle}>Track status</Text>
              </TouchableOpacity>

              {/* Announcements */}
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FFF3E0' }]}
                onPress={() => setCurrentScreen('announcements')}
              >
                <Text style={styles.actionTitle}>Announcements</Text>
                <Text style={styles.actionSubtitle}>Society news</Text>
              </TouchableOpacity>

              {/* Society Info */}
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#F3E5F5' }]}
                onPress={() => Alert.alert('Coming Soon', 'Society information will be available soon!')}
              >
                <Text style={styles.actionTitle}>Society Info</Text>
                <Text style={styles.actionSubtitle}>Details & stats</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Section */}
        {approvedMemberships.length > 0 && (
          <View style={styles.section}>
            <View style={styles.infoBox}>
              <View style={styles.infoTitleContainer}>
                <Text style={styles.infoTitle}>How It Works</Text>
              </View>
              <Text style={styles.infoText}>
                1. <Text style={styles.infoBold}>Take a photo</Text> of any issue in your society{'\n'}
                2. <Text style={styles.infoBold}>AI classifies</Text> the problem automatically{'\n'}
                3. <Text style={styles.infoBold}>Routes to NGO</Text> for quick resolution{'\n'}
                4. <Text style={styles.infoBold}>Track progress</Text> in real-time
              </Text>
            </View>
          </View>
        )}

        {/* No Memberships */}
        {approvedMemberships.length === 0 && pendingMemberships.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Society Membership</Text>
            <Text style={styles.emptyMessage}>
              You haven't joined any society yet. Please register for a society to get started.
            </Text>
          </View>
        )}

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
              ]);
            }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  pendingCard: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  pendingBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text,
  },
  pendingMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  societyCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  societyInfo: {
    flex: 1,
  },
  societyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  roleContainer: {
    marginBottom: 2,
  },
  societyRole: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  societyNote: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  statusContainer: {
    marginTop: 4,
  },
  societyStatus: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: '47%',
    margin: 6,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  infoTitleContainer: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  infoBold: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  logoutButton: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600',
  },
});
