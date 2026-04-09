'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiFetch, getAccessToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

interface Organization {
  id: string;
  businessName: string;
  businessType: string;
  industryType: string;
  owner: {
    fullName: string;
    email: string;
    phoneNumber: string;
    panNumber?: string;
    aadhaarNumber?: string;
  };
  businessAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

interface OrgComplaint {
  _id: string;
  complaintId?: string;
  orgId: string;
  status: 'pending' | 'assigned' | 'rejected' | 'resolved';
  assignedToUserId?: string;
  assignedToUserName?: string;
  rejectionReason?: string;
  complaintCategory?: string;
  complaintDescription?: string;
  reporterName?: string;
  reporterSociety?: string;
  auditTrail: AuditTrailEntry[];
  createdAt: string;
  updatedAt: string;
}

interface AuditTrailEntry {
  userId: string;
  userName: string;
  action: 'created' | 'assigned' | 'rejected' | 'updated' | 'resolved';
  timestamp: string;
  note?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  status: 'active' | 'inactive';
}

interface EmployeeResponse {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  position?: string;
  department?: string;
  isActive?: boolean;
}

export default function OrgDashboard() {
  const STATUS_FILTERS = ['all', 'pending', 'assigned', 'rejected', 'resolved'] as const;
  const [activeTab, setActiveTab] = useState<'complaints' | 'employees' | 'profile'>('complaints');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [complaints, setComplaints] = useState<OrgComplaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', position: '', password: '' });
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  
  // Complaint management states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<OrgComplaint | null>(null);
  const [assigningUserId, setAssigningUserId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'rejected' | 'resolved'>('all');
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const resolveOrganizationId = (raw: unknown): string => {
    const data = (raw || {}) as {
      organizationId?: string;
      orgId?: string;
      _id?: string;
      id?: string;
    };
    return String(data.organizationId || data.orgId || data._id || data.id || '').trim();
  };

  const fetchOrgData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        setOrganization(parsedData);

        const orgId = resolveOrganizationId(parsedData);
        if (!orgId) {
          setComplaints([]);
          setError('Organization id not found. Please login again.');
          return;
        }

        // Fetch real complaints from API
        try {
          const complaintsData = await apiFetch(`/v1/org-complaints/org/${orgId}?sourceType=booking&limit=50`);
          const rows = Array.isArray(complaintsData?.data)
            ? complaintsData.data
            : Array.isArray(complaintsData)
            ? complaintsData
            : [];
          setComplaints(rows);
        } catch (err) {
          console.error('Failed to fetch complaints:', err);
          setComplaints([]);
        }
      }

      // Fetch employees from API
      try {
        const employeesData = await apiFetch('/v1/organization-users/my-employees');
        const employeeRows = Array.isArray(employeesData) ? employeesData : [];

        setEmployees(employeeRows.map((emp: EmployeeResponse) => ({
          id: String(emp._id || emp.id || ''),
          name: emp.name,
          email: emp.email,
          position: emp.position || 'Employee',
          department: emp.department || 'General',
          status: emp.isActive ? 'active' : 'inactive',
        })) || []);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setEmployees([]);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load organization data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    fetchOrgData();
  }, [isLoggedIn, fetchOrgData, router]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
      setError('Name, email, and password are required');
      return;
    }

