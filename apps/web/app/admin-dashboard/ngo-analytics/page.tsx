'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface NGO {
  _id: string;
  ngoName: string;
  isVerified: boolean;
  categories: string[];
  city: string;
  createdAt: string;
}

interface Society {
  _id: string;
  name: string;
  createdAt: string;
  isVerified?: boolean;
}

interface Complaint {
  _id: string;
  category: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'med' | 'high';
  createdAt: string;
  societyId: string;
}

interface AnalyticsData {
  ngos: { pending: NGO[]; verified: NGO[] };
  societies: { pending: Society[]; verified: Society[] };
  complaints: Complaint[];
}

function normalizeSocietiesResponse(input: unknown): { pending: Society[]; verified: Society[] } {
  const fallback = { pending: [], verified: [] };
  if (!input) return fallback;

  if (Array.isArray(input)) {
    const pending = input
      .filter((s) => (s?.status ?? 'approved') === 'pending')
      .map((s) => ({ _id: s._id, name: s.name, createdAt: s.createdAt, isVerified: !!s.isVerified }));
    const verified = input
      .filter((s) => (s?.status ?? 'approved') === 'approved' || (s?.status === undefined && s?.isVerified !== false))
      .map((s) => ({ _id: s._id, name: s.name, createdAt: s.createdAt, isVerified: !!s.isVerified }));
    return { pending, verified };
  }

  const obj = input as { pending?: Society[]; verified?: Society[] };
  return {
    pending: Array.isArray(obj.pending) ? obj.pending : [],
    verified: Array.isArray(obj.verified) ? obj.verified : [],
  };
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  priority: string;
  category: string;
  ngoVerification: string;
  reportType: 'complaints' | 'ngos' | 'societies' | 'summary';
}

const STATUS_COLORS: Record<string, string> = {
  open: '#FBBF24', assigned: '#60A5FA', in_progress: '#A78BFA',
  resolved: '#34D399', closed: '#9CA3AF'
};
const PRIORITY_COLORS: Record<string, string> = {
  high: '#F87171', med: '#FBBF24', low: '#34D399'
};

