// Shared theme constants for consistent styling across the app
export const COLORS = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  success: '#4CAF50',
  successLight: '#81C784',
  warning: '#FF9800',
  warningLight: '#FFB74D',
  danger: '#F44336',
  dangerLight: '#E57373',
  background: '#F5F6FA',
  card: '#FFFFFF',
  text: '#222222',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Status colors
  statusPending: '#FF9800',
  statusInProgress: '#1976D2',
  statusResolved: '#4CAF50',
  statusRejected: '#F44336',
  
  // Background variants
  bgPending: '#FFF3E0',
  bgInProgress: '#E3F2FD',
  bgResolved: '#E8F5E9',
  bgRejected: '#FFEBEE',
};

export const TYPOGRAPHY = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Icon configurations using MaterialIcons/MaterialCommunityIcons from @expo/vector-icons
export const ICON_NAMES = {
  // Navigation
  back: 'arrow-back',
  forward: 'arrow-forward',
  close: 'close',
  
  // Actions
  camera: 'photo-camera',
  gallery: 'photo-library',
  refresh: 'refresh',
  settings: 'settings',
  logout: 'logout',
  edit: 'edit',
  delete: 'delete',
  add: 'add',
  
  // Status indicators
  pending: 'schedule',
  inProgress: 'autorenew',
  resolved: 'check-circle',
  rejected: 'cancel',
  approved: 'check-circle',
  
  // Categories
  society: 'domain',
  user: 'person',
  admin: 'admin-panel-settings',
  complaint: 'report-problem',
  dashboard: 'dashboard',
  
  // Info
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'check-circle',
  lightbulb: 'lightbulb',
  
  // Contact & Details
  email: 'email',
  phone: 'phone',
  location: 'location-on',
  calendar: 'event',
  
  // UI Elements
  menu: 'menu',
  search: 'search',
  filter: 'filter-list',
  sort: 'sort',
  notifications: 'notifications',
  
  // Content
  image: 'image',
  document: 'description',
  folder: 'folder',
  
  // Social/Community
  announcement: 'campaign',
  members: 'groups',
  chat: 'chat',
};

// Status mappings
export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: COLORS.statusPending,
    bg: COLORS.bgPending,
    icon: 'schedule' as const,
  },
  'in-progress': {
    label: 'In Progress',
    color: COLORS.statusInProgress,
    bg: COLORS.bgInProgress,
    icon: 'autorenew' as const,
  },
  resolved: {
    label: 'Resolved',
    color: COLORS.statusResolved,
    bg: COLORS.bgResolved,
    icon: 'check-circle' as const,
  },
  rejected: {
    label: 'Rejected',
    color: COLORS.statusRejected,
    bg: COLORS.bgRejected,
    icon: 'cancel' as const,
  },
  open: {
    label: 'Pending',
    color: COLORS.statusPending,
    bg: COLORS.bgPending,
    icon: 'schedule' as const,
  },
};

// Severity levels
export const SEVERITY_CONFIG = {
  high: {
    label: 'High',
    color: COLORS.danger,
    bg: COLORS.bgRejected,
    icon: 'error' as const,
  },
  medium: {
    label: 'Medium',
    color: COLORS.warning,
    bg: COLORS.bgPending,
    icon: 'warning' as const,
  },
  low: {
    label: 'Low',
    color: COLORS.success,
    bg: COLORS.bgResolved,
    icon: 'check-circle' as const,
  },
};
