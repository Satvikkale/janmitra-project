import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api';
import { useLocalAuth } from '../auth/useLocalAuth';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { formatDate, formatDateTime, normalizeStatus, getStatusConfig, getSeverityConfig } from '../utils/formatters';

type ComplaintDetailsProps = {
  complaintId: string;
  onBack: () => void;
};

export default function ComplaintDetails({ complaintId, onBack }: ComplaintDetailsProps) {
  const { accessToken } = useLocalAuth();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/v1/complaints/${complaintId}`, accessToken!);
      // Normalize status for consistent display
      data.status = normalizeStatus(data.status);
      setComplaint(data);
    } catch (error) {
      console.error('Failed to fetch complaint:', error);
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Complaint Details</Text>
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
          <Text style={styles.headerTitle}>Complaint Details</Text>
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
        <Text style={styles.headerTitle}>Complaint Details</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(complaint.status).color }]}>
          <Text style={styles.statusText}>{getStatusConfig(complaint.status).label}</Text>
        </View>

        {/* Photo */}
        {complaint.photoUrl && (
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: complaint.photoUrl }} 
              style={styles.photo}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Category:</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{complaint.category || 'Uncategorized'}</Text>
            </View>
          </View>

          {complaint.aiClassification?.severity && (
            <View style={styles.row}>
              <Text style={styles.label}>Severity:</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityConfig(complaint.aiClassification.severity).bg }]}>
                <Text style={[styles.severityText, { color: getSeverityConfig(complaint.aiClassification.severity).color }]}>
                  {getSeverityConfig(complaint.aiClassification.severity).label}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.description}>
              {complaint.aiClassification?.description || complaint.description || 'No description provided'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{complaint.location || 'Not specified'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Reported:</Text>
            <Text style={styles.value}>
              {formatDateTime(new Date(complaint.createdAt))}
            </Text>
          </View>

          {complaint.resolvedAt && (
            <View style={styles.section}>
              <Text style={styles.label}>Resolved:</Text>
              <Text style={styles.value}>
                {formatDateTime(new Date(complaint.resolvedAt))}
              </Text>
            </View>
          )}

          {complaint.assignedTo && (
            <View style={styles.section}>
              <Text style={styles.label}>Assigned To:</Text>
              <Text style={styles.value}>{complaint.assignedTo.name || complaint.assignedTo.email}</Text>
            </View>
          )}

          {complaint.notes && (
            <View style={styles.section}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{complaint.notes}</Text>
            </View>
          )}
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
  statusBadge: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 300,
  },
  card: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginTop: 4,
  },
  value: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 4,
  },
});
