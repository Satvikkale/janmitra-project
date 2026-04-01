'use client';
import React, { useEffect, useState } from 'react';
import { apiFetch, getAccessToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface OrgUserData {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  userType: string;
  isActive: boolean;
  profilePhoto: string;
}

interface Complaint {
  _id: string;
  category: string;
  description?: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'med' | 'high';
  assignedTo?: string;
  createdAt: string;
}

export default function OrgUserDashboard() {
  const [userData, setUserData] = useState<OrgUserData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'assigned' | 'in_progress' | 'resolved'>('profile');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    isActive: true,
    profilePhoto: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();
  const router = useRouter();

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
        const token = getAccessToken();
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const data = await apiFetch('/v1/organization-users/me');
        setUserData(data);
        setEditForm({
          name: data.name,
          email: data.email,
          isActive: data.isActive,
          profilePhoto: data.profilePhoto || ''
        });

        const complaintsData = await apiFetch(`/v1/complaints?assignedTo=${data.id}`);
        setComplaints(complaintsData || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, router]);

  const handleEditClick = () => {
    if (userData) {
      setEditForm({
        name: userData.name,
        email: userData.email,
        isActive: userData.isActive,
        profilePhoto: userData.profilePhoto || ''
      });
      setIsEditing(true);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);

        try {
          const response = await apiFetch('/v1/uploads/images', {
            method: 'POST',
            body: JSON.stringify({
              images: [base64String],
              folder: 'profile-photos'
            })
          });

          if (response.urls && response.urls[0]) {
            const updatedData = await apiFetch('/v1/organization-users/me', {
              method: 'PATCH',
              body: JSON.stringify({ profilePhoto: response.urls[0] })
            });
            setUserData(updatedData);
            setEditForm({ ...editForm, profilePhoto: response.urls[0] });
            setPhotoPreview(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload photo');
          setPhotoPreview(null);
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to read file');
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updatedData = await apiFetch('/v1/organization-users/me', {
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

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      await apiFetch(`/v1/complaints/${complaintId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      const complaintsData = await apiFetch(`/v1/complaints?assignedTo=${userData?.id}`);
      setComplaints(complaintsData || []);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update complaint status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('userType');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Please log in to continue</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {userData?.organizationName || 'Organization'}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                {userData?.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-2xl shadow-md border-b border-slate-200">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'assigned'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assigned ({assignedComplaints.length})
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'in_progress'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Progress ({inProgressComplaints.length})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'resolved'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({resolvedComplaints.length})
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-4 font-medium text-sm text-red-600 hover:text-red-700 ml-auto"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl shadow-md p-6">
          {activeTab === 'profile' && userData ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h2>

              {/* Profile Photo Section */}
              <div className="flex items-center gap-6 mb-8 p-6 bg-slate-50 rounded-lg">
                <div className="relative">
                  {photoPreview || userData.profilePhoto ? (
                    <img
                      src={photoPreview || userData.profilePhoto}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Profile Photo</h3>
                  <p className="text-slate-600 text-sm mb-4">Upload a photo to personalize your profile</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                    <span className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block disabled:opacity-50">
                      {uploadingPhoto ? 'Uploading...' : userData.profilePhoto ? 'Change Photo' : 'Upload Photo'}
                    </span>
                  </label>
                  <p className="text-slate-500 text-xs mt-2">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
                </div>
              </div>

              {/* Profile Information */}
              {isEditing ? (
                <div className="p-6 border border-slate-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Full Name</p>
                      <p className="text-lg font-semibold text-slate-900">{userData.name}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Email</p>
                      <p className="text-lg font-semibold text-slate-900">{userData.email}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Organization</p>
                      <p className="text-lg font-semibold text-slate-900">{userData.organizationName}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">User Type</p>
                      <p className="text-lg font-semibold text-slate-900 capitalize">{userData.userType}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Account Status</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {userData.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEditClick}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Profile Information
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {activeTab !== 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">My Complaints</h2>
              {getFilteredComplaints().length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-slate-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-slate-600">No complaints in this category</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredComplaints().map((complaint) => (
                    <div
                      key={complaint._id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{complaint.category}</h3>
                          <p className="text-slate-600 text-sm mt-1">{complaint.description}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            complaint.status === 'open' || complaint.status === 'assigned'
                              ? 'bg-red-100 text-red-700'
                              : complaint.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {complaint.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-slate-500 text-xs">
                          Created: {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                        {activeTab === 'assigned' && (
                          <button
                            onClick={() => handleStatusUpdate(complaint._id, 'in_progress')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            Start Work
                          </button>
                        )}
                        {activeTab === 'in_progress' && (
                          <button
                            onClick={() => handleStatusUpdate(complaint._id, 'resolved')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
