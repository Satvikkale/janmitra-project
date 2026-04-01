'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { API, setTokens } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Register() {
  const [userType, setUserType] = useState<'ngo-user' | 'ngo' | 'organization' | 'org-user'>('ngo-user');
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setIsLoggedIn } = useAuth();

  // Common fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [availableNgos, setAvailableNgos] = useState<Array<{ name: string; id: string }>>([]);

  // NGO User specific
  const [ngoUserInfo, setNgoUserInfo] = useState({
    ngoName: '',
    email: '',
    position: '',
    mobileNo: '',
  });
  const [availableOrganizations, setAvailableOrganizations] = useState<Array<{ name: string; id: string }>>([]);

  // NGO Organization specific
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

  // Organization (Owner) specific
  const [orgInfo, setOrgInfo] = useState({
    businessName: '',
    businessType: '',
    industryType: '',
    registrationNumber: '',
    gstNumber: '',
    owner: {
      fullName: '',
      email: '',
      phoneNumber: '',
      panNumber: '',
      aadhaarNumber: '',
    },
    businessAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    },
  });

  // Org User specific
  const [orgUserInfo, setOrgUserInfo] = useState({
    organizationId: '',
    organizationName: '',
    email: '',
    mobileNo: '',
    position: '',
  });

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchAvailableNgos();
    fetchAvailableOrganizations();
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

  const fetchAvailableOrganizations = async () => {
    try {
      const response = await fetch(`${API}/v1/auth/available-organizations`);
      if (response.ok) {
        const organizations = await response.json();
        setAvailableOrganizations(organizations);
      }
    } catch (error) {
      console.error('Failed to fetch available organizations:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!password) {
      setErr('Password is required');
      return false;
    }
    if (password.length < 6) {
      setErr('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setErr('Passwords do not match');
      return false;
    }

    if (userType === 'ngo-user') {
      if (!name.trim()) {
        setErr('Name is required');
        return false;
      }
      if (!ngoUserInfo.ngoName) {
        setErr('Please select an NGO');
        return false;
      }
      if (!ngoUserInfo.email.trim()) {
        setErr('Email is required');
        return false;
      }
      if (!ngoUserInfo.position.trim()) {
        setErr('Position is required');
        return false;
      }
      if (!ngoUserInfo.mobileNo.trim()) {
        setErr('Mobile number is required');
        return false;
      }
    } else if (userType === 'ngo') {
      if (!name.trim()) {
        setErr('Contact person name is required');
        return false;
      }
      if (!ngoInfo.name.trim()) {
        setErr('NGO name is required');
        return false;
      }
      if (!ngoInfo.contactEmail.trim()) {
        setErr('Contact email is required');
        return false;
      }
      if (!ngoInfo.contactPhone.trim()) {
        setErr('Contact phone is required');
        return false;
      }
      if (!ngoInfo.address.trim()) {
        setErr('Address is required');
        return false;
      }
      if (!ngoInfo.city.trim()) {
        setErr('City is required');
        return false;
      }
    } else if (userType === 'organization') {
      if (!orgInfo.businessName.trim()) {
        setErr('Business name is required');
        return false;
      }
      if (!orgInfo.businessType.trim()) {
        setErr('Business type is required');
        return false;
      }
      if (!orgInfo.industryType.trim()) {
        setErr('Industry type is required');
        return false;
      }
      if (!orgInfo.registrationNumber.trim()) {
        setErr('Registration number is required');
        return false;
      }
      if (!orgInfo.owner.fullName.trim()) {
        setErr('Owner full name is required');
        return false;
      }
      if (!orgInfo.owner.email.trim()) {
        setErr('Owner email is required');
        return false;
      }
      if (!orgInfo.owner.phoneNumber.trim()) {
        setErr('Owner phone number is required');
        return false;
      }
      if (!orgInfo.businessAddress.addressLine1.trim()) {
        setErr('Address line 1 is required');
        return false;
      }
      if (!orgInfo.businessAddress.city.trim()) {
        setErr('City is required');
        return false;
      }
      if (!orgInfo.businessAddress.state.trim()) {
        setErr('State is required');
        return false;
      }
      if (!orgInfo.businessAddress.pincode.trim()) {
        setErr('Pincode is required');
        return false;
      }
      if (!orgInfo.businessAddress.country.trim()) {
        setErr('Country is required');
        return false;
      }
    } else if (userType === 'org-user') {
      if (!orgUserInfo.organizationId.trim()) {
        setErr('Please select an organization');
        return false;
      }
      if (!name.trim()) {
        setErr('Name is required');
        return false;
      }
      if (!orgUserInfo.email.trim()) {
        setErr('Email is required');
        return false;
      }
      if (!orgUserInfo.mobileNo.trim()) {
        setErr('Mobile number is required');
        return false;
      }
      if (!orgUserInfo.position.trim()) {
        setErr('Position is required');
        return false;
      }
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      let endpoint = '';
      let body: Record<string, unknown>  = {};

      if (userType === 'ngo-user') {
        endpoint = `${API}/v1/auth/register-ngo-user`;
        body = {
          ngoName: ngoUserInfo.ngoName,
          name,
          email: ngoUserInfo.email,
          position: ngoUserInfo.position,
          mobileNo: ngoUserInfo.mobileNo,
          password,
        };
      } else if (userType === 'ngo') {
        endpoint = `${API}/v1/auth/register-ngo`;
        body = { name, password, ngoInfo };
      } else if (userType === 'organization') {
        endpoint = `${API}/v1/auth/register-organization`;
        body = {
          businessName: orgInfo.businessName,
          businessType: orgInfo.businessType,
          industryType: orgInfo.industryType,
          registrationNumber: orgInfo.registrationNumber,
          gstNumber: orgInfo.gstNumber,
          password,
          owner: orgInfo.owner,
          businessAddress: orgInfo.businessAddress,
        };
      } else if (userType === 'org-user') {
        endpoint = `${API}/v1/auth/register-org-user`;
        body = {
          organizationId: orgUserInfo.organizationId,
          organizationName: orgUserInfo.organizationName,
          name,
          email: orgUserInfo.email,
          mobileNo: orgUserInfo.mobileNo,
          position: orgUserInfo.position,
          password,
        };
      }

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Registration failed');

      if (userType === 'ngo') {
        alert(j.message || 'NGO registration successful! Your account is pending admin verification.');
        router.push('/auth/login');
      } else if (userType === 'organization') {
        setTokens(j.accessToken, j.refreshToken);
        setIsLoggedIn(true);
        localStorage.setItem('userData', JSON.stringify(j.org || {}));
        localStorage.setItem('userType', 'organization');
        router.push('/org-dashboard');
      } else if (userType === 'ngo-user') {
        setTokens(j.accessToken, j.refreshToken);
        setIsLoggedIn(true);
        localStorage.setItem('userType', 'ngo-user');
        router.push('/ngo-users');
      } else if (userType === 'org-user') {
        setTokens(j.accessToken, j.refreshToken);
        setIsLoggedIn(true);
        localStorage.setItem('userData', JSON.stringify(j.user || {}));
        localStorage.setItem('userType', 'org-user');
        router.push('/org-user-dashboard');
      }
    } catch (e: unknown) {
      const error = e as Error;
      setErr(error.message);
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
            <p className="text-slate-600">Choose your account type and join us</p>
          </div>

          {/* User Type Toggle */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setUserType('ngo-user')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                userType === 'ngo-user'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              NGO User
            </button>
            <button
              type="button"
              onClick={() => setUserType('ngo')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                userType === 'ngo'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              NGO Org
            </button>
            <button
              type="button"
              onClick={() => setUserType('organization')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                userType === 'organization'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Organization
            </button>
            <button
              type="button"
              onClick={() => setUserType('org-user')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                userType === 'org-user'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Org Employee
            </button>
          </div>

          <form onSubmit={submit} className="space-y-5 max-h-96 overflow-y-auto pr-2">
            {/* NGO USER FORM */}
            {userType === 'ngo-user' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select NGO</label>
                  <select
                    value={ngoUserInfo.ngoName}
                    onChange={(e) => setNgoUserInfo({ ...ngoUserInfo, ngoName: e.target.value })}
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={ngoUserInfo.email}
                    onChange={(e) => setNgoUserInfo({ ...ngoUserInfo, email: e.target.value })}
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
                    onChange={(e) => setNgoUserInfo({ ...ngoUserInfo, mobileNo: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                  <input
                    type="text"
                    placeholder="Enter your position"
                    value={ngoUserInfo.position}
                    onChange={(e) => setNgoUserInfo({ ...ngoUserInfo, position: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </>
            )}

            {/* NGO ORGANIZATION FORM */}
            {userType === 'ngo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person Name</label>
                  <input
                    type="text"
                    placeholder="Enter contact person name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name</label>
                    <input
                      type="text"
                      placeholder="Enter organization name"
                      value={ngoInfo.name}
                      onChange={(e) => setNgoInfo({ ...ngoInfo, name: e.target.value })}
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
                      onChange={(e) => setNgoInfo({ ...ngoInfo, subtype: e.target.value })}
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
                      onChange={(e) => setNgoInfo({ ...ngoInfo, contactEmail: e.target.value })}
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
                      onChange={(e) => setNgoInfo({ ...ngoInfo, contactPhone: e.target.value })}
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
                    onChange={(e) => setNgoInfo({ ...ngoInfo, address: e.target.value })}
                    required
                    rows={2}
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
                      onChange={(e) => setNgoInfo({ ...ngoInfo, city: e.target.value })}
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
                      onChange={(e) => setNgoInfo({ ...ngoInfo, registrationNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ORGANIZATION (OWNER) FORM */}
            {userType === 'organization' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      placeholder="Enter business name"
                      value={orgInfo.businessName}
                      onChange={(e) => setOrgInfo({ ...orgInfo, businessName: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Business Type</label>
                    <input
                      type="text"
                      placeholder="e.g. Manufacturing, Services"
                      value={orgInfo.businessType}
                      onChange={(e) => setOrgInfo({ ...orgInfo, businessType: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Industry Type</label>
                    <input
                      type="text"
                      placeholder="e.g. Technology, Healthcare"
                      value={orgInfo.industryType}
                      onChange={(e) => setOrgInfo({ ...orgInfo, industryType: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Registration Number</label>
                    <input
                      type="text"
                      placeholder="Enter registration number"
                      value={orgInfo.registrationNumber}
                      onChange={(e) => setOrgInfo({ ...orgInfo, registrationNumber: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">GST Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter GST number"
                    value={orgInfo.gstNumber}
                    onChange={(e) => setOrgInfo({ ...orgInfo, gstNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Owner Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        placeholder="Enter full name"
                        value={orgInfo.owner.fullName}
                        onChange={(e) => setOrgInfo({ ...orgInfo, owner: { ...orgInfo.owner, fullName: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="Enter email"
                        value={orgInfo.owner.email}
                        onChange={(e) => setOrgInfo({ ...orgInfo, owner: { ...orgInfo.owner, email: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={orgInfo.owner.phoneNumber}
                        onChange={(e) => setOrgInfo({ ...orgInfo, owner: { ...orgInfo.owner, phoneNumber: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">PAN (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter PAN"
                        value={orgInfo.owner.panNumber}
                        onChange={(e) => setOrgInfo({ ...orgInfo, owner: { ...orgInfo.owner, panNumber: e.target.value } })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Business Address</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 1</label>
                    <input
                      type="text"
                      placeholder="Enter address line 1"
                      value={orgInfo.businessAddress.addressLine1}
                      onChange={(e) => setOrgInfo({ ...orgInfo, businessAddress: { ...orgInfo.businessAddress, addressLine1: e.target.value } })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                      <input
                        type="text"
                        placeholder="Enter city"
                        value={orgInfo.businessAddress.city}
                        onChange={(e) => setOrgInfo({ ...orgInfo, businessAddress: { ...orgInfo.businessAddress, city: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                      <input
                        type="text"
                        placeholder="Enter state"
                        value={orgInfo.businessAddress.state}
                        onChange={(e) => setOrgInfo({ ...orgInfo, businessAddress: { ...orgInfo.businessAddress, state: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Pincode</label>
                      <input
                        type="text"
                        placeholder="Enter pincode"
                        value={orgInfo.businessAddress.pincode}
                        onChange={(e) => setOrgInfo({ ...orgInfo, businessAddress: { ...orgInfo.businessAddress, pincode: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                      <input
                        type="text"
                        placeholder="Enter country"
                        value={orgInfo.businessAddress.country}
                        onChange={(e) => setOrgInfo({ ...orgInfo, businessAddress: { ...orgInfo.businessAddress, country: e.target.value } })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ORG USER (EMPLOYEE) FORM */}
            {userType === 'org-user' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Your Organization</label>
                  <select
                    value={orgUserInfo.organizationId}
                    onChange={(e) => {
                      const selectedOrg = availableOrganizations.find(org => org.id === e.target.value);
                      setOrgUserInfo({
                        ...orgUserInfo,
                        organizationId: e.target.value,
                        organizationName: selectedOrg?.name || ''
                      });
                    }}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 transition-all"
                  >
                    <option value="" disabled>Select your organization</option>
                    {availableOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={orgUserInfo.email}
                    onChange={(e) => setOrgUserInfo({ ...orgUserInfo, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={orgUserInfo.mobileNo}
                      onChange={(e) => setOrgUserInfo({ ...orgUserInfo, mobileNo: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                    <input
                      type="text"
                      placeholder="Enter your position"
                      value={orgUserInfo.position}
                      onChange={(e) => setOrgUserInfo({ ...orgUserInfo, position: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password fields for all types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Create a strong password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>
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
                `Register as ${userType === 'ngo-user' ? 'NGO User' : userType === 'ngo' ? 'NGO Organization' : userType === 'organization' ? 'Organization' : 'Organization Employee'}`
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
