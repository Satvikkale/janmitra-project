import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { formatDate, normalizeStatus, getStatusConfig, getSeverityConfig } from '../utils/formatters';

type Complaint = {
  _id: string;
  photoUrl: string;
  category?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  severity?: string;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: {
    category?: string;
    description?: string;
    severity?: string;
  };
};

type MyComplaintsProps = {
  onBack?: () => void;
  onViewComplaint?: (complaintId: string) => void;
};

export default function MyComplaints({ onBack, onViewComplaint }: MyComplaintsProps) {
  const { accessToken } = useLocalAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadComplaints() {
    try {
      const data = await apiFetch('/v1/complaints', accessToken!);
      console.log('Complaints loaded:', data);
      // Map 'open' status to 'pending' for consistency
      const mapped = (data || []).map((c: any) => ({
        ...c,
        status: c.status === 'open' ? 'pending' : c.status
      }));
      setComplaints(mapped);
    } catch (error: any) {
      console.error('Error loading complaints:', error);
      Alert.alert('Error', 'Failed to load your complaints');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadComplaints();
    setRefreshing(false);
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'in_progress':
        return COLORS.primary;
      case 'resolved':
        return COLORS.success;
      case 'rejected':
        return COLORS.danger;
      default:
        return COLORS.textSecondary;
    }
  }

  function getStatusText(status: string) {
    const config = getStatusConfig(status);
    return config.label;
  }

  function renderComplaint({ item }: { item: Complaint }) {
    const category = item.aiAnalysis?.category || item.category || 'General Issue';
    const description = item.aiAnalysis?.description || 'No description';
    const severity = item.aiAnalysis?.severity || item.severity || 'Medium';

    return (
      <TouchableOpacity
        style={styles.complaintCard}
        onPress={() => onViewComplaint?.(item._id)}
      >
        {/* Photo Thumbnail */}
        {item.photoUrl && (
          <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} resizeMode="cover" />
        )}

        <View style={styles.complaintContent}>
          {/* Category Title */}
          <Text style={styles.categoryTitle}>{category}</Text>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>

          {/* Metadata Row */}
          <View style={styles.metadataRow}>
            {/* Severity Badge */}
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severity === 'High' ? '#FFEBEE' : '#FFF3E0' },
              ]}
            >
              <Text
                style={[
                  styles.severityText,
                  { color: severity === 'High' ? COLORS.danger : COLORS.warning },
                ]}
              >
                {severity}
              </Text>
            </View>

            {/* Date */}
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading complaints...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>My Issues</Text>
        <Text style={styles.subtitle}>{complaints.length} total complaints</Text>
      </View>

      {/* Complaints List */}
      {complaints.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>No Complaints Yet</Text>
          <Text style={styles.emptyMessage}>
            Start reporting issues by taking photos of problems in your society
          </Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          renderItem={renderComplaint}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    padding: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  complaintCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  complaintContent: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
