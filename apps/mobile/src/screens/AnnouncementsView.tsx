import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';
import { COLORS } from '../constants/theme';

type Announcement = {
  _id: string;
  title: string;
  message: string;
  category: 'general' | 'maintenance' | 'event' | 'emergency' | 'meeting' | 'notice';
  priority: 'normal' | 'important' | 'urgent';
  isPinned: boolean;
  createdAt: string;
  expiresAt: string | null;
  readBy: string[];
  createdBy: string;
};

type AnnouncementsViewProps = {
  onBack?: () => void;
  onViewDetails?: (announcement: Announcement) => void;
  onCreateNew?: () => void;
  isHead?: boolean;
};

const CATEGORY_CONFIG: Record<string, { iconName: any; color: string; label: string }> = {
  general: { iconName: 'megaphone-outline', color: '#2196F3', label: 'General' },
  maintenance: { iconName: 'construct-outline', color: '#FF9800', label: 'Maintenance' },
  event: { iconName: 'calendar-outline', color: '#9C27B0', label: 'Event' },
  emergency: { iconName: 'warning-outline', color: '#F44336', label: 'Emergency' },
  meeting: { iconName: 'people-outline', color: '#4CAF50', label: 'Meeting' },
  notice: { iconName: 'document-text-outline', color: '#607D8B', label: 'Notice' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  normal: { color: '#666', bg: '#F5F5F5', label: 'Normal' },
  important: { color: '#FF9800', bg: '#FFF3E0', label: 'Important' },
  urgent: { color: '#F44336', bg: '#FFEBEE', label: 'Urgent' },
};

export default function AnnouncementsView({ 
  onBack, 
  onViewDetails, 
  onCreateNew,
  isHead = false 
}: AnnouncementsViewProps) {
  const { accessToken, user } = useLocalAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  async function loadAnnouncements() {
    try {
      const params = filter !== 'all' ? `?category=${filter}` : '';
      const data = await apiFetch(`/v1/announcements${params}`, accessToken!);
      // Ensure data is an array
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  }

  async function markAsRead(id: string) {
    try {
      await apiFetch(`/v1/announcements/${id}/read`, accessToken!, { method: 'POST' });
      // Update local state
      setAnnouncements(prev => 
        prev.map(a => 
          a._id === id ? { ...a, readBy: [...a.readBy, user?.sub || ''] } : a
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, [filter]);

  function isUnread(announcement: Announcement) {
    return !(announcement.readBy || []).includes(user?.sub || '');
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function renderAnnouncement({ item }: { item: Announcement }) {
    // Handle both old schema (type) and new schema (category)
    const categoryKey = item.category || (item as any).type || 'general';
    const priorityKey = item.priority || 'normal';
    const category = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.general;
    const priority = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.normal;
    const unread = isUnread(item);

    return (
      <TouchableOpacity
        style={[
          styles.announcementCard,
          unread && styles.unreadCard,
          item.isPinned && styles.pinnedCard,
        ]}
        onPress={() => {
          if (unread) markAsRead(item._id);
          onViewDetails?.(item);
        }}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons name={category.iconName} size={14} color={category.color} style={{ marginRight: 6 }} />
            <Text style={[styles.categoryText, { color: category.color }]}>
              {category.label}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {item.isPinned && (
              <Ionicons name="pin" size={14} color={COLORS.textSecondary} style={styles.pinIcon} />
            )}
            {unread && (
              <View style={styles.unreadDot} />
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, unread && styles.unreadTitle]} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>

        {/* Message Preview */}
        <Text style={styles.contentPreview} numberOfLines={2}>
          {item.message || ''}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.color }]}>
              {priority.label}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.backText}>Back</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Announcements</Text>
          {isHead && onCreateNew && (
            <TouchableOpacity onPress={onCreateNew} style={styles.addButton}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="add" size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.addButtonText}>New</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: 'All', iconName: 'apps-outline' },
            { key: 'general', label: 'General', iconName: CATEGORY_CONFIG.general.iconName },
            { key: 'emergency', label: 'Emergency', iconName: CATEGORY_CONFIG.emergency.iconName },
            { key: 'meeting', label: 'Meeting', iconName: CATEGORY_CONFIG.meeting.iconName },
            { key: 'maintenance', label: 'Maintenance', iconName: CATEGORY_CONFIG.maintenance.iconName },
            { key: 'event', label: 'Event', iconName: CATEGORY_CONFIG.event.iconName },
            { key: 'notice', label: 'Notice', iconName: CATEGORY_CONFIG.notice.iconName },
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
              onPress={() => setFilter(item.key)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={item.iconName}
                  size={14}
                  color={filter === item.key ? '#FFF' : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mail-outline" size={44} color={COLORS.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>No Announcements</Text>
          <Text style={styles.emptyMessage}>
            {filter !== 'all' 
              ? `No ${filter} announcements found`
              : 'No announcements from your society yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
  },
  announcementCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  pinnedCard: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFF176',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  contentPreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
});
