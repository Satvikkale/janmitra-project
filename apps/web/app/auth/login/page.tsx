'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API, setTokens } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Login() {
    const [userType, setUserType] = useState<'admin' | 'ngo' | 'ngo-user'>('admin');
    const [formData, setFormData] = useState({ identifier: '', password: '', ngoName: '' });
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [availableNgos, setAvailableNgos] = useState<Array<{ name: string; id: string }>>([]);
    const { setIsLoggedIn } = useAuth();
    const router = useRouter();
    const sp = useSearchParams();

    useEffect(() => {
        setMounted(true);
        fetchAvailableNgos();
    }, []);

    const fetchAvailableNgos = async () => {
        try {
            const response = await fetch(`${API}/v1/auth/available-ngos`);
            if (response.ok) {
                const ngos = await response.json();
                setAvailableNgos(ngos);
            }
        } catch (error) {
            console.error('Failed to fetch available NGOs:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            const requestBody: any = {
                identifier: formData.identifier,
                password: formData.password,
                userType
            };

            if (userType === 'ngo-user') {
                requestBody.ngoName = formData.ngoName;
            }

            const r = await fetch(`${API}/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message || 'Login failed');
            setTokens(j.accessToken, j.refreshToken);
            setIsLoggedIn(true);
            if (typeof window !== 'undefined') {
                localStorage.setItem('userData', JSON.stringify(j.user || {}));
                if (j.user && j.user.userType) {
                    localStorage.setItem('userType', j.user.userType);
                } else {
                    localStorage.setItem('userType', userType);
                }
            }
            if (userType === 'admin') {
                router.push('/admin-dashboard');
            } else if (userType === 'ngo' && j.user.isVerified) {
                router.push('/ngo-dashboard');
            } else if (userType === 'ngo' && !j.user.isVerified) {
                alert('Your NGO account is pending approval. Please wait for verification.');
                router.push('/auth/login');
            } else if (userType === 'ngo-user') {
                router.push('/ngo-users');
            }
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-600">Sign in to your account</p>
                    </div>

                    {/* User Type Toggle */}
                    <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => setUserType('admin')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                userType === 'admin'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserType('ngo-user')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                userType === 'ngo-user'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            NGO User
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserType('ngo')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                userType === 'ngo'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            NGO
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {userType === 'ngo-user' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Select NGO
                                </label>
                                <select
                                    name="ngoName"
                                    value={formData.ngoName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 transition-all"
                                >
                                    <option value="" disabled>Select your NGO</option>
                                    {availableNgos.map((ngo) => (
                                        <option key={ngo.id} value={ngo.name}>
                                            {ngo.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {userType === 'admin' ? 'Email or Phone' : userType === 'ngo-user' ? 'Your Name' : 'Contact Email or Phone'}
                            </label>
                            <input
                                type="text"
                                name="identifier"
                                placeholder={
                                    userType === 'admin'
                                        ? 'Enter email or phone'
                                        : userType === 'ngo-user'
                                        ? 'Enter your name'
                                        : 'Enter contact email or phone'
                                }
                                value={formData.identifier}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                            />
                        </div>

                        {err && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {err}
                            </div>
                        )}

                        <div className="text-right">
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-600 text-sm">
                            Don't have an account?{' '}
                            <Link
                                href="/auth/register"
                                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                            >
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
