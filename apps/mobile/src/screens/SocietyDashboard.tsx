import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
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

type SocietyDashboardProps = {
  societyId: string;
  onViewComplaint: (complaintId: string) => void;
  onBack: () => void;
};

export default function SocietyDashboard({ societyId, onViewComplaint, onBack }: SocietyDashboardProps) {
  const { accessToken } = useLocalAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'resolved'>('all');

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const statusParam = filter === 'all' ? '' : `&status=${filter === 'pending' ? 'open' : filter}`;
      const data = await apiFetch(`/v1/complaints?societyId=${societyId}${statusParam}`, accessToken!);
      // Map 'open' status to 'pending' for consistency
      const mapped = (data.complaints || data || []).map((c: any) => ({
        ...c,
        status: c.status === 'open' ? 'pending' : c.status
      }));
      setComplaints(mapped);
      
      // Calculate stats
      const allComplaints = filter === 'all' ? mapped : complaints;
      const newStats = {
        total: allComplaints.length,
        pending: allComplaints.filter((c: any) => c.status === 'pending').length,
        inProgress: allComplaints.filter((c: any) => c.status === 'in-progress').length,
        resolved: allComplaints.filter((c: any) => c.status === 'resolved').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'in-progress': return COLORS.primary;
      case 'resolved': return COLORS.success;
      case 'rejected': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const filteredComplaints = complaints;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Society Dashboard</Text>
      </View>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
      >
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.statNumber}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </ScrollView>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'in-progress' && styles.filterTabActive]}
          onPress={() => setFilter('in-progress')}
        >
          <Text style={[styles.filterText, filter === 'in-progress' && styles.filterTextActive]}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'resolved' && styles.filterTabActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.filterText, filter === 'resolved' && styles.filterTextActive]}>Resolved</Text>
        </TouchableOpacity>
      </View>

      {/* Complaints List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredComplaints.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No complaints found</Text>
            </View>
          ) : (
            filteredComplaints.map((complaint) => (
              <TouchableOpacity 
                key={complaint._id} 
                style={styles.complaintCard}
                onPress={() => onViewComplaint(complaint._id)}
              >
                <View style={styles.complaintHeader}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(complaint.status) }]} />
                  <Text style={styles.category}>{complaint.category || 'Uncategorized'}</Text>
                  <Text style={styles.date}>
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={styles.complaintDescription} numberOfLines={2}>
                  {complaint.aiClassification?.description || complaint.description || 'No description'}
                </Text>
                
                {complaint.location && (
                  <Text style={styles.location}>📍 {complaint.location}</Text>
                )}

                <View style={styles.complaintFooter}>
                  <Text style={styles.reporter}>
                    By: {complaint.reporterId?.name || complaint.reporterId?.email || 'Unknown'}
                  </Text>
                  {complaint.aiClassification?.severity && (
                    <View style={[styles.severityBadge, { 
                      backgroundColor: complaint.aiClassification.severity === 'high' ? COLORS.error 
                        : complaint.aiClassification.severity === 'medium' ? COLORS.warning 
                        : COLORS.success 
                    }]}>
                      <Text style={styles.severityText}>{complaint.aiClassification.severity}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
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
  statsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    minWidth: 100,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  complaintCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  category: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  complaintDescription: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  location: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reporter: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
