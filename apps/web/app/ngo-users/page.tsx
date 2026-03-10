'use client';
import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, getImageUrl } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

interface NgoUserData {
  _id: string;
  ngoName: string;
  name: string;
  position: string;
  mobileNo: string;
  userType: string;
  isActive: boolean;
  profilePhoto: string;
  createdAt: string;
  updatedAt: string;
}

interface ProgressUpdate {
  _id?: string;
  date: string;
  description: string;
  photos?: string[];
  updatedBy: string;
  updatedByName?: string;
}

interface Complaint {
  _id: string;
  category: string;
  subcategory?: string;
  description?: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'med' | 'high';
  assignedTo?: string;
  createdAt: string;
  progressUpdates?: ProgressUpdate[];
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

export default function NGOUsers() {
  const [userData, setUserData] = useState<NgoUserData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressForm, setProgressForm] = useState({ description: '', photos: [] as string[] });
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'assigned' | 'in_progress' | 'resolved'>('assigned');
  const progressPhotoRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    mobileNo: '',
    isActive: true,
    profilePhoto: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoggedIn } = useAuth();

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const assignedComplaints = complaints.filter(c => c.status === 'open' || c.status === 'assigned');
  const inProgressComplaints = complaints.filter(c => c.status === 'in_progress');
  const resolvedComplaints = complaints.filter(c => c.status === 'resolved' || c.status === 'closed');

  const getFilteredComplaints = () => {
    switch (activeTab) {
      case 'assigned': return assignedComplaints;
      case 'in_progress': return inProgressComplaints;
      case 'resolved': return resolvedComplaints;
      default: return complaints;
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/v1/ngo-users/me');
        setUserData(data);
        setEditForm({
          name: data.name,
          mobileNo: data.mobileNo,
          isActive: data.isActive,
          profilePhoto: data.profilePhoto || ''
        });
        const complaintsData = await apiFetch(`/v1/complaints?assignedTo=${data._id}`);
        setComplaints(complaintsData);
        await fetchNotifications();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchComplaints = async () => {
    if (!userData) return;
    try {
      const complaintsData = await apiFetch(`/v1/complaints?assignedTo=${userData._id}`);
      setComplaints(complaintsData);
    } catch (err) {
      console.error('Error fetching complaints:', err);
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
    } catch (err) {
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
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await apiFetch('/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

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
      case 'complaint_assigned':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'complaint_updated':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      setUpdatingStatus(complaintId);
      await apiFetch(`/v1/complaints/${complaintId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await fetchComplaints();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update complaint status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleEditClick = () => {
    if (userData) {
      setEditForm({
        name: userData.name,
        mobileNo: userData.mobileNo,
        isActive: userData.isActive,
        profilePhoto: userData.profilePhoto || ''
      });
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updatedData = await apiFetch('/v1/ngo-users/me', {
        method: 'PATCH',
        body: JSON.stringify(editForm)
      });
      setUserData(updatedData);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (file: File, maxWidth: number = 300, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        setEditForm(prev => ({ ...prev, profilePhoto: compressedImage }));
      } catch (err) {
        console.error('Error compressing image:', err);
        setError('Failed to process image');
      }
    }
  };

  const handleProgressPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file, 800, 0.8);
        setProgressForm(prev => ({ ...prev, photos: [...prev.photos, compressedImage] }));
      } catch (err) {
        console.error('Error compressing image:', err);
        setError('Failed to process image');
      }
    }
  };

  const removeProgressPhoto = (index: number) => {
    setProgressForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const openProgressModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setProgressForm({ description: '', photos: [] });
    setShowProgressModal(true);
  };

  const uploadImages = async (images: string[]): Promise<string[]> => {
    if (images.length === 0) return [];
    try {
      const response = await apiFetch('/v1/uploads/images', {
        method: 'POST',
        body: JSON.stringify({ images, folder: 'progress' })
      });
      return response.urls;
    } catch (err) {
      console.error('Error uploading images:', err);
      throw new Error('Failed to upload images');
    }
  };

  const handleSubmitProgress = async () => {
    if (!selectedComplaint || !progressForm.description.trim()) return;
    
    try {
      setSubmittingProgress(true);
      
      let photoUrls: string[] = [];
      if (progressForm.photos.length > 0) {
        photoUrls = await uploadImages(progressForm.photos);
      }
      
      await apiFetch(`/v1/complaints/${selectedComplaint._id}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          description: progressForm.description,
          photos: photoUrls
        })
      });
      await fetchComplaints();
      setShowProgressModal(false);
      setSelectedComplaint(null);
      setProgressForm({ description: '', photos: [] });
    } catch (err) {
      console.error('Error submitting progress:', err);
      setError('Failed to submit progress update');
    } finally {
      setSubmittingProgress(false);
    }
  };

  const viewComplaintDetails = async (complaint: Complaint) => {
    try {
      const fullComplaint = await apiFetch(`/v1/complaints/${complaint._id}`);
      setSelectedComplaint(fullComplaint);
    } catch (err) {
      console.error('Error fetching complaint details:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">NGO Users Dashboard</h1>
        <p className="text-red-600 text-lg">Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">NGO Users Dashboard</h1>
        <p className="text-red-600 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back!</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
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

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-y-auto max-h-72">
                    {loadingNotifications ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => !notification.isRead && markNotificationAsRead(notification._id)}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.isRead ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTimeAgo(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="flex-shrink-0">
                                <span className="w-2 h-2 bg-blue-500 rounded-full block"></span>
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

            {userData && (
              <button
                onClick={handleEditClick}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {userData && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-6 mb-8">
                {userData.profilePhoto ? (
                  <img
                    src={userData.profilePhoto}
                    alt={userData.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-3xl font-bold">
                    {userData.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
                  <p className="text-gray-600 text-sm mb-3">{userData.position}</p>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    userData.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {userData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">NGO</p>
                  <p className="text-base font-medium text-gray-900">{userData.ngoName}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Mobile</p>
                  <p className="text-base font-medium text-gray-900">{userData.mobileNo}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">User Type</p>
                  <p className="text-base font-medium text-gray-900 capitalize">{userData.userType}</p>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Member Since</p>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Complaints</p>
                  <p className="text-base font-medium text-gray-900">{complaints.length}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Position</p>
                  <p className="text-base font-medium text-gray-900">{userData.position}</p>
                </div>
              </div>
            </div>

            {/* Complaints Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Assigned Complaints</h3>
              <p className="text-gray-600 text-sm mb-6">Track and manage your complaints</p>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab('assigned')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'assigned'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                      {assignedComplaints.length}
                    </span>
                    Assigned
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('in_progress')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'in_progress'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
                      {inProgressComplaints.length}
                    </span>
                    In Progress
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('resolved')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'resolved'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-semibold">
                      {resolvedComplaints.length}
                    </span>
                    Resolved
                  </span>
                </button>
              </div>

              {getFilteredComplaints().length === 0 ? (
                <div className="bg-gray-100 p-8 rounded-lg text-center">
                  <p className="text-gray-500">
                    {activeTab === 'assigned' && 'No new complaints assigned'}
                    {activeTab === 'in_progress' && 'No complaints in progress'}
                    {activeTab === 'resolved' && 'No resolved complaints'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredComplaints().map((complaint) => (
                    <div key={complaint._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{complaint.category}</h4>
                          {complaint.subcategory && (
                            <p className="text-xs text-gray-500 mt-1">{complaint.subcategory}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            complaint.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                            complaint.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                            complaint.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                            complaint.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {complaint.status?.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            complaint.priority === 'high' ? 'bg-red-100 text-red-700' :
                            complaint.priority === 'med' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {complaint.priority}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {complaint.description || 'No description'}
                      </p>

                      {complaint.progressUpdates && complaint.progressUpdates.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700">
                              {complaint.progressUpdates.length} Progress Update{complaint.progressUpdates.length > 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={() => viewComplaintDetails(complaint)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View All
                            </button>
                          </div>
                          <p className="text-xs text-gray-600">
                            Latest: {complaint.progressUpdates[complaint.progressUpdates.length - 1]?.description?.slice(0, 100)}
                            {(complaint.progressUpdates[complaint.progressUpdates.length - 1]?.description?.length || 0) > 100 ? '...' : ''}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          {complaint.status !== 'in_progress' && complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                            <button
                              onClick={() => handleStatusUpdate(complaint._id, 'in_progress')}
                              disabled={updatingStatus === complaint._id}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {updatingStatus === complaint._id ? 'Updating...' : 'Start'}
                            </button>
                          )}
                          {complaint.status === 'in_progress' && (
                            <>
                              <button
                                onClick={() => openProgressModal(complaint)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                              >
                                + Add Update
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(complaint._id, 'resolved')}
                                disabled={updatingStatus === complaint._id}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {updatingStatus === complaint._id ? 'Updating...' : 'Resolve'}
                              </button>
                            </>
                          )}
                          {(complaint.status === 'resolved' || complaint.status === 'closed') && (
                            <button
                              onClick={() => viewComplaintDetails(complaint)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>

              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {editForm.profilePhoto ? (
                    <img
                      src={editForm.profilePhoto}
                      alt="Profile"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-2xl font-bold">
                      {editForm.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile</label>
                <input
                  type="tel"
                  value={editForm.mobileNo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mobileNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.isActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editForm.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Progress Update Modal */}
        {showProgressModal && selectedComplaint && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Add Daily Progress Update</h2>
              <p className="text-sm text-gray-500 mb-6">
                {selectedComplaint.category} - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Work Description *
                </label>
                <textarea
                  value={progressForm.description}
                  onChange={(e) => setProgressForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the work done today..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Photos of Work Done
                </label>
                
                {progressForm.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {progressForm.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Work photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeProgressPhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => progressPhotoRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-gray-600">Click to add photos</p>
                </button>
                <input
                  ref={progressPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProgressPhotoChange}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProgressModal(false);
                    setSelectedComplaint(null);
                    setProgressForm({ description: '', photos: [] });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitProgress}
                  disabled={submittingProgress || !progressForm.description.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  {submittingProgress ? 'Submitting...' : 'Submit Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Complaint Details Modal */}
        {selectedComplaint && !showProgressModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedComplaint.category}</h2>
                  {selectedComplaint.subcategory && (
                    <p className="text-sm text-gray-500">{selectedComplaint.subcategory}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedComplaint.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                  selectedComplaint.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                  selectedComplaint.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                  selectedComplaint.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedComplaint.status?.replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedComplaint.priority === 'high' ? 'bg-red-100 text-red-700' :
                  selectedComplaint.priority === 'med' ? 'bg-orange-100 text-orange-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedComplaint.priority} priority
                </span>
              </div>

              <p className="text-gray-600 mb-6">{selectedComplaint.description || 'No description'}</p>

              {/* Progress Timeline */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Timeline</h3>
                
                {(!selectedComplaint.progressUpdates || selectedComplaint.progressUpdates.length === 0) ? (
                  <div className="bg-gray-100 p-6 rounded-lg text-center">
                    <p className="text-gray-500">No progress updates yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedComplaint.progressUpdates.map((update, index) => (
                      <div key={index} className="relative pl-6 border-l-2 border-blue-200 pb-4 last:pb-0">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-blue-600">
                              {new Date(update.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {update.updatedByName && (
                              <span className="text-xs text-gray-500">by {update.updatedByName}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{update.description}</p>
                          
                          {update.photos && update.photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {update.photos.map((photo, photoIndex) => (
                                <img
                                  key={photoIndex}
                                  src={getImageUrl(photo)}
                                  alt={`Progress photo ${photoIndex + 1}`}
                                  className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(getImageUrl(photo), '_blank')}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedComplaint.status === 'in_progress' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowProgressModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    + Add Progress Update
                  </button>
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedComplaint._id, 'resolved');
                      setSelectedComplaint(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Mark as Resolved
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
