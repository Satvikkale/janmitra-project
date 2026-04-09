import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useLocalAuth } from '../auth/useLocalAuth';
import { apiFetch } from '../api';

const COLORS = {
  primary: '#1976D2',
  success: '#4CAF50',
  danger: '#F44336',
  background: '#F5F6FA',
  card: '#FFF',
  text: '#222',
  textSecondary: '#666',
  border: '#E0E0E0',
};

type RaiseComplaintProps = {
  onComplaintRaised?: () => void;
  onBack?: () => void;
};

export default function RaiseComplaint({ onComplaintRaised, onBack }: RaiseComplaintProps) {
  const { accessToken } = useLocalAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'fetching' | 'acquired' | 'error'>('pending');

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationStatus('granted');
        } else {
          setLocationStatus('denied');
        }
      } catch (err) {
        console.error('Location permission error:', err);
        setLocationStatus('error');
      }
    })();
  }, []);

  // Capture current location
  async function captureLocation() {
    try {
      // Check permission again in case it changed
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      setLocationStatus('fetching');
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setLocationStatus('acquired');
      console.log('Location captured:', loc.coords.latitude, loc.coords.longitude);
    } catch (err) {
      console.error('Error getting location:', err);
      setLocationStatus('error');
    }
  }

  async function requestPermissions() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to report issues',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }

  async function takePhoto() {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        // Capture location when photo is taken
        captureLocation();
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  }

  async function pickFromGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        // Capture location when photo is selected
        captureLocation();
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  }

  async function submitComplaint() {
    if (!photo) {
      Alert.alert('Photo Required', 'Please take a photo of the issue');
      return;
    }

    try {
      const token = accessToken || await SecureStore.getItemAsync('jm_access');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again before submitting a complaint.');
        return;
      }

      setUploading(true);
      setAnalyzing(true);

      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create FormData for file upload
      const formData = new FormData();
      const filename = photo.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri: photo,
        name: filename,
        type,
      } as any);

      // Append location data if available
      if (location) {
        formData.append('latitude', location.lat.toString());
        formData.append('longitude', location.lng.toString());
      }

      // Submit complaint
      const API_BASE = (Constants.expoConfig?.extra as any)?.apiBase || 'http://10.41.35.168:4000';
      const response = await fetch(
        `${API_BASE}/v1/complaints`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to submit complaint');
      }

      const result = await response.json();
      console.log('Complaint submitted:', result);

      setAnalyzing(false);
      Alert.alert(
        'Issue Reported',
        `Your complaint has been submitted successfully.\n\nCategory: ${result.category || 'General'}\nStatus: Pending Review`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPhoto(null);
              onComplaintRaised?.();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to submit complaint');
      setAnalyzing(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <Text style={styles.title}>Report an Issue</Text>
          <Text style={styles.subtitle}>Take a photo to report problems</Text>
        </View>

        {/* AI Processing Animation */}
        {analyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.analyzingText}>AI is analyzing your photo...</Text>
            </View>
            <Text style={styles.analyzingSubtext}>Detecting issue type and severity</Text>
          </View>
        )}

        {/* Photo Preview or Camera Prompt */}
        {!photo ? (
          <View style={styles.promptContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.promptTitle}>Snap & Report</Text>
            <Text style={styles.promptMessage}>
              Take a photo of the issue. Our AI will automatically classify and route it to the right organization.
            </Text>

            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.cameraButtonText}>Open Camera</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="images-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />

            {/* Location Status Indicator */}
            <View style={styles.locationContainer}>
              {locationStatus === 'fetching' && (
                <View style={styles.locationRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.locationText}>Fetching location...</Text>
                </View>
              )}
              {locationStatus === 'acquired' && location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={18} color={COLORS.success} style={{ marginRight: 6 }} />
                  <Text style={[styles.locationText, { color: COLORS.success }]}>
                    Location captured: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </Text>
                </View>
              )}
              {locationStatus === 'denied' && (
                <TouchableOpacity style={styles.locationRow} onPress={() => {
                  Alert.alert(
                    'Location Permission',
                    'Location access helps us pinpoint the issue. Please enable it in your device settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                  );
                }}>
                  <Ionicons name="location-outline" size={18} color={COLORS.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.locationText, { color: COLORS.danger }]}>
                    Location denied — Tap to enable
                  </Text>
                </TouchableOpacity>
              )}
              {locationStatus === 'error' && (
                <TouchableOpacity style={styles.locationRow} onPress={captureLocation}>
                  <Ionicons name="warning-outline" size={18} color="#EF6C00" style={{ marginRight: 6 }} />
                  <Text style={[styles.locationText, { color: '#EF6C00' }]}>
                    Location error — Tap to retry
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => { setPhoto(null); setLocation(null); setLocationStatus('granted'); }}
                disabled={uploading}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="refresh" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.retakeText}>Retake Photo</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
                onPress={submitComplaint}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Submit Issue</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="bulb-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            1. Take a clear photo of the issue{'\n'}
            2. AI identifies the problem automatically{'\n'}
            3. We route it to the right organization{'\n'}
            4. Track progress in "My Issues"
          </Text>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  analyzingContainer: {
    backgroundColor: COLORS.card,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  promptContainer: {
    backgroundColor: COLORS.card,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 48,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  promptMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  cameraButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  galleryButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  galleryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    marginBottom: 24,
  },
  photoPreview: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: COLORS.border,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  retakeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 8,
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
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
});
