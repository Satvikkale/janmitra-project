'use client';
import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

interface NGOData {
    _id: string;
    ngoName: string;
    email: string;
    registrationNumber: string;
    address: string;
    contactPerson: string;
    contactPhone: string;
    description: string;
    isVerified: boolean;
    createdAt: string;
    subtype: string;
    city: string;
    categories: string[];
    establishedYear: string;
    website: string;
}

interface NGOResponse {
    pending: NGOData[];
    verified: NGOData[];
}

export default function ManageNGOsPage() {
    const [ngoData, setNgoData] = useState<NGOResponse>({ pending: [], verified: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { isLoggedIn } = useAuth();

    const fetchNGOs = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/orgs/ngos');
            setNgoData(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching NGOs:', err);
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                setError('You are not authorized to access this data. Please login as an admin user.');
            } else {
                setError('Failed to fetch NGO data. Please check your permissions and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchNGOs();
        }
    }, [isLoggedIn]);

    const handleVerifyNgo = async (ngoId: string) => {
        try {
            setActionLoading(ngoId);
            await apiFetch('/v1/orgs/verify-ngo', {
                method: 'POST',
                body: JSON.stringify({ ngoId })
            });
            await fetchNGOs();
        } catch (err: any) {
            console.error('Error verifying NGO:', err);
            setError('Failed to verify NGO. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectNgo = async (ngoId: string) => {
        if (!confirm('Are you sure you want to reject this NGO? This action cannot be undone.')) {
            return;
        }
        try {
            setActionLoading(ngoId);
            await apiFetch('/v1/orgs/reject-ngo', {
                method: 'POST',
                body: JSON.stringify({ ngoId })
            });
            await fetchNGOs();
        } catch (err: any) {
            console.error('Error rejecting NGO:', err);
            setError('Failed to reject NGO. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const NGOCard = ({ ngo, showActions = false }: { ngo: NGOData; showActions?: boolean }) => (
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:border-teal-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{ngo.ngoName}</h3>
                    <p className="text-sm text-gray-500">{ngo.city} &bull; {ngo.subtype}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    ngo.isVerified
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-amber-100 text-amber-700'
                }`}>
                    {ngo.isVerified ? 'Verified' : 'Pending'}
                </span>
            </div>

            {ngo.categories && ngo.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {ngo.categories.slice(0, 3).map((category, index) => (
                        <span key={index} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                            {category}
                        </span>
                    ))}
                    {ngo.categories.length > 3 && (
                        <span className="text-gray-400 text-xs">+{ngo.categories.length - 3} more</span>
                    )}
                </div>
            )}

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {ngo.description || 'No description provided'}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                    <p className="text-gray-400 text-xs">Contact</p>
                    <p className="text-gray-700">{ngo.contactPerson}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-xs">Phone</p>
                    <p className="text-gray-700">{ngo.contactPhone}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-xs">Email</p>
                    <p className="text-gray-700 truncate">{ngo.email}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-xs">Registered</p>
                    <p className="text-gray-700">{formatDate(ngo.createdAt)}</p>
                </div>
            </div>

            {showActions && (
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                        onClick={() => handleVerifyNgo(ngo._id)}
                        disabled={actionLoading === ngo._id}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        {actionLoading === ngo._id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                        onClick={() => handleRejectNgo(ngo._id)}
                        disabled={actionLoading === ngo._id}
                        className="flex-1 bg-white hover:bg-red-50 disabled:bg-gray-100 text-red-600 border border-red-200 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        {actionLoading === ngo._id ? 'Processing...' : 'Reject'}
                    </button>
                </div>
            )}
        </div>
    );

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md w-full text-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Login Required</h2>
                    <p className="text-gray-500 mb-4">Please log in to access the NGO management panel.</p>
                    <a href="/auth/login" className="inline-block bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
                        Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Manage NGOs</h1>
                    <p className="text-gray-500">Review and manage NGO registrations</p>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Pending</p>
                        <p className="text-2xl font-bold text-amber-600">{ngoData.pending.length}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Verified</p>
                        <p className="text-2xl font-bold text-teal-600">{ngoData.verified.length}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
                        <p className="text-2xl font-bold text-gray-700">{ngoData.pending.length + ngoData.verified.length}</p>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'pending'
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Pending ({ngoData.pending.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('verified')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'verified'
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Verified ({ngoData.verified.length})
                        </button>
                    </div>
                    <button
                        onClick={fetchNGOs}
                        disabled={loading}
                        className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-gray-200 border-t-teal-600"></div>
                        <p className="mt-3 text-gray-500">Loading NGOs...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(activeTab === 'pending' ? ngoData.pending : ngoData.verified).map((ngo) => (
                            <NGOCard key={ngo._id} ngo={ngo} showActions={activeTab === 'pending'} />
                        ))}
                    </div>
                )}

                {!loading && (activeTab === 'pending' ? ngoData.pending : ngoData.verified).length === 0 && (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No {activeTab} NGOs found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
