import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
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
  category: string;
  priority: string;
  isPinned: boolean;
  expiresAt: string | null;
};

type CreateAnnouncementProps = {
  onBack: () => void;
  onCreated: () => void;
  editAnnouncement?: Announcement | null;
};

const CATEGORIES: Array<{ key: string; label: string; iconName: any; color: string }> = [
  { key: 'general', label: 'General', iconName: 'megaphone-outline', color: '#2196F3' },
  { key: 'maintenance', label: 'Maintenance', iconName: 'construct-outline', color: '#FF9800' },
  { key: 'event', label: 'Event', iconName: 'calendar-outline', color: '#9C27B0' },
  { key: 'emergency', label: 'Emergency', iconName: 'warning-outline', color: '#F44336' },
  { key: 'meeting', label: 'Meeting', iconName: 'people-outline', color: '#4CAF50' },
  { key: 'notice', label: 'Notice', iconName: 'document-text-outline', color: '#607D8B' },
];

const PRIORITIES = [
  { key: 'normal', label: 'Normal', color: '#666' },
  { key: 'important', label: 'Important', color: '#FF9800' },
  { key: 'urgent', label: 'Urgent', color: '#F44336' },
];

export default function CreateAnnouncement({ 
  onBack, 
  onCreated, 
  editAnnouncement 
}: CreateAnnouncementProps) {
  const { accessToken } = useLocalAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(editAnnouncement?.title || '');
  const [message, setMessage] = useState(editAnnouncement?.message || '');
  const [category, setCategory] = useState(editAnnouncement?.category || 'general');
  const [priority, setPriority] = useState(editAnnouncement?.priority || 'normal');
  const [isPinned, setIsPinned] = useState(editAnnouncement?.isPinned || false);
  const [hasExpiry, setHasExpiry] = useState(!!editAnnouncement?.expiresAt);
  const [expiryDate, setExpiryDate] = useState<Date>(
    editAnnouncement?.expiresAt ? new Date(editAnnouncement.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const isEditing = !!editAnnouncement;
  const selectedCategory = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Validation', 'Please enter message');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        isPinned,
        expiresAt: hasExpiry ? expiryDate.toISOString() : null,
      };

      if (isEditing) {
        await apiFetch(`/v1/announcements/${editAnnouncement._id}`, accessToken!, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        Alert.alert('Success', 'Announcement updated successfully!', [
          { text: 'OK', onPress: onCreated }
        ]);
      } else {
        await apiFetch('/v1/announcements', accessToken!, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        Alert.alert('Success', 'Announcement published successfully!', [
          { text: 'OK', onPress: onCreated }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      Alert.alert('Error', error.message || 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiFetch(`/v1/announcements/${editAnnouncement?._id}`, accessToken!, {
                method: 'DELETE',
              });
              Alert.alert('Deleted', 'Announcement has been deleted', [
                { text: 'OK', onPress: onCreated }
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete announcement');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="close" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backText}>Cancel</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Announcement' : 'New Announcement'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Title Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter announcement title"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Message Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write your announcement message..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{message.length}/2000</Text>
        </View>

        {/* Category Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.optionsGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.optionButton,
                  category === cat.key && styles.optionButtonActive,
                ]}
                onPress={() => setCategory(cat.key)}
              >
                <Ionicons
                  name={cat.iconName}
                  size={18}
                  color={category === cat.key ? '#FFF' : cat.color}
                  style={styles.optionIcon}
                />
                <Text style={[
                  styles.optionText,
                  category === cat.key && styles.optionTextActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.priorityButton,
                  priority === p.key && { backgroundColor: p.color },
                ]}
                onPress={() => setPriority(p.key)}
              >
                <Text style={[
                  styles.priorityText,
                  priority === p.key && styles.priorityTextActive,
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pin Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pin-outline" size={16} color={COLORS.text} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Pin Announcement</Text>
            </View>
            <Text style={styles.toggleHint}>Pinned announcements appear at the top</Text>
          </View>
          <Switch
            value={isPinned}
            onValueChange={setIsPinned}
            trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
            thumbColor="#FFF"
          />
        </View>

        {/* Expiry Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={16} color={COLORS.text} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Set Expiry Date</Text>
            </View>
            <Text style={styles.toggleHint}>Auto-hide after this date</Text>
          </View>
          <Switch
            value={hasExpiry}
            onValueChange={setHasExpiry}
            trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
            thumbColor="#FFF"
          />
        </View>

        {/* Date Picker - Simple approach with predefined options */}
        {hasExpiry && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Expires After</Text>
            <View style={styles.expiryOptions}>
              {[
                { days: 1, label: '1 Day' },
                { days: 3, label: '3 Days' },
                { days: 7, label: '1 Week' },
                { days: 14, label: '2 Weeks' },
                { days: 30, label: '1 Month' },
              ].map((option) => {
                const optionDate = new Date(Date.now() + option.days * 24 * 60 * 60 * 1000);
                const isSelected = Math.abs(expiryDate.getTime() - optionDate.getTime()) < 24 * 60 * 60 * 1000;
                return (
                  <TouchableOpacity
                    key={option.days}
                    style={[styles.expiryOption, isSelected && styles.expiryOptionActive]}
                    onPress={() => setExpiryDate(optionDate)}
                  >
                    <Text style={[styles.expiryOptionText, isSelected && styles.expiryOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.expiryNote}>
              Expires: {expiryDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}

        {/* Preview Card */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Preview</Text>
          <View style={[
            styles.previewCard,
            isPinned && styles.previewPinned,
          ]}>
            <View style={styles.previewHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name={selectedCategory.iconName} size={14} color={selectedCategory.color} style={{ marginRight: 6 }} />
                <Text style={styles.previewCategory}>{selectedCategory.label}</Text>
              </View>
              {isPinned && <Ionicons name="pin" size={14} color={COLORS.textSecondary} />}
            </View>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {title || 'Announcement Title'}
            </Text>
            <Text style={styles.previewContent} numberOfLines={3}>
              {message || 'Your announcement message will appear here...'}
            </Text>
            <View style={[
              styles.previewPriority,
              { backgroundColor: PRIORITIES.find(p => p.key === priority)?.color + '20' }
            ]}>
              <Text style={{ color: PRIORITIES.find(p => p.key === priority)?.color, fontSize: 11, fontWeight: '600' }}>
                {PRIORITIES.find(p => p.key === priority)?.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!title || !message) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!title || !message}
              >
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Announcement' : 'Publish Announcement'}
                </Text>
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={COLORS.danger} />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete Announcement</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {},
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 140,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 4,
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  optionText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFF',
  },
  priorityRow: {
    flexDirection: 'row',
  },
  priorityButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  priorityText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  priorityTextActive: {
    color: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dateButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewPinned: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFF176',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  previewContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  previewPriority: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  expiryOption: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  expiryOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  expiryOptionText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  expiryOptionTextActive: {
    color: '#FFF',
  },
  expiryNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    paddingVertical: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
