import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api';
import { useLocalAuth } from '../auth/useLocalAuth';
import { COLORS } from '../constants/theme';

type PaidOrganization = {
  id: string;
  name: string;
  businessType?: string;
  industryType?: string;
  description?: string;
  website?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  workItems?: string[];
};

type PaidOrganizationsProps = {
  onBack: () => void;
  societyName?: string;
};

export default function PaidOrganizations({ onBack, societyName }: PaidOrganizationsProps) {
  const { accessToken, user } = useLocalAuth();
  const [organizations, setOrganizations] = useState<PaidOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<PaidOrganization | null>(null);

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [society, setSociety] = useState(societyName || '');
  const [serviceNeeded, setServiceNeeded] = useState('');
  const [notes, setNotes] = useState('');

  const subtitle = useMemo(() => {
    if (!selectedOrg) return '';
    const bits = [selectedOrg.businessType, selectedOrg.industryType].filter(Boolean);
    return bits.join(' | ');
  }, [selectedOrg]);

  async function loadOrganizations() {
    if (!accessToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await apiFetch('/v1/orgs/paid-organizations', accessToken);
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to load organizations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, [accessToken]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrganizations();
  };

  const openBookingForm = (org: PaidOrganization) => {
    setSelectedOrg(org);
    if (Array.isArray(org.workItems) && org.workItems.length > 0) {
      setServiceNeeded((current) => current || org.workItems![0]);
    }
  };

  const closeBookingForm = () => {
    setSelectedOrg(null);
    setServiceNeeded('');
    setNotes('');
  };

  const submitBooking = async () => {
    if (!selectedOrg) return;
    if (!accessToken) {
      Alert.alert('Session Expired', 'Please login again to submit booking.');
      return;
    }
    if (!fullName.trim() || !phone.trim() || !serviceNeeded.trim()) {
      Alert.alert('Required Fields', 'Please enter name, phone and service requirement.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/v1/orgs/${selectedOrg.id}/bookings`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          societyName: society.trim(),
          serviceNeeded: serviceNeeded.trim(),
          notes: notes.trim(),
        }),
      });

      Alert.alert('Booking Submitted', `Your request has been sent to ${selectedOrg.name}.`);
      closeBookingForm();
    } catch (error: any) {
      Alert.alert('Booking Failed', error?.message || 'Could not submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Paid Organizations</Text>
        <Text style={styles.subtitle}>Book verified organizations for society services</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading organizations...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {organizations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No organizations found</Text>
              <Text style={styles.emptyText}>Please try again later.</Text>
            </View>
          ) : (
            organizations.map((org) => (
              <View key={org.id} style={styles.orgCard}>
                <View style={styles.orgHeader}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <TouchableOpacity style={styles.bookNowButton} onPress={() => openBookingForm(org)}>
                    <Text style={styles.bookNowText}>Book Now</Text>
                  </TouchableOpacity>
                </View>

                {!!org.description && <Text style={styles.orgDescription}>{org.description}</Text>}

                {!!org.businessType && (
                  <Text style={styles.metaText}>Business Type: {org.businessType}</Text>
                )}
                {!!org.industryType && (
                  <Text style={styles.metaText}>Industry: {org.industryType}</Text>
                )}
                {!!org.address && <Text style={styles.metaText}>Address: {org.address}</Text>}
                {!!org.contactPhone && <Text style={styles.metaText}>Phone: {org.contactPhone}</Text>}

                {Array.isArray(org.workItems) && org.workItems.length > 0 && (
                  <View style={styles.workItemsRow}>
                    {org.workItems.map((work, index) => (
                      <View key={`${org.id}-${index}`} style={styles.workChip}>
                        <Text style={styles.workChipText}>{work}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}

          {selectedOrg && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Booking Details</Text>
              <Text style={styles.formOrgName}>{selectedOrg.name}</Text>
              {!!subtitle && <Text style={styles.formSubtitle}>{subtitle}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={fullName}
                onChangeText={setFullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Email (optional)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Society name"
                value={society}
                onChangeText={setSociety}
              />
              <TextInput
                style={styles.input}
                placeholder="Service needed (example: house cleaning)"
                value={serviceNeeded}
                onChangeText={setServiceNeeded}
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Enter your Address, (example: plot no/building no 123, near XYZ, city name)"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeBookingForm}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={submitBooking}
                  disabled={submitting}
                >
                  <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Booking'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
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
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backText: {
    marginLeft: 6,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    marginTop: 4,
    color: COLORS.textSecondary,
  },
  orgCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  orgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  orgName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  orgDescription: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 19,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  bookNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookNowText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  workItemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  workChip: {
    backgroundColor: '#E8F1FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  workChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  formOrgName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  formSubtitle: {
    marginTop: 2,
    marginBottom: 8,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: '#fff',
    color: COLORS.text,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  formActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
