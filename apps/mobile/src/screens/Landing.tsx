import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import logo from '../../assets/JanMitra-logo.jpg';

type RouteName = 'Login' | 'RegisterUser' | 'RegisterSociety';

export default function Landing({ onNavigate }: Readonly<{ onNavigate?: (route: RouteName) => void }>) {
  const navigate = onNavigate || (() => {});

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(slideUpAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const primaryBtnScale = useRef(new Animated.Value(1)).current;
  const secondaryBtnScale = useRef(new Animated.Value(1)).current;
  const loginBtnScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F0F1A', '#1A1A2E', '#16213E']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Logo - Top Position */}
          <Animated.View
            style={[
              styles.headerSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <View style={styles.headerContainer}>
              <View style={styles.logoWrapper}>
                <Image source={logo} style={styles.headerLogo} resizeMode="cover" />
              </View>
              <View style={styles.brandInfo}>
                <Text style={styles.appName}>JanMitra</Text>
                <Text style={styles.tagline}>Your Voice, Our Mission</Text>
              </View>
            </View>
          </Animated.View>

          {/* Hero Section - Without Logo */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Modern Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroCardHeader}>
                <View style={styles.badge}>
                  <Ionicons name="sparkles" size={12} color="#FFD700" />
                  <Text style={styles.badgeText}>AI-Powered</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>
                Report. Resolve.{'\n'}Transform.
              </Text>
              <Text style={styles.heroSubtitle}>
                Snap a photo of civic issues. Our AI identifies, routes to NGOs, 
                and tracks resolution in real-time.
              </Text>
              
              {/* Feature Pills */}
              <View style={styles.featurePills}>
                <View style={styles.pill}>
                  <Ionicons name="camera" size={14} color="#00D9FF" />
                  <Text style={styles.pillText}>Photo Report</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="analytics" size={14} color="#00D9FF" />
                  <Text style={styles.pillText}>Smart Analysis</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="people" size={14} color="#00D9FF" />
                  <Text style={styles.pillText}>NGO Network</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* CTA Buttons */}
          <Animated.View
            style={[
              styles.ctaContainer,
              {
                opacity: buttonAnim,
                transform: [
                  {
                    translateY: buttonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Primary CTA - Resident */}
            <Animated.View style={{ transform: [{ scale: primaryBtnScale }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigate('RegisterUser')}
                onPressIn={() => handlePressIn(primaryBtnScale)}
                onPressOut={() => handlePressOut(primaryBtnScale)}
              >
                <LinearGradient
                  colors={['#00D9FF', '#0099FF', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconBox}>
                      <Ionicons name="person" size={20} color="#0A0E27" />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.primaryButtonText}>Join as Resident</Text>
                      <Text style={styles.buttonSubtext}>Report issues in your area</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#0A0E27" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Secondary CTA - Society */}
            <Animated.View style={{ transform: [{ scale: secondaryBtnScale }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigate('RegisterSociety')}
                onPressIn={() => handlePressIn(secondaryBtnScale)}
                onPressOut={() => handlePressOut(secondaryBtnScale)}
              >
                <View style={styles.secondaryButton}>
                  <View style={styles.buttonContent}>
                    <View style={[styles.iconBox, styles.iconBoxSecondary]}>
                      <Ionicons name="business" size={20} color="#10B981" />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.secondaryButtonText}>Register Society</Text>
                      <Text style={[styles.buttonSubtext, styles.buttonSubtextSecondary]}>
                        Manage your community
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#10B981" />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <Animated.View style={{ transform: [{ scale: loginBtnScale }] }}>
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigate('Login')}
                onPressIn={() => handlePressIn(loginBtnScale)}
                onPressOut={() => handlePressOut(loginBtnScale)}
              >
                <Text style={styles.loginText}>Already a member?</Text>
                <Text style={styles.loginHighlight}> Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* How It Works Section */}
          <Animated.View
            style={[
              styles.featuresSection,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>How It Works</Text>
            
            {/* Step Cards */}
            <View style={styles.stepsContainer}>
              <View style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name="camera-outline" size={24} color="#00D9FF" />
                  </View>
                  <Text style={styles.stepTitle}>Capture</Text>
                  <Text style={styles.stepDesc}>
                    Take a photo of any civic issue in your neighborhood
                  </Text>
                </View>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name="bulb-outline" size={24} color="#00D9FF" />
                  </View>
                  <Text style={styles.stepTitle}>AI Analysis</Text>
                  <Text style={styles.stepDesc}>
                    Our smart system categorizes and prioritizes the issue
                  </Text>
                </View>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#00D9FF" />
                  </View>
                  <Text style={styles.stepTitle}>Get Resolved</Text>
                  <Text style={styles.stepDesc}>
                    Issue is routed to NGOs and tracked until completion
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Issues Resolved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>NGOs Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50+</Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 JanMitra</Text>
            <Text style={styles.footerSubtext}>Building better communities together</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },

  // Header Section - Improved logo and name in one line
  headerSection: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  brandInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#00D9FF',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Hero Section - Adjusted for new logo position
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Hero Card
  heroCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
    marginBottom: 20,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.25)',
  },
  pillText: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '600',
  },

  // CTA Section
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    gap: 14,
  },
  primaryButton: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconBoxSecondary: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#0A0E27',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonSubtext: {
    color: 'rgba(10, 14, 39, 0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  buttonSubtextSecondary: {
    color: 'rgba(16, 185, 129, 0.7)',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  loginHighlight: {
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    color: '#00D9FF',
    fontSize: 18,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    marginHorizontal: 20,
    marginTop: 40,
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.15)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00D9FF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 30,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
  footerSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginTop: 4,
  },
});
