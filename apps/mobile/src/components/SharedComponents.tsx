import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  View,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { Icon } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Button({ 
  title, 
  onPress, 
  disabled, 
  loading, 
  variant = 'primary',
  size = 'md',
  style 
}: ButtonProps) {
  const buttonStyles = [
    styles.button,
    styles[`button_${size}`],
    styles[`button_${variant}`],
    disabled && styles.button_disabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${size}`],
    variant === 'outline' && styles.buttonText_outline,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? COLORS.primary : '#FFF'} 
          size="small" 
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusColor = (s: string) => {
    const normalized = s === 'open' ? 'pending' : s;
    switch (normalized) {
      case 'pending': return COLORS.statusPending;
      case 'in-progress': case 'in_progress': return COLORS.statusInProgress;
      case 'resolved': return COLORS.statusResolved;
      case 'rejected': return COLORS.statusRejected;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusLabel = (s: string) => {
    const normalized = s === 'open' ? 'pending' : s;
    switch (normalized) {
      case 'pending': return 'Pending';
      case 'in-progress': case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'rejected': return 'Rejected';
      default: return s;
    }
  };

  const badgeStyles = [
    styles.badge,
    size === 'sm' && styles.badge_sm,
    { backgroundColor: getStatusColor(status) },
  ];

  const textStyles = [
    styles.badgeText,
    size === 'sm' && styles.badgeText_sm,
  ];

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{getStatusLabel(status)}</Text>
    </View>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  style?: ViewStyle;
}

export function Header({ title, subtitle, onBack, style }: HeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
}

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      {icon && <Icon name={icon} size={64} color={COLORS.textLight} />}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

interface LoadingProps {
  message?: string;
}

export function Loading({ message }: LoadingProps) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Button styles
  button: {
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  button_sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  button_md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  button_lg: {
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.xl,
  },
  button_primary: {
    backgroundColor: COLORS.primary,
  },
  button_secondary: {
    backgroundColor: COLORS.textSecondary,
  },
  button_success: {
    backgroundColor: COLORS.success,
  },
  button_danger: {
    backgroundColor: COLORS.danger,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  button_disabled: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: TYPOGRAPHY.fontWeights.semiBold,
  },
  buttonText_sm: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  buttonText_md: {
    fontSize: TYPOGRAPHY.fontSizes.base,
  },
  buttonText_lg: {
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  buttonText_outline: {
    color: COLORS.primary,
  },

  // Badge styles
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  badge_sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.semiBold,
  },
  badgeText_sm: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
  },

  // Header styles
  header: {
    padding: SPACING.base,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  backText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginLeft: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text,
    marginTop: SPACING.base,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Loading styles
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSizes.base,
  },
});
