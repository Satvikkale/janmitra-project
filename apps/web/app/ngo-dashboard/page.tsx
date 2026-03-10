'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { apiFetch, getImageUrl } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

interface NGOProfile {
  _id: string;
  name: string;
  subtype: string;
  city: string;
  categories: string[];
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  registrationNumber: string;
  establishedYear: number;
  website: string;
  description: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  status: string;
  tags: string[];
  maxParticipants?: number;
  currentParticipants: number;
  contactEmail?: string;
  contactPhone?: string;
  imageUrl?: string;
}

interface EventStats {
  totalEvents: number;
  statusBreakdown: {
    upcoming?: number;
    ongoing?: number;
    completed?: number;
    cancelled?: number;
  };
}

interface NgoEmployee {
  _id: string;
  ngoName: string;
  name: string;
  position: string;
  mobileNo: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProgressUpdate {
  _id: string;
  date: string;
  description: string;
  photos: string[];
  updatedBy: string;
  updatedByName: string;
}

interface Notification {
  _id: string;
  recipientId: string;
  recipientType: 'ngo' | 'ngo-user' | 'user';
  type: 'complaint_received' | 'complaint_assigned' | 'complaint_updated' | 'complaint_resolved';
  title: string;
  message: string;
  data?: {
    complaintId?: string;
    category?: string;
    status?: string;
    assignedBy?: string;
    orgId?: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export default function NgoDashboard() {
  const [profile, setProfile] = useState<NGOProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<NgoEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatuses, setUpdatingStatuses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'complaints' | 'manage-employees'>('profile');
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState<Partial<NGOProfile>>({});
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    maxParticipants: '',
    contactEmail: '',
    contactPhone: '',
    tags: ''
  });
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    position: '',
    mobileNo: '',
    password: ''
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [assigningComplaint, setAssigningComplaint] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [selectedProgressComplaint, setSelectedProgressComplaint] = useState<any>(null);
  const { isLoggedIn } = useAuth();

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch('/v1/orgs/my-profile');
      setProfile(data);
      setProfileFormData(data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Failed to fetch profile data');
    }
  };

  const fetchEvents = async () => {
    try {
      const [eventsData, statsData] = await Promise.all([
        apiFetch('/v1/events/my-events'),
        apiFetch('/v1/events/my-stats')
      ]);
      setEvents(eventsData);
      setEventStats(statsData);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch events data');
    }
  };

  const fetchEmployees = async () => {
    try {
      const employeesData = await apiFetch('/v1/ngo-users/my-employees');
      setEmployees(employeesData);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError('Failed to fetch employees data');
    }
  };

