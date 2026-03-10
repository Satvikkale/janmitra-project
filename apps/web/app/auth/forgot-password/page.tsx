'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/auth';
import Link from 'next/link';

export default function ForgotPassword() {
    const [userType, setUserType] = useState<'admin' | 'ngo' | 'ngo-user'>('admin');
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [formData, setFormData] = useState({
        identifier: '',
        ngoName: '',
        verificationCode: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [err, setErr] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [availableNgos, setAvailableNgos] = useState<Array<{ name: string; id: string }>>([]);
    const router = useRouter();

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

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setSuccess(null);
        setLoading(true);

        try {
            const requestBody: any = {
                identifier: formData.identifier,
                userType
            };

            if (userType === 'ngo-user') {
                requestBody.ngoName = formData.ngoName;
            }

            const r = await fetch(`${API}/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message || 'Failed to send verification code');

            setSuccess('Verification code sent! Check your email/SMS.');
            if (j.verificationCode) {
                setFormData(prev => ({ ...prev, verificationCode: j.verificationCode }));
            }
            setStep('verify');
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setSuccess(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setErr('Passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            setErr('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const requestBody: any = {
                identifier: formData.identifier,
                userType,
                verificationCode: formData.verificationCode,
                newPassword: formData.newPassword
            };

            if (userType === 'ngo-user') {
                requestBody.ngoName = formData.ngoName;
            }

            const r = await fetch(`${API}/v1/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message || 'Failed to reset password');

            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            {step === 'request' ? 'Forgot Password' : 'Reset Password'}
                        </h2>
                        <p className="text-slate-600">
                            {step === 'request' 
                                ? 'Enter your details to receive a verification code' 
                                : 'Enter the verification code and your new password'}
                        </p>
                    </div>

                    {/* User Type Toggle - Only show in request step */}
                    {step === 'request' && (
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
                    )}

                    {/* Request Code Form */}
                    {step === 'request' && (
                        <form onSubmit={handleRequestCode} className="space-y-5">
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

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            {err && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {err}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Sending Code...
                                    </span>
                                ) : (
                                    'Send Verification Code'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Reset Password Form */}
                    {step === 'verify' && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    name="verificationCode"
                                    placeholder="Enter 6-digit code"
                                    value={formData.verificationCode}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    placeholder="Enter new password"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                                />
                            </div>

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            {err && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {err}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Resetting...
                                    </span>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('request')}
                                className="w-full text-slate-600 hover:text-slate-900 py-2 text-sm font-medium transition-colors"
                            >
                                Back to Request Code
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-slate-600 text-sm">
                            Remember your password?{' '}
                            <Link
                                href="/auth/login"
                                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