    try {
      setAddingEmployee(true);
      const token = getAccessToken();
      const orgData = organization || JSON.parse(localStorage.getItem('userData') || '{}');

      const response = await fetch(`${API}/v1/auth/register-org-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: orgData.id,
          organizationName: orgData.businessName,
          name: newEmployee.name,
          email: newEmployee.email,
          position: newEmployee.position,
          password: newEmployee.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add employee');
      }

      setNewEmployee({ name: '', email: '', position: '', password: '' });
      setShowAddEmployeeForm(false);
      await fetchOrgData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      setDeletingEmployeeId(employeeId);
      const token = getAccessToken();

      const response = await fetch(`${API}/v1/organization-users/${employeeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      setEmployees(employees.filter(emp => emp.id !== employeeId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('userType');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  const handleAssignComplaint = async () => {
    if (!selectedComplaint || !assigningUserId) {
      setError('Please select an employee to assign to');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAccessToken();
      const selectedOrgUser = employees.find(e => e.id === assigningUserId);

      const response = await fetch(`${API}/v1/org-complaints/${selectedComplaint._id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignedToUserId: assigningUserId,
          assignedToUserName: selectedOrgUser?.name || 'Unknown',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign complaint');
      }

      setShowAssignModal(false);
      setAssigningUserId('');
      await fetchOrgData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign complaint');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectComplaint = async () => {
    if (!selectedComplaint || !rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAccessToken();

      const response = await fetch(`${API}/v1/org-complaints/${selectedComplaint._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rejectionReason: rejectReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject complaint');
      }

      setShowRejectModal(false);
      setRejectReason('');
      await fetchOrgData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject complaint');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: 'pending' | 'assigned' | 'rejected' | 'resolved') => {
    if (!selectedComplaint) return;

    try {
      setActionLoading(true);
      const token = getAccessToken();

      const response = await fetch(`${API}/v1/org-complaints/${selectedComplaint._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          note: `Status updated to ${status}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update complaint status');
      }

      await fetchOrgData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update complaint status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600"></div>
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
                {organization?.businessName || 'Organization'}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                {organization?.industryType} • {organization?.businessType}
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
              onClick={() => setActiveTab('complaints')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'complaints'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Complaints ({complaints.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'employees'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Employees ({employees.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-4 font-medium text-sm text-red-600 hover:text-red-700 ml-auto transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl shadow-md p-6">
          {/* Complaints Tab */}
          {activeTab === 'complaints' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Complaints Management</h2>
                <div className="flex gap-2">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        statusFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {complaints.length === 0 ? (
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
                  <p className="text-slate-600">No complaints yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints
                    .filter((complaint) => statusFilter === 'all' || complaint.status === statusFilter)
                    .map((complaint) => (
                      <div
                        key={complaint._id}
                        className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              Complaint raised by {String(complaint.reporterName || complaint._id).slice(0, 8)}
                            </h3>
                            <p className="text-slate-600 text-sm mt-1">
                              {complaint.complaintCategory} | From: {complaint.reporterSociety}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              complaint.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : complaint.status === 'assigned'
                                ? 'bg-blue-100 text-blue-700'
                                : complaint.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {complaint.status}
                          </span>
                        </div>

                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {complaint.complaintDescription}
                        </p>

                        {complaint.assignedToUserName && (
                          <p className="text-slate-600 text-xs mb-3">
                            ✓ Assigned to: <span className="font-medium">{complaint.assignedToUserName}</span>
                          </p>
                        )}

                        {complaint.rejectionReason && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                            <p className="text-red-700">
                              <strong>Rejection Reason:</strong> {complaint.rejectionReason}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <p className="text-slate-500 text-xs">
                            Created: {new Date(complaint.createdAt).toLocaleDateString()}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setShowDetailModal(true);
                              }}
                              className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200 transition-colors"
                            >
                              View Details
                            </button>

                            {complaint.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedComplaint(complaint);
                                    setShowAssignModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                                >
                                  Assign
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedComplaint(complaint);
                                    setShowRejectModal(true);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Employees</h2>
                <button
                  onClick={() => setShowAddEmployeeForm(!showAddEmployeeForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  {showAddEmployeeForm ? 'Cancel' : 'Add Employee'}
                </button>
              </div>

              {showAddEmployeeForm && (
                <div className="mb-6 p-6 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Employee</h3>
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                        <input
                          type="text"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                        <input
                          type="text"
                          value={newEmployee.position}
                          onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                        <input
                          type="password"
                          value={newEmployee.password}
                          onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingEmployee}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {addingEmployee ? 'Adding...' : 'Add Employee'}
                    </button>
                  </form>
                </div>
              )}

              {employees.length === 0 ? (
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <p className="text-slate-600">No employees yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                            {employee.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{employee.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {employee.position}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {employee.department}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                employee.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {employee.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              disabled={deletingEmployeeId === employee.id}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50"
                            >
                              {deletingEmployeeId === employee.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && organization && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Organization Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Organization Info */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Organization Details</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Business Name</span>
                      <span className="text-slate-900 font-medium">
                        {organization.businessName}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Business Type</span>
                      <span className="text-slate-900 font-medium">
                        {organization.businessType}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Industry Type</span>
                      <span className="text-slate-900 font-medium">
                        {organization.industryType}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-600">Registration Number</span>
                      <span className="text-slate-900 font-medium">
                        {organization.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Owner Information</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Full Name</span>
                      <span className="text-slate-900 font-medium">
                        {organization.owner.fullName}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Email</span>
                      <span className="text-slate-900 font-medium">{organization.owner.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Phone</span>
                      <span className="text-slate-900 font-medium">
                        {organization.owner.phoneNumber}
                      </span>
                    </div>
                    {organization.owner.panNumber && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">PAN</span>
                        <span className="text-slate-900 font-medium">
                          {organization.owner.panNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Info */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Address</h3>
                  <div className="space-y-2">
                    <p className="text-slate-900">
                      {organization.businessAddress.addressLine1}
                      {organization.businessAddress.addressLine2 &&
                        `, ${organization.businessAddress.addressLine2}`}
                    </p>
                    <p className="text-slate-600">
                      {organization.businessAddress.city},
                      {organization.businessAddress.state}{' '}
                      {organization.businessAddress.pincode}
                    </p>
                    <p className="text-slate-600">
                      {organization.businessAddress.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Assign Complaint</h3>
            <p className="text-slate-600 text-sm mb-4">
              Select an employee to assign this complaint to:
            </p>

            <div className="mb-4">
              <select
                value={assigningUserId}
                onChange={(e) => setAssigningUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Employee --</option>
                {employees.filter(e => e.status === 'active').map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningUserId('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignComplaint}
                disabled={actionLoading || !assigningUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Reject Complaint</h3>
            <p className="text-slate-600 text-sm mb-4">
              Please provide a reason for rejection:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectComplaint}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Complaint #{String(selectedComplaint.complaintId || selectedComplaint._id).slice(0, 8)}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Complaint Details */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-900 mb-4">Complaint Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
                    <p className="text-slate-900 mt-1 capitalize">{selectedComplaint.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Category</p>
                    <p className="text-slate-900 mt-1">{selectedComplaint.complaintCategory}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Reporter</p>
                    <p className="text-slate-900 mt-1">{selectedComplaint.reporterName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Source Society</p>
                    <p className="text-slate-900 mt-1">{selectedComplaint.reporterSociety}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Description</p>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {selectedComplaint.complaintDescription}
                </p>
              </div>

              {selectedComplaint.assignedToUserName && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 uppercase">Assigned To</p>
                  <p className="text-blue-900 mt-1 font-medium">
                    {selectedComplaint.assignedToUserName}
                  </p>
                </div>
              )}

              {selectedComplaint.rejectionReason && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-700 uppercase">Rejection Reason</p>
                  <p className="text-red-900 mt-1">{selectedComplaint.rejectionReason}</p>
                </div>
              )}

              {/* Audit Trail */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Progress Timeline</h4>
                <div className="space-y-3">
                  {selectedComplaint.auditTrail && selectedComplaint.auditTrail.length > 0 ? (
                    selectedComplaint.auditTrail.map((entry, idx) => (
                      <div key={idx} className="flex gap-4 pb-3 border-b border-slate-100 last:border-0">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-600" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {entry.userName}
                              </p>
                              <p className="text-slate-600 text-xs">
                                {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                              </p>
                            </div>
                            <p className="text-slate-500 text-xs whitespace-nowrap">
                              {new Date(entry.timestamp).toLocaleDateString()} {' '}
                              {new Date(entry.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {entry.note && (
                            <p className="text-slate-600 text-xs mt-1">{entry.note}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No history available</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedComplaint.status === 'pending' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowAssignModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowRejectModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}

              {selectedComplaint.status === 'assigned' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      handleUpdateStatus('resolved');
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Mark Resolved'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