export default function NGOAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', status: '', priority: '',
    category: '', ngoVerification: '', reportType: 'summary'
  });
  const { isLoggedIn } = useAuth();

  const fetchAllData = useCallback(async () => {
    try {
      const [ngosData, societiesData, complaintsData] = await Promise.all([
        apiFetch('/v1/orgs/ngos'),
        apiFetch('/v1/societies?includePending=true'),
        apiFetch('/v1/complaints')
      ]);
      setData({ ngos: ngosData, societies: normalizeSocietiesResponse(societiesData), complaints: complaintsData });
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchAllData();
  }, [isLoggedIn, fetchAllData]);

  useEffect(() => {
    if (!isLoggedIn || !autoRefresh) return;
    const interval = setInterval(() => { fetchAllData(); }, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, autoRefresh, fetchAllData]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    let fc = [...data.complaints];
    let fn = [...(data.ngos.pending || []), ...(data.ngos.verified || [])];
    let fs = [...(data.societies.pending || []), ...(data.societies.verified || [])];

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fc = fc.filter(c => new Date(c.createdAt) >= fromDate);
      fn = fn.filter(n => new Date(n.createdAt) >= fromDate);
      fs = fs.filter(s => new Date(s.createdAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      fc = fc.filter(c => new Date(c.createdAt) <= toDate);
      fn = fn.filter(n => new Date(n.createdAt) <= toDate);
      fs = fs.filter(s => new Date(s.createdAt) <= toDate);
    }
    if (filters.status) fc = fc.filter(c => c.status === filters.status);
    if (filters.priority) fc = fc.filter(c => c.priority === filters.priority);
    if (filters.category) fc = fc.filter(c => c.category === filters.category);
    if (filters.ngoVerification) {
      fn = fn.filter(n => filters.ngoVerification === 'verified' ? n.isVerified : !n.isVerified);
    }
    return { complaints: fc, ngos: fn, societies: fs };
  }, [data, filters]);

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.complaints.map(c => c.category))];
  }, [data]);

  const exportToExcel = () => {
    if (!filteredData) return;
    const workbook = XLSX.utils.book_new();

    if (filters.reportType === 'complaints' || filters.reportType === 'summary') {
      const cd = filteredData.complaints.map(c => ({
        'ID': c._id, 'Category': c.category, 'Status': c.status,
        'Priority': c.priority, 'Created At': new Date(c.createdAt).toLocaleString(), 'Society ID': c.societyId
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cd), 'Complaints');
    }
    if (filters.reportType === 'ngos' || filters.reportType === 'summary') {
      const nd = filteredData.ngos.map(n => ({
        'ID': n._id, 'NGO Name': n.ngoName, 'City': n.city,
        'Categories': n.categories?.join(', ') || '', 'Verified': n.isVerified ? 'Yes' : 'No',
        'Created At': new Date(n.createdAt).toLocaleString()
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(nd), 'NGOs');
    }
    if (filters.reportType === 'societies' || filters.reportType === 'summary') {
      const sd = filteredData.societies.map(s => ({
        'ID': s._id, 'Name': s.name, 'Created At': new Date(s.createdAt).toLocaleString()
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sd), 'Societies');
    }
    if (filters.reportType === 'summary') {
      const summary = [
        { 'Metric': 'Total Complaints', 'Value': filteredData.complaints.length },
        { 'Metric': 'Open Complaints', 'Value': filteredData.complaints.filter(c => c.status === 'open').length },
        { 'Metric': 'In Progress', 'Value': filteredData.complaints.filter(c => c.status === 'in_progress').length },
        { 'Metric': 'Resolved', 'Value': filteredData.complaints.filter(c => c.status === 'resolved').length },
        { 'Metric': 'Total NGOs', 'Value': filteredData.ngos.length },
        { 'Metric': 'Verified NGOs', 'Value': filteredData.ngos.filter(n => n.isVerified).length },
        { 'Metric': 'Total Societies', 'Value': filteredData.societies.length }
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Summary');
    }
    XLSX.writeFile(workbook, `NGO_Analytics_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  const exportToPDF = () => {
    if (!filteredData) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('NGO Analytics Report', pw / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pw / 2, 28, { align: 'center' });

    let yPos = 45;

    if (filters.reportType === 'summary' || filters.reportType === 'complaints') {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Summary Statistics', 14, yPos);
      yPos += 8;
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Complaints', filteredData.complaints.length.toString()],
          ['Open', filteredData.complaints.filter(c => c.status === 'open').length.toString()],
          ['In Progress', filteredData.complaints.filter(c => c.status === 'in_progress').length.toString()],
          ['Resolved', filteredData.complaints.filter(c => c.status === 'resolved').length.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14 },
        tableWidth: 80
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    if (filters.reportType === 'complaints' || filters.reportType === 'summary') {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Complaints Details', 14, yPos);
      yPos += 8;
      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Status', 'Priority', 'Date']],
        body: filteredData.complaints.slice(0, 50).map(c => [
          c.category, c.status, c.priority, new Date(c.createdAt).toLocaleDateString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    if (filters.reportType === 'ngos' || filters.reportType === 'summary') {
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('NGOs Details', 14, yPos);
      yPos += 8;
      autoTable(doc, {
        startY: yPos,
        head: [['NGO Name', 'City', 'Verified', 'Date']],
        body: filteredData.ngos.slice(0, 30).map(n => [
          n.ngoName, n.city || 'N/A', n.isVerified ? 'Yes' : 'No', new Date(n.createdAt).toLocaleDateString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 8 }
      });
    }

    doc.save(`NGO_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportModal(false);
  };

  const clearFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', status: '', priority: '', category: '', ngoVerification: '', reportType: 'summary' });
  };

  if (!isLoggedIn) return <div className="p-8 text-slate-700">Please log in to view analytics.</div>;
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500"></div>
          <p className="text-slate-500 animate-pulse">Loading analytics...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl m-8">
        <p className="text-red-600 font-medium">Error: {error}</p>
      </div>
    );
  }
  if (!data) return null;

  const displayComplaints = filteredData?.complaints || data.complaints;
  const displayNGOs = filteredData?.ngos || [...(data.ngos.pending || []), ...(data.ngos.verified || [])];
  const displaySocieties = filteredData?.societies || [...(data.societies.pending || []), ...(data.societies.verified || [])];

  const totalNGOs = displayNGOs.length;
  const verifiedNGOs = displayNGOs.filter(n => n.isVerified).length;
  const pendingNGOs = displayNGOs.filter(n => !n.isVerified).length;
  const totalSocieties = displaySocieties.length;
  const totalComplaints = displayComplaints.length;

  const complaintStatusData = Object.entries(
    displayComplaints.reduce((acc: Record<string, number>, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: STATUS_COLORS[name] }));

  const complaintPriorityData = Object.entries(
    displayComplaints.reduce((acc: Record<string, number>, c) => { acc[c.priority] = (acc[c.priority] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value, fill: PRIORITY_COLORS[name] }));

  const complaintsByCategoryData = Object.entries(
    displayComplaints.reduce((acc: Record<string, number>, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {})
  ).map(([category, count]) => ({ category, count })).slice(0, 8);

  const ngoVerificationData = [
    { name: 'Verified', value: verifiedNGOs, fill: '#86EFAC' },
    { name: 'Pending', value: pendingNGOs, fill: '#FCD34D' }
  ];

  const getMonthlyTrend = () => {
    const months: Record<string, { ngos: number; societies: number; complaints: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = { ngos: 0, societies: 0, complaints: 0 };
    }
    displayNGOs.forEach(n => { const k = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); if (months[k]) months[k].ngos++; });
    displaySocieties.forEach(s => { const k = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); if (months[k]) months[k].societies++; });
    displayComplaints.forEach(c => { const k = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); if (months[k]) months[k].complaints++; });
    return Object.entries(months).map(([month, values]) => ({ month, ...values }));
  };

  const monthlyTrendData = getMonthlyTrend();
  const resolvedComplaints = displayComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;
  const openComplaints = displayComplaints.filter(c => c.status === 'open').length;
  const inProgressComplaints = displayComplaints.filter(c => c.status === 'in_progress').length;
  const assignedComplaints = displayComplaints.filter(c => c.status === 'assigned').length;

  return (
    <div className="p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            NGO Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-slate-600 bg-white/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded border-slate-300 text-blue-500 focus:ring-blue-400" />
            Auto-refresh
          </label>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showFilters ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white/70 text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            Filters
          </button>
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg">
            Download Report
          </button>
          <button onClick={fetchAllData} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg">
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Filter Data</h3>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Clear All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
              <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
              <select value={filters.priority} onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm">
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
              <select value={filters.category} onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm">
                <option value="">All Categories</option>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">NGO Verification</label>
              <select value={filters.ngoVerification} onChange={(e) => setFilters(prev => ({ ...prev, ngoVerification: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm">
                <option value="">All NGOs</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-blue-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium mb-2">Total NGOs</p>
          <p className="text-3xl font-bold text-slate-800">{totalNGOs}</p>
          <div className="flex gap-2 mt-3">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{verifiedNGOs} verified</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{pendingNGOs} pending</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-purple-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium mb-2">Total Societies</p>
          <p className="text-3xl font-bold text-slate-800">{totalSocieties}</p>
          <p className="text-xs text-slate-400 mt-3">Registered communities</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-amber-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium mb-2">Total Complaints</p>
          <p className="text-3xl font-bold text-slate-800">{totalComplaints}</p>
          <div className="flex gap-2 mt-3">
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{openComplaints} open</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">{inProgressComplaints} active</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-green-100 hover:shadow-md transition-shadow">
          <p className="text-sm text-slate-500 font-medium mb-2">Resolution Rate</p>
          <p className="text-3xl font-bold text-slate-800">{resolutionRate}%</p>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${resolutionRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
              <Legend />
              <Line type="monotone" dataKey="complaints" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', r: 4 }} name="Complaints" />
              <Line type="monotone" dataKey="societies" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 4 }} name="Societies" />
              <Line type="monotone" dataKey="ngos" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} name="NGOs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Complaints by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complaintsByCategoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis dataKey="category" type="category" width={100} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
              <Bar dataKey="count" fill="url(#colorGradient)" radius={[0, 8, 8, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Complaint Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={complaintStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {complaintStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {complaintStatusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }}></span>
                <span className="text-slate-600 capitalize">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Priority Levels</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={complaintPriorityData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {complaintPriorityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {complaintPriorityData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }}></span>
                <span className="text-slate-600 capitalize">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">NGO Verification</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ngoVerificationData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {ngoVerificationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {ngoVerificationData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }}></span>
                <span className="text-slate-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-5">Status Breakdown</h3>
          <div className="space-y-5">
            {[
              { label: 'Open', count: openComplaints, gradient: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50' },
              { label: 'Assigned', count: assignedComplaints, gradient: 'from-blue-400 to-blue-500', bg: 'bg-blue-50' },
              { label: 'In Progress', count: inProgressComplaints, gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' },
              { label: 'Resolved', count: displayComplaints.filter(c => c.status === 'resolved').length, gradient: 'from-green-400 to-emerald-500', bg: 'bg-green-50' },
              { label: 'Closed', count: displayComplaints.filter(c => c.status === 'closed').length, gradient: 'from-slate-400 to-slate-500', bg: 'bg-slate-50' }
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-xl ${item.bg}`}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-700 font-medium">{item.label}</span>
                  <span className="font-semibold text-slate-800">{item.count} ({totalComplaints > 0 ? Math.round((item.count / totalComplaints) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-white/80 rounded-full h-2.5 overflow-hidden">
                  <div className={`bg-gradient-to-r ${item.gradient} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${totalComplaints > 0 ? (item.count / totalComplaints) * 100 : 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-5">Recent Activity</h3>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
            {[...displayComplaints]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 10)
              .map((complaint) => (
                <div key={complaint._id} className="flex items-start gap-3 p-3 bg-slate-50/80 rounded-xl hover:bg-slate-100/80 transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ring-4 ${
                    complaint.status === 'open' ? 'bg-amber-400 ring-amber-100' :
                    complaint.status === 'assigned' ? 'bg-blue-400 ring-blue-100' :
                    complaint.status === 'in_progress' ? 'bg-purple-400 ring-purple-100' :
                    complaint.status === 'resolved' ? 'bg-green-400 ring-green-100' : 'bg-slate-400 ring-slate-100'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{complaint.category}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(complaint.createdAt).toLocaleString()} &bull;{' '}
                      <span className={`font-medium ${complaint.priority === 'high' ? 'text-red-500' : complaint.priority === 'med' ? 'text-amber-500' : 'text-green-500'}`}>
                        {complaint.priority} priority
                      </span>
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                    complaint.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    complaint.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    complaint.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                    complaint.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {complaint.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Download Report</h2>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'summary', label: 'Full Summary' },
                  { value: 'complaints', label: 'Complaints' },
                  { value: 'ngos', label: 'NGOs' },
                  { value: 'societies', label: 'Societies' }
                ].map((type) => (
                  <button key={type.value} onClick={() => setFilters(prev => ({ ...prev, reportType: type.value as FilterState['reportType'] }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${filters.reportType === type.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="text-sm font-medium text-slate-700">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={exportToExcel} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl font-medium transition-all">
                Excel (.xlsx)
              </button>
              <button onClick={exportToPDF} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white py-3 rounded-xl font-medium transition-all">
                PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
