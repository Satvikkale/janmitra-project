import React, { useState, useEffect } from 'react';
import { 
  Alert, 
  TouchableOpacity, 
  SafeAreaView, 
  Text, 
  View, 
  ActivityIndicator, 
  ScrollView, 
  RefreshControl,
  BackHandler 
} from 'react-native';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import RaiseComplaint from './RaiseComplaint';
import MyComplaints from './MyComplaints';
import SocietyDashboard from './SocietyDashboard';
import ComplaintDetails from './ComplaintDetails';
import ManageComplaint from './ManageComplaint';
import AnnouncementsView from './AnnouncementsView';
import CreateAnnouncement from './CreateAnnouncement';

type Society = {
  _id: string;
  name: string;
  headUserSub: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type MemberRequest = {
  _id: string;
  userSub: string;
  societyId: string;
  role: 'resident' | 'society_head';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user?: {
    name: string;
    email?: string;
    phone?: string;
  };
};

export default function HeadPending() {
  const { accessToken, user, logout } = useLocalAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [memberRequests, setMemberRequests] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'raiseComplaint' | 'myComplaints' | 'societyDashboard' | 'complaintDetails' | 'manageComplaint' | 'announcements' | 'createAnnouncement'>('dashboard');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);

  async function loadData() {
    try {
      console.log('HeadPending: Loading data for user:', user?.sub);
      
      // Load society where current user is head
      const allSocieties = await apiFetch('/v1/societies', accessToken!);
      console.log('HeadPending: All societies:', allSocieties);
      const mySociety = allSocieties.find((s: Society) => s.headUserSub === user?.sub);
      console.log('HeadPending: My society:', mySociety);
      
      // If not found in approved societies, check memberships for pending
      if (!mySociety) {
        console.log('HeadPending: Society not found, checking memberships');
        const memberships = await apiFetch('/v1/societies/my-memberships', accessToken!);
        console.log('HeadPending: My memberships:', memberships);
        const headMembership = memberships.find(
          (m: any) => m.role === 'society_head'
        );
        
        if (headMembership?.society) {
          console.log('HeadPending: Found head membership:', headMembership);
          setSociety(headMembership.society);
          
          // Load member requests if society is approved
          if (headMembership.society.status === 'approved') {
            console.log('HeadPending: Society approved, loading member requests');
            await loadMemberRequests(headMembership.society._id);
          } else {
            console.log('HeadPending: Society status is:', headMembership.society.status);
          }
        }
      } else {
        console.log('HeadPending: Setting society:', mySociety);
        setSociety(mySociety);
        
        // Load member requests only if society is approved
        if (mySociety.status === 'approved') {
          console.log('HeadPending: Society approved, loading member requests');
          await loadMemberRequests(mySociety._id);
        } else {
          console.log('HeadPending: Society status is:', mySociety.status);
        }
      }
    } catch (err: any) {
      console.error('Error loading society:', err);
      Alert.alert('Error', err.message || 'Failed to load your society');
    } finally {
      setLoading(false);
    }
  }

  async function loadMemberRequests(societyId: string) {
    try {
      console.log(`Loading member requests for society: ${societyId}`);
      const requests = await apiFetch(`/v1/societies/${societyId}/memberships?status=pending`, accessToken!);
      console.log(`Member requests loaded:`, requests);
      setMemberRequests(requests || []);
    } catch (err: any) {
      console.error('Error loading member requests:', err);
      Alert.alert('Notice', `Could not load pending member requests: ${err.message || 'Unknown error'}`);
      setMemberRequests([]);
    }
  }

  async function approveMember(societyId: string, userSub: string) {
    try {
      setApprovingId(userSub);
      await apiFetch(`/v1/societies/${societyId}/memberships/${encodeURIComponent(userSub)}/approve`, accessToken!, {
        method: 'POST',
      });
      Alert.alert('✅ Success', 'Member has been approved and can now access your society');
      await loadMemberRequests(societyId);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve member');
    } finally {
      setApprovingId(null);
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
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [currentScreen]);

  // Show RaiseComplaint screen
  if (currentScreen === 'raiseComplaint') {
    return (
      <RaiseComplaint
        onComplaintRaised={() => {
          setCurrentScreen('dashboard');
          loadData();
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

  // Show Society Dashboard screen
  if (currentScreen === 'societyDashboard' && society) {
    return (
      <SocietyDashboard
        societyId={society._id}
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

  // Show Manage Complaint screen
  if (currentScreen === 'manageComplaint' && selectedComplaintId) {
    return (
      <ManageComplaint
        complaintId={selectedComplaintId}
        onBack={() => {
          setSelectedComplaintId(null);
          setCurrentScreen('societyDashboard');
        }}
        onUpdated={() => {
          loadData();
        }}
      />
    );
  }

  // Show Announcements screen
  if (currentScreen === 'announcements') {
    return (
      <AnnouncementsView
        onBack={() => setCurrentScreen('dashboard')}
        onViewDetails={(announcement) => {
          setEditingAnnouncement(announcement);
          setCurrentScreen('createAnnouncement');
        }}
        onCreateNew={() => {
          setEditingAnnouncement(null);
          setCurrentScreen('createAnnouncement');
        }}
        isHead={true}
      />
    );
  }

  // Show Create/Edit Announcement screen
  if (currentScreen === 'createAnnouncement') {
    return (
      <CreateAnnouncement
        onBack={() => {
          setEditingAnnouncement(null);
          setCurrentScreen('announcements');
        }}
        onCreated={() => {
          setEditingAnnouncement(null);
          setCurrentScreen('announcements');
        }}
        editAnnouncement={editingAnnouncement}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!society) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            No Society Found
          </Text>
          <Text style={{ color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            You haven't registered a society yet. Please register your society first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = society.status === 'pending';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        {/* Society Header */}
        <View style={{ padding: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: COLORS.text }}>
            {society.name}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
            Registered: {new Date(society.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* If Pending - Show Waiting Message */}
        {isPending && (
          <View style={{ padding: 16 }}>
            <View style={{ 
              backgroundColor: '#FFF3E0', 
              padding: 20, 
              borderRadius: 8, 
              borderLeftWidth: 4,
              borderLeftColor: COLORS.warning,
            }}>
              <View style={{ 
                backgroundColor: COLORS.warning, 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                borderRadius: 4,
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>PENDING APPROVAL</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: COLORS.text }}>
                Awaiting Platform Admin Approval
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 }}>
                Your society registration is under review by the platform admin. Once approved, you'll be able to manage member requests and access all society head features.
              </Text>
            </View>
          </View>
        )}

        {/* If Approved - Show Member Requests */}
        {!isPending && (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: COLORS.text }}>
              Member Requests
            </Text>

            {memberRequests.length === 0 ? (
              <View style={{
                backgroundColor: COLORS.card,
                padding: 32,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>✨</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: COLORS.text }}>
                  All Caught Up!
                </Text>
                <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No pending member requests at the moment
                </Text>
              </View>
            ) : (
              memberRequests.map((request) => (
                <View 
                  key={request._id} 
                  style={{
                    backgroundColor: COLORS.card,
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: COLORS.text }}>
                      {request.user?.name || 'Unknown User'}
                    </Text>
                    {request.user?.email && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ marginRight: 6, fontSize: 14 }}>✉️</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                          {request.user.email}
                        </Text>
                      </View>
                    )}
                    {request.user?.phone && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ marginRight: 6, fontSize: 14 }}>📞</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                          {request.user.phone}
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Text style={{ marginRight: 6, fontSize: 14 }}>📅</Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => approveMember(society._id, request.userSub)}
                    disabled={approvingId === request.userSub}
                    style={{
                      backgroundColor: approvingId === request.userSub ? COLORS.border : COLORS.success,
                      padding: 12,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    {approvingId === request.userSub ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                        ✓ Approve Member
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Quick Actions - Only show when approved */}
        {!isPending && (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: COLORS.text }}>
              Quick Actions
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {/* Manage Society Complaints */}
              <TouchableOpacity
                style={{
                  width: '47%',
                  margin: 6,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#E8F5E9',
                  alignItems: 'center',
                  minHeight: 140,
                  justifyContent: 'center',
                }}
                onPress={() => setCurrentScreen('societyDashboard')}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                  Manage Society
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>
                  View & manage all complaints
                </Text>
              </TouchableOpacity>

              {/* Raise Complaint */}
              <TouchableOpacity
                style={{
                  width: '47%',
                  margin: 6,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#FFEBEE',
                  alignItems: 'center',
                  minHeight: 140,
                  justifyContent: 'center',
                }}
                onPress={() => setCurrentScreen('raiseComplaint')}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                  Raise Issue
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>
                  Take photo & report
                </Text>
              </TouchableOpacity>

              {/* My Complaints */}
              <TouchableOpacity
                style={{
                  width: '47%',
                  margin: 6,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#E3F2FD',
                  alignItems: 'center',
                  minHeight: 140,
                  justifyContent: 'center',
                }}
                onPress={() => setCurrentScreen('myComplaints')}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📋</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                  My Issues
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>
                  Track your complaints
                </Text>
              </TouchableOpacity>

              {/* Announcements */}
              <TouchableOpacity
                style={{
                  width: '47%',
                  margin: 6,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#F3E5F5',
                  alignItems: 'center',
                  minHeight: 140,
                  justifyContent: 'center',
                }}
                onPress={() => setCurrentScreen('announcements')}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📢</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                  Announcements
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>
                  Create & manage news
                </Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={{
                  width: '47%',
                  margin: 6,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#FFF3E0',
                  alignItems: 'center',
                  minHeight: 140,
                  justifyContent: 'center',
                }}
                onPress={() => {
                  Alert.alert('Logout', 'Are you sure you want to logout?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: logout },
                  ]);
                }}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🚪</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                  Logout
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>
                  Sign out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={{ padding: 16 }}>
          <View style={{
            backgroundColor: '#E3F2FD',
            padding: 16,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.primary,
          }}>
            <Text style={{ fontWeight: 'bold', color: COLORS.text, marginBottom: 8 }}>As Society Head</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 }}>
              • Approve residents who want to join your society{'\n'}
              • Manage your society members{'\n'}
              • Raise and verify complaints from your society{'\n'}
              • View society analytics and reports
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
