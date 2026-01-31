import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const logo = require('../../assets/JanMitra-logo.jpg'); // Full branding with text

type RouteName = 'Login' | 'RegisterUser' | 'RegisterSociety';

export default function Landing({ onNavigate }: Readonly<{ onNavigate?: (route: RouteName) => void }>) {
  const navigate = onNavigate || (() => {});
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logoLarge} resizeMode="cover" />
        </View>
        <Text style={styles.appName}>JanMitra</Text>
        <Text style={styles.tagline}>AI-Powered Civic Issue Resolution</Text>
      </View>

      {/* Main Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Transform Your Community</Text>
        <Text style={styles.subtitle}>Report civic issues with just a photo. AI analyzes, routes to NGOs, and tracks resolution - all in real-time.</Text>
        
        <View style={styles.featureGrid}>
          <View style={styles.featurePill}>
            <Ionicons name="camera-outline" size={18} color="#7DD3FC" />
            <Text style={styles.featureText}>Photo-Only</Text>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="sparkles-outline" size={18} color="#7DD3FC" />
            <Text style={styles.featureText}>AI Powered</Text>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="flash-outline" size={18} color="#7DD3FC" />
            <Text style={styles.featureText}>Real-time</Text>
          </View>
        </View>
      </View>

      {/* CTA Buttons */}
      <View style={styles.ctaSection}>
        <TouchableOpacity style={styles.primaryCta} onPress={() => navigate('RegisterUser')}>
          <View style={styles.ctaTitleRow}>
            <Ionicons name="person-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryCtaText}>Get Started as Resident</Text>
          </View>
          <Text style={styles.ctaSubtext}>Report issues in your society</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryCta} onPress={() => navigate('RegisterSociety')}>
          <View style={styles.ctaTitleRow}>
            <Ionicons name="business-outline" size={20} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryCtaText}>Register Your Society</Text>
          </View>
          <Text style={styles.ctaSubtext}>Become a society head</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigate('Login')}>
          <View style={styles.linkRow}>
            <Ionicons name="log-in-outline" size={16} color="#7DD3FC" style={{ marginRight: 6 }} />
            <Text style={styles.linkText}>Already have an account? Login</Text>
            <Ionicons name="arrow-forward" size={16} color="#7DD3FC" style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        
        <View style={styles.featureCard}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.featureCardContent}>
            <Text style={styles.featureCardTitle}>Take a Photo</Text>
            <Text style={styles.featureCardDesc}>Snap a picture of the civic issue - no typing needed</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.featureCardContent}>
            <Text style={styles.featureCardTitle}>AI Classification</Text>
            <Text style={styles.featureCardDesc}>Our AI automatically identifies and categorizes the problem</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.featureCardContent}>
            <Text style={styles.featureCardTitle}>NGO Resolution</Text>
            <Text style={styles.featureCardDesc}>Routed to relevant NGOs and tracked until resolved</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A0E27' 
  },
  content: { 
    paddingBottom: 40 
  },

  // Header Section
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  logoContainer: { 
    backgroundColor: '#ffffff', 
    padding: 10, 
    borderRadius: 16, 
    overflow: 'hidden', 
    width: 100, 
    height: 100, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoLarge: { 
    width: 80, 
    height: 80 
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#7DD3FC',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Hero Section
  hero: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.2)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#B4C7E7',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  featurePill: {
    backgroundColor: 'rgba(125, 211, 252, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.3)',
  },
  featureText: {
    color: '#7DD3FC',
    fontSize: 13,
    fontWeight: '600',
  },

  ctaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 32,
  },
  primaryCta: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  ctaSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  secondaryCta: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  secondaryCtaText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#7DD3FC',
    fontSize: 14,
    fontWeight: '600',
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.2)',
  },
  stepNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#10B981',
    width: 50,
    textAlign: 'center',
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureCardDesc: {
    fontSize: 14,
    color: '#B4C7E7',
    lineHeight: 20,
  },
});
