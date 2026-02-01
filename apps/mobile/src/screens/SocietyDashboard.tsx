import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api';
import { useLocalAuth } from '../auth/useLocalAuth';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  divider: '#F1F5F9',
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

  const formatLocation = (location: any) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location === 'object' && location.lat != null && location.lng != null) {
      return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
    return '';
  };

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
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const statusParam = filter === 'all' ? '' : `&status=${uiStatusToApi(filter)}`;
      const data = await apiFetch(`/v1/complaints?societyId=${societyId}${statusParam}`, accessToken!);
      const mapped = (data.complaints || data || []).map((c: any) => ({
        ...c,
        status: apiStatusToUi(c.status),
        locationText: formatLocation(c.location),
      }));
      setComplaints(mapped);

      const newStats = {
        total: mapped.length,
        pending: mapped.filter((c: any) => c.status === 'pending').length,
        inProgress: mapped.filter((c: any) => c.status === 'in-progress').length,
        resolved: mapped.filter((c: any) => c.status === 'resolved').length,
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', bg: COLORS.warningLight, fg: COLORS.warning, icon: 'hourglass-outline' as const };
      case 'in-progress':
        return { label: 'In Progress', bg: COLORS.primaryLight, fg: COLORS.primary, icon: 'reload-outline' as const };
      case 'resolved':
        return { label: 'Resolved', bg: COLORS.successLight, fg: COLORS.success, icon: 'checkmark-done-outline' as const };
      case 'closed':
        return { label: 'Closed', bg: COLORS.cardAlt, fg: COLORS.textMuted, icon: 'lock-closed-outline' as const };
      default:
        return { label: status || 'Unknown', bg: COLORS.cardAlt, fg: COLORS.textMuted, icon: 'help-outline' as const };
    }
  };

  const getPriorityConfig = (priority?: string) => {
    switch (priority) {
      case 'high':
        return { label: 'High', bg: COLORS.errorLight, fg: COLORS.error };
      case 'low':
        return { label: 'Low', bg: COLORS.cardAlt, fg: COLORS.textSecondary };
      default:
        return { label: 'Medium', bg: COLORS.warningLight, fg: COLORS.warning };
    }
  };

  const filteredComplaints = useMemo(() => complaints, [complaints]);

  const FILTER_OPTIONS = [
    { key: 'all' as const, label: 'All', icon: 'grid-outline' as const },
    { key: 'pending' as const, label: 'Pending', icon: 'hourglass-outline' as const },
    { key: 'in-progress' as const, label: 'Active', icon: 'reload-outline' as const },
    { key: 'resolved' as const, label: 'Done', icon: 'checkmark-done-outline' as const },
  ];

  const STAT_CARDS = [
    { key: 'total', value: stats.total, label: 'Total', icon: 'layers-outline' as const, color: COLORS.primary, bg: COLORS.primaryLight },
    { key: 'pending', value: stats.pending, label: 'Pending', icon: 'hourglass-outline' as const, color: COLORS.warning, bg: COLORS.warningLight },
    { key: 'inProgress', value: stats.inProgress, label: 'Active', icon: 'reload-outline' as const, color: COLORS.primary, bg: COLORS.primaryLight },
    { key: 'resolved', value: stats.resolved, label: 'Done', icon: 'checkmark-done-outline' as const, color: COLORS.success, bg: COLORS.successLight },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Society Dashboard</Text>
          <Text style={styles.headerSubtitle}>{stats.total} complaints</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {STAT_CARDS.map((stat) => (
          <View key={stat.key} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(opt.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={isActive ? '#FFF' : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredComplaints.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="file-tray-outline" size={40} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No complaints</Text>
              <Text style={styles.emptySubtitle}>Try a different filter or pull to refresh</Text>
            </View>
          ) : (
            filteredComplaints.map((complaint) => {
              const statusCfg = getStatusConfig(complaint.status);
              const priorityCfg = getPriorityConfig(complaint.priority);
              return (
                <TouchableOpacity
                  key={complaint._id}
                  style={styles.card}
                  onPress={() => onViewComplaint(complaint._id)}
                  activeOpacity={0.7}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                      <Ionicons name={statusCfg.icon} size={12} color={statusCfg.fg} style={{ marginRight: 4 }} />
                      <Text style={[styles.statusChipText, { color: statusCfg.fg }]}>{statusCfg.label}</Text>
                    </View>
                    {complaint.headFlagged && (
                      <View style={styles.flagChip}>
                        <Ionicons name="flag" size={12} color={COLORS.warning} />
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <Text style={styles.cardDate}>{new Date(complaint.createdAt).toLocaleDateString()}</Text>
                  </View>

                  {/* Category & Description */}
                  <Text style={styles.cardCategory} numberOfLines={1}>
                    {complaint.category || 'Uncategorized'}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {complaint.description || 'No description provided'}
                  </Text>

                  {/* Pinned Note */}
                  {complaint.headPinnedNote?.message ? (
                    <View style={styles.pinnedBox}>
                      <Ionicons name="chatbox-ellipses-outline" size={14} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.pinnedText} numberOfLines={2}>
                        {complaint.headPinnedNote.message}
                      </Text>
                    </View>
                  ) : null}

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    {complaint.locationText ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.metaText} numberOfLines={1}>{complaint.locationText}</Text>
                      </View>
                    ) : (
                      <View style={styles.metaRow}>
                        <Ionicons name="person-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {complaint.reporterId?.name || complaint.reporterId?.email || 'Unknown'}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.priorityChip, { backgroundColor: priorityCfg.bg }]}>
                      <Text style={[styles.priorityText, { color: priorityCfg.fg }]}>{priorityCfg.label}</Text>
                    </View>
                  </View>

                  {/* Chevron */}
                  <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
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

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Stats */
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  statCard: {
    width: (width - 32 - 30) / 4,
    minWidth: 72,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* Filters */
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  /* Loader */
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  /* Empty */
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  /* Card */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  flagChip: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  pinnedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  pinnedText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 17,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  priorityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chevronWrap: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -9,
  },
});
