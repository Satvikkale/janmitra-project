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

  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [pinnedNote, setPinnedNote] = useState('');

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

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/v1/complaints/${complaintId}`, accessToken!);

      data.status = apiStatusToUi(data.status);
      setComplaint(data);

      setFlagged(Boolean(data.headFlagged));
      setFlagReason(data.headFlagReason || '');
      setPinnedNote(data.headPinnedNote?.message || '');
    } catch (error) {
      console.error('Failed to fetch complaint:', error);
      Alert.alert('Error', 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHeadReview = async () => {
    try {
      setUpdating(true);
      await apiFetch(`/v1/complaints/${complaintId}/head-review`, accessToken!, {
        method: 'PATCH',
        body: JSON.stringify({
          flagged,
          reason: flagReason || undefined,
          pinnedNote: pinnedNote || undefined,
        }),
      });
      Alert.alert('Success', 'Saved head review');
      onUpdated();
      onBack();
    } catch (error) {
      console.error('Failed to save head review:', error);
      Alert.alert('Error', 'Failed to save head review');
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
            <Text style={styles.label}>Current Status:</Text>
            <Text style={styles.value}>{complaint.status || 'Unknown'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Description:</Text>
          </View>
          <Text style={styles.description}>
            {complaint.aiClassification?.description || complaint.description || 'No description'}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>
              {typeof complaint.location === 'string'
                ? complaint.location
                : complaint.location?.lat && complaint.location?.lng
                  ? `${complaint.location.lat}, ${complaint.location.lng}`
                  : 'Not specified'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Reported By:</Text>
            <Text style={styles.value}>
              {complaint.reporter?.name || complaint.reporter?.email || complaint.reporter?.phone || 'Unknown User'}
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

        {/* Head Review (advisory only) */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Head Review</Text>
          </View>

          <Text style={styles.helperText}>
            Auto-routing stays active. Use this to flag anything suspicious and pin a note for the org/NGO.
          </Text>

          <Text style={styles.inputLabel}>Suspicious?</Text>
          <View style={styles.flagButtons}>
            <TouchableOpacity
              style={[styles.flagButton, !flagged && styles.flagButtonActive]}
              onPress={() => setFlagged(false)}
            >
              <Text style={[styles.flagButtonText, !flagged && styles.flagButtonTextActive]}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flagButton, flagged && styles.flagButtonActive, flagged && { borderColor: COLORS.warning }]}
              onPress={() => setFlagged(true)}
            >
              <Text style={[styles.flagButtonText, flagged && styles.flagButtonTextActive, flagged && { color: COLORS.warning }]}>Flag</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Flag Reason (optional)</Text>
          <TextInput
            style={styles.input}
            value={flagReason}
            onChangeText={setFlagReason}
            placeholder="e.g., Looks like duplicate / personal dispute / unclear evidence"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.inputLabel}>Pinned Note (shown to org/NGO)</Text>
          <TextInput
            style={styles.textArea}
            value={pinnedNote}
            onChangeText={setPinnedNote}
            placeholder="Add a pinned note for the org/NGO handling this complaint..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={[styles.updateButton, updating && styles.updateButtonDisabled]}
            onPress={handleSaveHeadReview}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.updateButtonText}>Save</Text>
              </View>
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helperText: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 8,
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
  flagButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  flagButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E3F2FD',
  },
  flagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  flagButtonTextActive: {
    color: COLORS.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
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
