'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { API, setTokens } from '@/lib/auth';

export default function Login() {
    const [userType, setUserType] = useState<'admin' | 'ngo'>('admin');
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const sp = useSearchParams();
    const next = sp.get('next') || '/org/queue';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            const r = await fetch(`${API}/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, userType }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message || 'Login failed');
            setTokens(j.accessToken, j.refreshToken);
            // Save userType to localStorage for context
            localStorage.setItem('userType', userType);
            router.push(next);
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    const handleSignUp = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        router.push('/auth/register');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="w-full max-w-md bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-8"
            >
                <motion.h2
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-4xl font-extrabold text-center text-white drop-shadow"
                >
                    Login
                </motion.h2>

                {/* Toggle user type */}
                <div className="flex mt-6 bg-white/30 rounded-xl p-1">
                    <button
                        type="button"
                        onClick={() => setUserType('admin')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                            userType === 'admin'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-700 hover:bg-white/40'
                        }`}
                    >
                        Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserType('ngo')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                            userType === 'ngo'
                                ? 'bg-pink-600 text-white shadow-md'
                                : 'text-gray-700 hover:bg-white/40'
                        }`}
                    >
                        NGO
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <motion.input
                        whileFocus={{ scale: 1.02 }}
                        type="text"
                        name="identifier"
                        placeholder={
                            userType === 'admin' ? 'Email or phone' : 'Official Email or phone'
                        }
                        value={formData.identifier}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/70"
                    />

                    <motion.input
                        whileFocus={{ scale: 1.02 }}
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/70"
                    />

                    {err && (
                        <div className="text-red-600 text-sm text-center">{err}</div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-pink-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition"
                    >
                        {loading ? 'Signing in...' : 'Login'}
                    </motion.button>
                </form>

                <p className="mt-6 text-center text-white/80 text-sm">
                    Don’t have an account?{' '}
                    <a
                        href="/auth/register"
                        className="text-yellow-300 font-medium hover:underline"
                        onClick={handleSignUp}
                    >
                        Sign up
                    </a>
                </p>
            </motion.div>
        </div>
    );
}