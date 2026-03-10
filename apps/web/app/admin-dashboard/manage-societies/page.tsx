'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

interface Society {
  _id: string;
  name: string;
  location?: { lat: number; lng: number };
  headUserSub?: string;
  isVerified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  description?: string;
  createdAt: string;
}

interface SocietiesResponse {
  pending: Society[];
  verified: Society[];
  all: Society[];
}

function normalizeSocietiesResponse(input: unknown): SocietiesResponse {
  const fallback: SocietiesResponse = { pending: [], verified: [], all: [] };
  if (!input) return fallback;

  const classify = (items: Society[]): SocietiesResponse => {
    const filtered = items.filter((s) => (s?.status ?? 'pending') !== 'rejected');
    const pending = filtered.filter((s) => {
      const status = s?.status;
      if (status) return status === 'pending';
      return !s?.isVerified;
    });
    const verified = filtered.filter((s) => {
      const status = s?.status;
      if (status) return status === 'approved';
      return !!s?.isVerified;
    });
    return { pending, verified, all: filtered };
  };

  // Some endpoints return a flat array instead of segmented buckets.
  if (Array.isArray(input)) {
    return classify(input as Society[]);
  }

  const obj = input as Partial<SocietiesResponse>;
  const source = Array.isArray(obj.all)
    ? obj.all
    : [...(Array.isArray(obj.pending) ? obj.pending : []), ...(Array.isArray(obj.verified) ? obj.verified : [])];
  return classify(source);
}

interface Member {
  _id: string;
  societyId: string;
  userSub: string;
  userName: string;
  userEmail?: string;
  role: 'resident' | 'society_head';
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

function normalizeMembers(input: unknown): Member[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw: any) => ({
    ...raw,
    userName: raw?.userName || raw?.user?.name || 'Unknown User',
    userEmail: raw?.userEmail || raw?.user?.email || '',
  }));
}

export default function ManageSocieties() {
  const [societiesData, setSocietiesData] = useState<SocietiesResponse>({ pending: [], verified: [], all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();
  const [expandedSociety, setExpandedSociety] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [membersLoading, setMembersLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/v1/societies?includePending=true');
      setSocietiesData(normalizeSocietiesResponse(data));
      setError(null);
    } catch (err: any) {
      console.error('Error fetching societies:', err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('You are not authorized to access this data. Please login as an admin user.');
      } else {
        setError('Failed to fetch societies. Please check your permissions and try again.');
      }
      setSocietiesData({ pending: [], verified: [], all: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (societyId: string) => {
    try {
      setMembersLoading(societyId);
      const data = await apiFetch(`/v1/societies/${societyId}/memberships`);
      setMembers(prev => ({ ...prev, [societyId]: normalizeMembers(data) }));
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setMembers(prev => ({ ...prev, [societyId]: [] }));
    } finally {
      setMembersLoading(null);
    }
  };

  const handleVerifySociety = async (societyId: string) => {
    try {
      setActionLoading(societyId);
      await apiFetch(`/v1/societies/${societyId}/approve`, { method: 'POST' });
      await fetchSocieties();
    } catch (err: any) {
      console.error('Error verifying society:', err);
      setError('Failed to verify society. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSociety = async (societyId: string) => {
    if (!confirm('Are you sure you want to reject this society? This action cannot be undone.')) {
      return;
    }
    try {
      setActionLoading(societyId);
      await apiFetch(`/v1/societies/${societyId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected by admin from dashboard' })
      });
      await fetchSocieties();
    } catch (err: any) {
      console.error('Error rejecting society:', err);
      setError('Failed to reject society. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (societyId: string) => {
    if (expandedSociety === societyId) {
      setExpandedSociety(null);
    } else {
      setExpandedSociety(societyId);
      if (!members[societyId]) {
        fetchMembers(societyId);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchSocieties();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 max-w-sm w-full text-center">
          <p className="text-slate-600">Please log in to view societies.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium">Loading societies...</span>
        </div>
      </div>
    );
  }

  const pendingSocieties = Array.isArray(societiesData.pending) ? societiesData.pending : [];
  const verifiedSocieties = Array.isArray(societiesData.verified) ? societiesData.verified : [];
  const currentSocieties = activeTab === 'pending' ? pendingSocieties : verifiedSocieties;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Manage Societies</h1>
          <p className="text-slate-500">Verify and manage society registrations</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-sm font-medium">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-slate-500 text-sm mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-900">{pendingSocieties.length + verifiedSocieties.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-amber-600 text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{pendingSocieties.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-green-600 text-sm mb-1">Verified</p>
            <p className="text-2xl font-bold text-green-600">{verifiedSocieties.length}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Pending ({pendingSocieties.length})
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'verified'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Verified ({verifiedSocieties.length})
          </button>
        </div>

        {currentSocieties.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-500">
              {activeTab === 'pending' ? 'No pending societies to review.' : 'No verified societies yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentSocieties.map((society) => {
              const societyMembers = members[society._id] || [];
              const approvedCount = societyMembers.filter(m => m.status === 'approved').length;
              const pendingCount = societyMembers.filter(m => m.status === 'pending').length;
              const isExpanded = expandedSociety === society._id;

              return (
                <div key={society._id} className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleExpand(society._id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-sm">
                          {society.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">{society.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Created {new Date(society.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {members[society._id] && (
                        <div className="hidden sm:flex items-center gap-2">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            {approvedCount} members
                          </span>
                          {pendingCount > 0 && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              {pendingCount} pending
                            </span>
                          )}
                        </div>
                      )}
                      <div className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50">
                      {membersLoading === society._id ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          <span className="text-slate-500 text-sm">Loading members...</span>
                        </div>
                      ) : members[society._id]?.length === 0 ? (
                        <p className="text-slate-400 text-center text-sm py-4">No members in this society.</p>
                      ) : (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">Members</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {members[society._id]?.map((member) => (
                              <div key={member._id} className="bg-white rounded-lg p-3 border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                                    member.role === 'society_head'
                                      ? 'bg-blue-600'
                                      : 'bg-slate-400'
                                  }`}>
                                    {member.userName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-slate-900 truncate">{member.userName}</p>
                                      {member.role === 'society_head' && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                                          Society Head
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{member.userEmail || 'No email'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(society.address || society.contactPerson || society.description) && (
                        <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                          {society.description && <p className="text-sm text-slate-600 mb-2">{society.description}</p>}
                          {society.address && <p className="text-sm text-slate-600"><span className="font-medium">Address:</span> {society.address}</p>}
                          {society.contactPerson && (
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Contact:</span> {society.contactPerson} {society.contactPhone && `(${society.contactPhone})`}
                            </p>
                          )}
                        </div>
                      )}

                      {activeTab === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVerifySociety(society._id); }}
                            disabled={actionLoading === society._id}
                            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {actionLoading === society._id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRejectSociety(society._id); }}
                            disabled={actionLoading === society._id}
                            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {actionLoading === society._id ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