  const fetchComplaints = async () => {
    try {
      const complaintsData = await apiFetch('/v1/complaints');
      setComplaints(complaintsData);
    } catch (err: any) {
      console.error('Error fetching complaints:', err);
      setError('Failed to fetch complaints data');
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const [notificationsData, countData] = await Promise.all([
        apiFetch('/v1/notifications'),
        apiFetch('/v1/notifications/unread/count')
      ]);
      setNotifications(notificationsData);
      setUnreadCount(countData.count);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiFetch(`/v1/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await apiFetch('/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'complaint_received':
        return (
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'complaint_assigned':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'complaint_resolved':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const formatTimeAgo = (dateString: string) => {
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
  };

  const handleAssignComplaint = async (employeeId: string) => {
    if (!selectedComplaint) return;
    try {
      setAssigningComplaint(true);
      await apiFetch(`/v1/complaints/${selectedComplaint._id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: employeeId })
      });
      await fetchComplaints();
      setShowAssignModal(false);
      setSelectedComplaint(null);
      setError(null);
    } catch (err: any) {
      console.error('Error assigning complaint:', err);
      setError('Failed to assign complaint');
    } finally {
      setAssigningComplaint(false);
    }
  };

  const openAssignModal = (complaint: any) => {
    setSelectedComplaint(complaint);
    setShowAssignModal(true);
  };

  const fetchProgressUpdates = async (complaint: any) => {
    try {
      setLoadingProgress(true);
      setSelectedProgressComplaint(complaint);
      const data = await apiFetch(`/v1/complaints/${complaint._id}/progress`);
      setProgressUpdates(data);
      setShowProgressModal(true);
    } catch (err: any) {
      console.error('Error fetching progress updates:', err);
      setError('Failed to fetch progress updates');
    } finally {
      setLoadingProgress(false);
    }
  };

  const triggerEventStatusUpdate = async () => {
    try {
      setUpdatingStatuses(true);
      await apiFetch('/v1/events/update-statuses', {
        method: 'POST'
      });
      await Promise.all([fetchEvents()]);
    } catch (err: any) {
      console.error('Error updating event statuses:', err);
    } finally {
      setUpdatingStatuses(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      triggerEventStatusUpdate();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === 'events' && isLoggedIn) {
      triggerEventStatusUpdate();
    }
  }, [activeTab, isLoggedIn]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isLoggedIn) {
        triggerEventStatusUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      Promise.all([fetchProfile(), fetchEvents(), fetchEmployees(), fetchComplaints(), fetchNotifications()])
        .finally(() => setLoading(false));
    }
  }, [isLoggedIn]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedProfile = await apiFetch('/v1/orgs/my-profile', {
        method: 'PUT',
        body: JSON.stringify(profileFormData)
      });
      setProfile(updatedProfile);
      setEditingProfile(false);
      setError(null);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  const handleEventCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventData = {
        ...eventFormData,
        maxParticipants: eventFormData.maxParticipants ? parseInt(eventFormData.maxParticipants) : undefined,
        tags: eventFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      await apiFetch('/v1/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
      setEventFormData({
        title: '',
        description: '',
        date: '',
        location: '',
        maxParticipants: '',
        contactEmail: '',
        contactPhone: '',
        tags: ''
      });
      setShowEventForm(false);
      await fetchEvents();
      setError(null);
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError('Failed to create event');
    }
  };

  const handleEmployeeCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const employeeData = {
        ...employeeFormData,
        ngoName: profile?.name
      };
      await apiFetch('/v1/auth/register-ngo-user', {
        method: 'POST',
        body: JSON.stringify(employeeData)
      });
      setEmployeeFormData({
        name: '',
        position: '',
        mobileNo: '',
        password: ''
      });
      setShowEmployeeForm(false);
      await fetchEmployees();
      setError(null);
    } catch (err: any) {
      console.error('Error creating employee:', err);
      setError('Failed to create employee');
    }
  };

  const handleEmployeeRemove = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee?')) return;
    try {
      await apiFetch(`/v1/ngo-users/${employeeId}`, {
        method: 'DELETE'
      });
      await fetchEmployees();
      setError(null);
    } catch (err: any) {
      console.error('Error removing employee:', err);
      setError('Failed to remove employee');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-sky-50 text-sky-700';
      case 'ongoing': return 'bg-emerald-50 text-emerald-700';
      case 'completed': return 'bg-slate-100 text-slate-600';
      case 'cancelled': return 'bg-rose-50 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-amber-50 text-amber-800 px-6 py-4 rounded-lg text-center">
          Please log in to access your NGO dashboard.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex justify-between items-start"
        >
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Welcome, {profile?.contactPersonName || 'NGO User'}
            </p>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-sm text-teal-600 hover:text-teal-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-72">
                  {loadingNotifications ? (
                    <div className="p-4 text-center text-slate-500">
                      <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => !notification.isRead && markNotificationAsRead(notification._id)}
                        className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="flex-shrink-0">
                              <span className="w-2 h-2 bg-teal-500 rounded-full block"></span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {error && (
          <div className="mb-4 bg-rose-50 text-rose-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-800 hover:underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="flex gap-6 overflow-x-auto">
            {[
              { key: 'complaints', label: 'Complaints', count: complaints.length },
              { key: 'events', label: 'Events', count: events.length },
              { key: 'manage-employees', label: 'Employees', count: employees.length },
              { key: 'profile', label: 'Profile' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label} {tab.count !== undefined && `(${tab.count})`}
              </button>
            ))}
          </nav>
        </div>

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-800">Complaints</h2>
              <button
                onClick={fetchComplaints}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Refresh
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">
                No complaints assigned yet.
              </div>
            ) : (
              <>
                {/* Unresolved Complaints Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-slate-700">Unresolved</h3>
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {complaints.filter(c => c.status !== 'resolved').length}
                    </span>
                  </div>
                  {complaints.filter(c => c.status !== 'resolved').length === 0 ? (
                    <div className="bg-white rounded-lg p-6 text-center text-slate-500 text-sm">
                      No unresolved complaints.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {complaints.filter(c => c.status !== 'resolved').map((complaint) => {
                        const assignedEmployee = employees.find(e => e._id === complaint.assignedTo);
                        return (
                          <div key={complaint._id} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-amber-400">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-slate-800">{complaint.category}</span>
                                  {complaint.subcategory && (
                                    <span className="text-slate-400 text-sm">/ {complaint.subcategory}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 mb-3">{complaint.description || 'No description'}</p>
                                <div className="flex flex-wrap gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    complaint.status === 'open' ? 'bg-amber-50 text-amber-700' :
                                    complaint.status === 'assigned' ? 'bg-sky-50 text-sky-700' :
                                    complaint.status === 'in_progress' ? 'bg-violet-50 text-violet-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {complaint.status?.replace('_', ' ')}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    complaint.priority === 'high' ? 'bg-rose-50 text-rose-700' :
                                    complaint.priority === 'med' ? 'bg-orange-50 text-orange-700' :
                                    'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {complaint.priority}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Assigned to</p>
                                  <p className="text-sm font-medium text-slate-700">
                                    {assignedEmployee?.name || 'Unassigned'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => openAssignModal(complaint)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm"
                                >
                                  {complaint.assignedTo ? 'Reassign' : 'Assign'}
                                </button>
                                {complaint.status === 'in_progress' && (
                                  <button
                                    onClick={() => fetchProgressUpdates(complaint)}
                                    className="bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-2 rounded-lg text-sm"
                                  >
                                    View Progress
                                  </button>
                                )}
                              </div>
                            </div>
                            {complaint.progressUpdates && complaint.progressUpdates.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-xs text-violet-600 font-medium">
                                  {complaint.progressUpdates.length} progress update{complaint.progressUpdates.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Resolved Complaints Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-slate-700">Resolved</h3>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {complaints.filter(c => c.status === 'resolved').length}
                    </span>
                  </div>
                  {complaints.filter(c => c.status === 'resolved').length === 0 ? (
                    <div className="bg-white rounded-lg p-6 text-center text-slate-500 text-sm">
                      No resolved complaints yet.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {complaints.filter(c => c.status === 'resolved').map((complaint) => {
                        const assignedEmployee = employees.find(e => e._id === complaint.assignedTo);
                        return (
                          <div key={complaint._id} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-emerald-400">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-slate-800">{complaint.category}</span>
                                  {complaint.subcategory && (
                                    <span className="text-slate-400 text-sm">/ {complaint.subcategory}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 mb-3">{complaint.description || 'No description'}</p>
                                <div className="flex flex-wrap gap-2">
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                                    resolved
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    complaint.priority === 'high' ? 'bg-rose-50 text-rose-700' :
                                    complaint.priority === 'med' ? 'bg-orange-50 text-orange-700' :
                                    'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {complaint.priority}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Resolved by</p>
                                  <p className="text-sm font-medium text-slate-700">
                                    {assignedEmployee?.name || 'Unknown'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => fetchProgressUpdates(complaint)}
                                  className="bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-2 rounded-lg text-sm"
                                >
                                  View Progress
                                </button>
                              </div>
                            </div>
                            {complaint.progressUpdates && complaint.progressUpdates.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-xs text-violet-600 font-medium">
                                  {complaint.progressUpdates.length} progress update{complaint.progressUpdates.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Progress Modal */}
        {showProgressModal && selectedProgressComplaint && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Progress Updates</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedProgressComplaint.category}
                    {selectedProgressComplaint.subcategory && ` / ${selectedProgressComplaint.subcategory}`}
                  </p>
                </div>
                <button
                  onClick={() => { setShowProgressModal(false); setSelectedProgressComplaint(null); setProgressUpdates([]); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingProgress ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent"></div>
                </div>
              ) : progressUpdates.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No progress updates yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {progressUpdates.map((update, index) => (
                    <div key={update._id || index} className="relative pl-6 pb-6 border-l-2 border-violet-200 last:pb-0">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-violet-500 border-2 border-white"></div>
                      
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-slate-700">{update.updatedByName || 'NGO Employee'}</p>
                          <p className="text-xs text-slate-500">{formatDate(update.date)}</p>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{update.description}</p>
                        
                        {update.photos && update.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {update.photos.map((photo, photoIndex) => (
                              <a
                                key={photoIndex}
                                href={getImageUrl(photo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={getImageUrl(photo)}
                                  alt={`Progress photo ${photoIndex + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:border-violet-400 transition-colors"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setShowProgressModal(false); setSelectedProgressComplaint(null); setProgressUpdates([]); }}
                className="mt-6 w-full py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && selectedComplaint && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Assign Complaint</h2>
              {employees.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No employees available.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {employees.map((employee) => (
                    <button
                      key={employee._id}
                      onClick={() => handleAssignComplaint(employee._id)}
                      disabled={assigningComplaint}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedComplaint.assignedTo === employee._id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-teal-300'
                      } ${assigningComplaint ? 'opacity-50' : ''}`}
                    >
                      <p className="font-medium text-slate-800">{employee.name}</p>
                      <p className="text-sm text-slate-500">{employee.position}</p>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setShowAssignModal(false); setSelectedComplaint(null); }}
                className="mt-4 w-full py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-800">Events</h2>
              <div className="flex gap-2">
                <button
                  onClick={triggerEventStatusUpdate}
                  disabled={updatingStatuses}
                  className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {updatingStatuses ? 'Updating...' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowEventForm(!showEventForm)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {showEventForm ? 'Cancel' : 'New Event'}
                </button>
              </div>
            </div>

            {showEventForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-medium text-slate-800 mb-4">Create Event</h3>
                <form onSubmit={handleEventCreate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Event Title"
                      value={eventFormData.title}
                      onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="datetime-local"
                      required
                      value={eventFormData.date}
                      onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Location"
                      value={eventFormData.location}
                      onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="number"
                      placeholder="Max Participants"
                      value={eventFormData.maxParticipants}
                      onChange={(e) => setEventFormData({ ...eventFormData, maxParticipants: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <textarea
                    required
                    placeholder="Description"
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={eventFormData.tags}
                    onChange={(e) => setEventFormData({ ...eventFormData, tags: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowEventForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
                      Create
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {events.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">
                No events yet. Create your first event!
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <div key={event._id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-slate-800">{event.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{event.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>{formatDate(event.date)}</span>
                      <span>{event.location}</span>
                      {event.maxParticipants && (
                        <span>{event.currentParticipants}/{event.maxParticipants} participants</span>
                      )}
                    </div>
                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {event.tags.map((tag, i) => (
                          <span key={i} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Employees Tab */}
        {activeTab === 'manage-employees' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-800">Employees</h2>
              <button
                onClick={() => setShowEmployeeForm(!showEmployeeForm)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                {showEmployeeForm ? 'Cancel' : 'Add Employee'}
              </button>
            </div>

            {showEmployeeForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-medium text-slate-800 mb-4">Add Employee</h3>
                <form onSubmit={handleEmployeeCreate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Name"
                      value={employeeFormData.name}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Position"
                      value={employeeFormData.position}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, position: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Mobile Number"
                      value={employeeFormData.mobileNo}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, mobileNo: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={employeeFormData.password}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowEmployeeForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
                      Add
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {employees.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">
                No employees yet. Add your first employee!
              </div>
            ) : (
              <div className="grid gap-4">
                {employees.map((employee) => (
                  <div key={employee._id} className="bg-white rounded-lg p-4 shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-slate-800">{employee.name}</h4>
                      <p className="text-sm text-slate-500">{employee.position} &bull; {employee.mobileNo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${employee.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => handleEmployeeRemove(employee._id)} className="text-rose-600 hover:text-rose-700 text-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-800">Profile</h2>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                {editingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editingProfile ? (
              <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={profileFormData.name || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={profileFormData.contactPersonName || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, contactPersonName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileFormData.contactEmail || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, contactEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileFormData.contactPhone || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, contactPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">City</label>
                    <input
                      type="text"
                      value={profileFormData.city || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Website</label>
                    <input
                      type="url"
                      value={profileFormData.website || ''}
                      onChange={(e) => setProfileFormData({ ...profileFormData, website: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Address</label>
                  <textarea
                    value={profileFormData.address || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Description</label>
                  <textarea
                    value={profileFormData.description || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Basic Info</h3>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="text-slate-500">Organization:</span> <span className="text-slate-800">{profile?.name}</span></p>
                      <p className="text-sm"><span className="text-slate-500">Type:</span> <span className="text-slate-800">{profile?.subtype || 'NGO'}</span></p>
                      <p className="text-sm"><span className="text-slate-500">City:</span> <span className="text-slate-800">{profile?.city}</span></p>
                      <p className="text-sm"><span className="text-slate-500">Established:</span> <span className="text-slate-800">{profile?.establishedYear}</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Contact</h3>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="text-slate-500">Person:</span> <span className="text-slate-800">{profile?.contactPersonName}</span></p>
                      <p className="text-sm"><span className="text-slate-500">Email:</span> <span className="text-slate-800">{profile?.contactEmail}</span></p>
                      <p className="text-sm"><span className="text-slate-500">Phone:</span> <span className="text-slate-800">{profile?.contactPhone}</span></p>
                      <p className="text-sm"><span className="text-slate-500">Website:</span> {profile?.website ? (
                        <a href={profile.website} className="text-teal-600 hover:underline">{profile.website}</a>
                      ) : <span className="text-slate-400">Not provided</span>}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Address</h3>
                  <p className="text-sm text-slate-700">{profile?.address || 'Not provided'}</p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-sm text-slate-700">{profile?.description || 'No description'}</p>
                </div>
                {profile?.categories && profile.categories.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.categories.map((cat, i) => (
                        <span key={i} className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
