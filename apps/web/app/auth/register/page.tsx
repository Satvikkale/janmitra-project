'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { API, setTokens } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Register() {
  const [userType, setUserType] = useState<'ngo-user' | 'ngo'>('ngo-user');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setIsLoggedIn } = useAuth();

  const [ngoUserInfo, setNgoUserInfo] = useState({
    ngoName: '',
    position: '',
    mobileNo: '',
  });

  const [availableNgos, setAvailableNgos] = useState<Array<{ name: string; id: string }>>([]);

  const [ngoInfo, setNgoInfo] = useState({
    name: '',
    subtype: '',
    city: '',
    categories: [] as string[],
    contactEmail: '',
    contactPhone: '',
    address: '',
    registrationNumber: '',
    establishedYear: 2024,
    website: '',
  });

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

  const handleNgoInfoChange = (field: string, value: any) => {
    setNgoInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleNgoUserInfoChange = (field: string, value: any) => {
    setNgoUserInfo(prev => ({ ...prev, [field]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      let endpoint = `${API}/v1/auth/register-ngo-user`;
      let body: any = {
        ngoName: ngoUserInfo.ngoName,
        name,
        position: ngoUserInfo.position,
        mobileNo: ngoUserInfo.mobileNo,
        password
      };

      if (userType === 'ngo') {
        endpoint = `${API}/v1/auth/register-ngo`;
        body = { name, password, ngoInfo };
      }

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Register failed');

      if (userType === 'ngo') {
        alert(j.message || 'NGO registration successful! Your account is pending admin verification.');
        router.push('/auth/login');
      } else {
        setTokens(j.accessToken, j.refreshToken);
        setIsLoggedIn(true);
        localStorage.setItem('userType', 'ngo-user');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
            <p className="text-slate-600">Join our community today</p>
          </div>

          {/* User Type Toggle */}
          <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
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
              NGO Organization
            </button>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {userType === 'ngo' ? 'Contact Person Name' : 'Your Name'}
              </label>
              <input
                type="text"
                placeholder={userType === 'ngo' ? 'Enter contact person name' : 'Enter your name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
              />
            </div>

            {userType === 'ngo-user' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select NGO</label>
                  <select
                    value={ngoUserInfo.ngoName}
                    onChange={(e) => handleNgoUserInfoChange('ngoName', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 transition-all"
                  >
                    <option value="" disabled>Select your NGO</option>
                    {availableNgos.map((ngo) => (
                      <option key={ngo.id} value={ngo.name}>{ngo.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                  <input
                    type="text"
                    placeholder="Enter your position"
                    value={ngoUserInfo.position}
                    onChange={(e) => handleNgoUserInfoChange('position', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={ngoUserInfo.mobileNo}
                    onChange={(e) => handleNgoUserInfoChange('mobileNo', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </>
            )}

            {userType === 'ngo' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name</label>
                    <input
                      type="text"
                      placeholder="Enter organization name"
                      value={ngoInfo.name}
                      onChange={(e) => handleNgoInfoChange('name', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">NGO Type</label>
                    <input
                      type="text"
                      placeholder="e.g. Health, Education"
                      value={ngoInfo.subtype}
                      onChange={(e) => handleNgoInfoChange('subtype', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      placeholder="Enter contact email"
                      value={ngoInfo.contactEmail}
                      onChange={(e) => handleNgoInfoChange('contactEmail', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="Enter contact phone"
                      value={ngoInfo.contactPhone}
                      onChange={(e) => handleNgoInfoChange('contactPhone', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea
                    placeholder="Enter organization address"
                    value={ngoInfo.address}
                    onChange={(e) => handleNgoInfoChange('address', e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                    <input
                      type="text"
                      placeholder="Enter city"
                      value={ngoInfo.city}
                      onChange={(e) => handleNgoInfoChange('city', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Registration Number</label>
                    <input
                      type="text"
                      placeholder="Enter registration number"
                      value={ngoInfo.registrationNumber}
                      onChange={(e) => handleNgoInfoChange('registrationNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Established Year</label>
                    <input
                      type="number"
                      placeholder="Enter year"
                      value={ngoInfo.establishedYear}
                      onChange={(e) => handleNgoInfoChange('establishedYear', parseInt(e.target.value) || 2024)}
                      required
                      min="1900"
                      max={2024}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Website (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={ngoInfo.website}
                      onChange={(e) => handleNgoInfoChange('website', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
              />
            </div>

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
                  Registering...
                </span>
              ) : (
                userType === 'ngo-user' ? 'Register as NGO User' : 'Register NGO'
              )}
            </button>

            <div className="text-center">
              <p className="text-slate-600 text-sm">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
