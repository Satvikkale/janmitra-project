import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api';
import { useLocalAuth } from '../auth/useLocalAuth';

const COLORS = {
  primary: '#1976D2',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#F5F6FA',
  card: '#FFF',
  text: '#222',
  textLight: '#666',
  border: '#E0E0E0',
};

type ManageComplaintProps = {
  complaintId: string;
  onBack: () => void;
  onUpdated: () => void;
};

export default function ManageComplaint({ complaintId, onBack, onUpdated }: ManageComplaintProps) {
  const { accessToken } = useLocalAuth();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  const apiStatusToUi = (apiStatus?: string) => {
    switch (apiStatus) {
      case 'open':
        return 'pending';
      case 'in_progress':
        return 'in-progress';
      default:
        return apiStatus || '';
    }
  };

  const uiStatusToApi = (uiStatus?: string) => {
    switch (uiStatus) {
      case 'pending':
        return 'open';
      case 'in-progress':
        return 'in_progress';
      default:
        return uiStatus || '';
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/v1/complaints/${complaintId}`, accessToken!);

      data.status = apiStatusToUi(data.status);
      setComplaint(data);
      setStatus(data.status);
      setNotes(data.note ?? data.notes ?? '');
    } catch (error) {
      console.error('Failed to fetch complaint:', error);
      Alert.alert('Error', 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      const backendStatus = uiStatusToApi(status);
      await apiFetch(`/v1/complaints/${complaintId}/status`, accessToken!, {
        method: 'PATCH',
        body: JSON.stringify({ status: backendStatus, note: notes || undefined }),
      });
      Alert.alert('Success', 'Complaint updated successfully');
      onUpdated();
      onBack();
    } catch (error) {
      console.error('Failed to update complaint:', error);
      Alert.alert('Error', 'Failed to update complaint');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Complaint</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Complaint</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Complaint not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Complaint</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Complaint Info Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Complaint Details</Text>
          
          {complaint.photoUrl && (
            <Image 
              source={{ uri: complaint.photoUrl }} 
              style={styles.photo}
              resizeMode="cover"
            />
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{complaint.category || 'Uncategorized'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Description:</Text>
          </View>
          <Text style={styles.description}>
            {complaint.aiClassification?.description || complaint.description || 'No description'}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{complaint.location || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Reported By:</Text>
            <Text style={styles.value}>
              {complaint.reporterId?.name || complaint.reporterId?.email || 'Unknown'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Reported On:</Text>
            <Text style={styles.value}>
              {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Update Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Update Status</Text>

          <Text style={styles.inputLabel}>Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity 
              style={[styles.statusButton, status === 'pending' && styles.statusButtonActive]}
              onPress={() => setStatus('pending')}
            >
              <Text style={[styles.statusButtonText, status === 'pending' && styles.statusButtonTextActive]}>
                Pending
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusButton, status === 'in-progress' && styles.statusButtonActive]}
              onPress={() => setStatus('in-progress')}
            >
              <Text style={[styles.statusButtonText, status === 'in-progress' && styles.statusButtonTextActive]}>
                In Progress
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusButton, status === 'resolved' && styles.statusButtonActive]}
              onPress={() => setStatus('resolved')}
            >
              <Text style={[styles.statusButtonText, status === 'resolved' && styles.statusButtonTextActive]}>
                Resolved
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusButton, status === 'rejected' && styles.statusButtonActive]}
              onPress={() => setStatus('rejected')}
            >
              <Text style={[styles.statusButtonText, status === 'rejected' && styles.statusButtonTextActive]}>
                Rejected
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Notes / Resolution Details</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about the status update..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={[styles.updateButton, updating && styles.updateButtonDisabled]}
            onPress={handleUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.updateButtonText}>Update Complaint</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 120,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  statusButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: 16,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
