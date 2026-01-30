import { STATUS_CONFIG, SEVERITY_CONFIG } from '../constants/theme';

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', options || { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateObj);
}

/**
 * Normalize status from backend (map 'open' to 'pending')
 */
export function normalizeStatus(status: string): 'pending' | 'in-progress' | 'resolved' | 'rejected' {
  if (status === 'open') return 'pending';
  if (status === 'in_progress') return 'in-progress';
  return status as 'pending' | 'in-progress' | 'resolved' | 'rejected';
}

/**
 * Denormalize status for backend (map 'pending' to 'open')
 */
export function denormalizeStatus(status: string): string {
  if (status === 'pending') return 'open';
  if (status === 'in-progress') return 'in_progress';
  return status;
}

/**
 * Get status display configuration
 */
export function getStatusConfig(status: string) {
  const normalized = normalizeStatus(status);
  return STATUS_CONFIG[normalized] || STATUS_CONFIG.pending;
}

/**
 * Get severity display configuration
 */
export function getSeverityConfig(severity: string) {
  const normalized = severity?.toLowerCase() || 'medium';
  return SEVERITY_CONFIG[normalized as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  if (role === 'society_head') return 'Society Head';
  if (role === 'resident') return 'Resident';
  return capitalize(role);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
