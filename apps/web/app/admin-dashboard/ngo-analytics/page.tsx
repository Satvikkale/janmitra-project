'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Building2, Users2,
  AlertTriangle, CheckCircle2, Clock, ArrowUp, ArrowDown,
  RefreshCw, Zap, BarChart3, PieChartIcon
} from 'lucide-react';

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
  status?: 'pending' | 'approved' | 'rejected';
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
      .map((s) => ({ _id: s._id, name: s.name, createdAt: s.createdAt, isVerified: !!s.isVerified, status: s.status }));
    const verified = input
      .filter((s) => (s?.status ?? 'approved') === 'approved' || (s?.status === undefined && s?.isVerified !== false))
      .map((s) => ({ _id: s._id, name: s.name, createdAt: s.createdAt, isVerified: !!s.isVerified, status: s.status }));
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

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000, suffix = '', prefix = '' }: {
  value: number; duration?: number; suffix?: string; prefix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
}

// Radial Progress Component
function RadialProgress({ value, max, label, color, size = 120 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const data = [{ name: label, value: percentage, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            background={{ fill: '#f1f5f9' }}
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-16">
        <p className="text-2xl font-bold text-slate-800">{Math.round(percentage)}%</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// Live Indicator Pulse
function LiveIndicator() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
    </span>
  );
}

// Change Indicator
function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const change = current - previous;
  const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0';

  if (change === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-1 text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}
    >
      {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      <span>{change > 0 ? '+' : ''}{change} ({percentChange}%)</span>
    </motion.div>
  );
}

export default function NGOAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [previousData, setPreviousData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ngos' | 'societies' | 'complaints'>('overview');
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '', dateTo: '', status: '', priority: '',
    category: '', ngoVerification: '', reportType: 'summary'
  });
  const { isLoggedIn } = useAuth();

  // Use a ref to track current data for previousData comparison without causing dependency cycles
  const dataRef = useRef<AnalyticsData | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [ngosData, societiesData, complaintsData] = await Promise.all([
        apiFetch('/v1/orgs/ngos'),
        apiFetch('/v1/societies?includePending=true'),
        apiFetch('/v1/complaints')
      ]);
      setPreviousData(dataRef.current);
      const newData = { ngos: ngosData, societies: normalizeSocietiesResponse(societiesData), complaints: complaintsData };
      dataRef.current = newData;
      setData(newData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchAllData();
  }, [isLoggedIn, fetchAllData]);

  useEffect(() => {
    if (!isLoggedIn || !autoRefresh) return;
    const interval = setInterval(() => { fetchAllData(); }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, autoRefresh, fetchAllData, refreshInterval]);

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

  // Previous data for change tracking
  const prevNGOs = previousData ? [...(previousData.ngos.pending || []), ...(previousData.ngos.verified || [])] : [];
  const prevSocieties = previousData ? [...(previousData.societies.pending || []), ...(previousData.societies.verified || [])] : [];
  const prevComplaints = previousData?.complaints || [];

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
  const highPriorityComplaints = displayComplaints.filter(c => c.priority === 'high').length;

  // Additional metrics for enhanced analytics - computed values
  const ngoCategories = (() => {
    const categoryCount: Record<string, number> = {};
    displayNGOs.forEach(n => {
      n.categories?.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
    });
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];
    return Object.entries(categoryCount)
      .map(([name, count], index) => ({ name, count, fill: colors[index % colors.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  const ngoCityDistribution = (() => {
    const cityCount: Record<string, number> = {};
    displayNGOs.forEach(n => {
      if (n.city) {
        cityCount[n.city] = (cityCount[n.city] || 0) + 1;
      }
    });
    return Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  })();

  // Weekly trend for the current week
  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekData: { day: string; complaints: number; ngos: number; societies: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = days[date.getDay()];
      const dateStr = date.toDateString();

      weekData.push({
        day: dayStr,
        complaints: displayComplaints.filter(c => new Date(c.createdAt).toDateString() === dateStr).length,
        ngos: displayNGOs.filter(n => new Date(n.createdAt).toDateString() === dateStr).length,
        societies: displaySocieties.filter(s => new Date(s.createdAt).toDateString() === dateStr).length
      });
    }
    return weekData;
  };

  const weeklyData = getWeeklyData();

  // Compute society breakdown
  const verifiedSocieties = displaySocieties.filter(s => {
    if (s.status) return s.status === 'approved';
    return !!s.isVerified;
  }).length;
  const pendingSocieties = displaySocieties.filter(s => {
    if (s.status) return s.status === 'pending';
    return !s.isVerified;
  }).length;

  // Today's stats
  const today = new Date().toDateString();
  const todayComplaints = displayComplaints.filter(c => new Date(c.createdAt).toDateString() === today).length;
  const todayNGOs = displayNGOs.filter(n => new Date(n.createdAt).toDateString() === today).length;
  const todaySocieties = displaySocieties.filter(s => new Date(s.createdAt).toDateString() === today).length;

  const tooltipStyle = { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Platform Analytics</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <LiveIndicator />
                <span className="text-xs text-slate-500">Updated {lastUpdated.toLocaleTimeString()}</span>
                {isRefreshing && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded border-slate-300 text-blue-500 focus:ring-blue-400 w-3.5 h-3.5" />
            <span className="text-xs text-slate-600">Auto</span>
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="text-xs border-0 bg-transparent focus:ring-0 text-slate-600 pr-6" disabled={!autoRefresh}>
              <option value={10}>10s</option><option value={30}>30s</option><option value={60}>1m</option>
            </select>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-sm ${showFilters ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <PieChartIcon className="w-3.5 h-3.5" /> Filters
          </button>
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-sm">
            Export
          </button>
          <button onClick={fetchAllData} disabled={isRefreshing} className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 p-2 rounded-xl transition-all shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-slate-200 shadow-sm w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
          { id: 'ngos', label: 'NGOs', icon: Building2 },
          { id: 'societies', label: 'Societies', icon: Users2 }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Filter Data</h3>
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Clear All</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">From</label><input type="date" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-xs" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">To</label><input type="date" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-xs" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-xs"><option value="">All</option><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Priority</label><select value={filters.priority} onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-xs"><option value="">All</option><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Category</label><select value={filters.category} onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-xs"><option value="">All</option>{categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">NGO Status</label><select value={filters.ngoVerification} onChange={(e) => setFilters(prev => ({ ...prev, ngoVerification: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-xs"><option value="">All</option><option value="verified">Verified</option><option value="pending">Pending</option></select></div>
          </div>
        </motion.div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total NGOs', value: totalNGOs, prev: prevNGOs.length, icon: Building2, color: 'blue', sub: <><span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{verifiedNGOs} verified</span><span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pendingNGOs} pending</span></> },
          { label: 'Societies', value: totalSocieties, prev: prevSocieties.length, icon: Users2, color: 'purple', sub: <span className="text-xs text-slate-400">Registered communities</span> },
          { label: 'Complaints', value: totalComplaints, prev: prevComplaints.length, icon: AlertTriangle, color: 'amber', sub: <><span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{openComplaints} open</span><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">{inProgressComplaints} active</span></> },
          { label: 'Resolution Rate', value: resolutionRate, prev: 0, icon: CheckCircle2, color: 'emerald', suffix: '%', sub: <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1"><motion.div initial={{ width: 0 }} animate={{ width: `${resolutionRate}%` }} transition={{ duration: 1 }} className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full" /></div> }
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{card.label}</p>
              <card.icon className={`w-4 h-4 text-${card.color}-500 opacity-60`} />
            </div>
            <p className="text-3xl font-bold text-slate-900"><AnimatedCounter value={card.value} suffix={card.suffix ?? ''} /></p>
            <ChangeIndicator current={card.value} previous={card.prev} />
            <div className="flex gap-1.5 mt-3 flex-wrap">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Today's Pulse (compact) ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl shadow-lg p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Today&apos;s Activity</h3>
          </div>
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-3 gap-6 mt-4">
          {[
            { label: 'New Complaints', value: todayComplaints, color: 'text-amber-400' },
            { label: 'New NGOs', value: todayNGOs, color: 'text-blue-400' },
            { label: 'New Societies', value: todaySocieties, color: 'text-purple-400' }
          ].map(item => (
            <div key={item.label}>
              <p className="text-slate-400 text-xs mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}><AnimatedCounter value={item.value} /></p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW + COMPLAINTS TABS                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {(activeTab === 'overview' || activeTab === 'complaints') && (
          <motion.div key="overviewComplaints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Row 1: Weekly + Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Weekly Activity</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="gComplaints" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gNGOs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gSocieties" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="complaints" stroke="#F59E0B" strokeWidth={2} fill="url(#gComplaints)" name="Complaints" />
                    <Area type="monotone" dataKey="ngos" stroke="#3B82F6" strokeWidth={2} fill="url(#gNGOs)" name="NGOs" />
                    <Area type="monotone" dataKey="societies" stroke="#8B5CF6" strokeWidth={2} fill="url(#gSocieties)" name="Societies" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="complaints" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 3, strokeWidth: 0 }} name="Complaints" />
                    <Line type="monotone" dataKey="societies" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 3, strokeWidth: 0 }} name="Societies" />
                    <Line type="monotone" dataKey="ngos" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 3, strokeWidth: 0 }} name="NGOs" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Category Bar + Status/Priority Donuts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">By Category</h3>
                {complaintsByCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={complaintsByCategoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="category" type="category" width={90} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <defs><linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366F1" /><stop offset="100%" stopColor="#818CF8" /></linearGradient></defs>
                      <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">No category data</div>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Complaint Status</h3>
                {complaintStatusData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart><Pie data={complaintStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">{complaintStatusData.map((entry, i) => (<Cell key={`cs-${i}`} fill={entry.fill} stroke="white" strokeWidth={2} />))}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">{complaintStatusData.map((e, i) => (<div key={i} className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.fill }} /><span className="text-slate-600 capitalize">{e.name} ({e.value})</span></div>))}</div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">No complaints yet</div>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Priority Levels</h3>
                {complaintPriorityData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart><Pie data={complaintPriorityData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">{complaintPriorityData.map((entry, i) => (<Cell key={`cp-${i}`} fill={entry.fill} stroke="white" strokeWidth={2} />))}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">{complaintPriorityData.map((e, i) => (<div key={i} className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.fill }} /><span className="text-slate-600 capitalize">{e.name} ({e.value})</span></div>))}</div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">No priority data</div>
                )}
              </div>
            </div>

            {/* Row 3: Status Breakdown + Recent Complaints */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Status Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Open', count: openComplaints, gradient: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50', icon: AlertTriangle },
                    { label: 'Assigned', count: assignedComplaints, gradient: 'from-blue-400 to-blue-500', bg: 'bg-blue-50', icon: Users2 },
                    { label: 'In Progress', count: inProgressComplaints, gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50', icon: Activity },
                    { label: 'Resolved', count: displayComplaints.filter(c => c.status === 'resolved').length, gradient: 'from-green-400 to-emerald-500', bg: 'bg-green-50', icon: CheckCircle2 },
                    { label: 'Closed', count: displayComplaints.filter(c => c.status === 'closed').length, gradient: 'from-slate-400 to-slate-500', bg: 'bg-slate-50', icon: Clock }
                  ].map((item) => (
                    <div key={item.label} className={`p-3 rounded-xl ${item.bg}`}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5"><item.icon className="w-3.5 h-3.5 text-slate-500" /><span className="text-slate-700 font-medium">{item.label}</span></div>
                        <span className="font-semibold text-slate-800">{item.count} ({totalComplaints > 0 ? Math.round((item.count / totalComplaints) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${totalComplaints > 0 ? (item.count / totalComplaints) * 100 : 0}%` }} transition={{ duration: 0.8 }} className={`bg-gradient-to-r ${item.gradient} h-2 rounded-full`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800">Recent Complaints</h3>
                  <div className="flex items-center gap-1.5"><LiveIndicator /><span className="text-xs text-slate-400">Live</span></div>
                </div>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {displayComplaints.length > 0 ? [...displayComplaints]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 8)
                    .map((c) => (
                      <div key={c._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition-colors">
                        <div className={`w-2.5 h-2.5 rounded-full ring-[3px] flex-shrink-0 ${
                          c.status === 'open' ? 'bg-amber-400 ring-amber-100' : c.status === 'assigned' ? 'bg-blue-400 ring-blue-100' : c.status === 'in_progress' ? 'bg-purple-400 ring-purple-100' : c.status === 'resolved' ? 'bg-green-400 ring-green-100' : 'bg-slate-400 ring-slate-100'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{c.category}</p>
                          <p className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()} · <span className={c.priority === 'high' ? 'text-red-500' : c.priority === 'med' ? 'text-amber-500' : 'text-green-500'}>{c.priority}</span></p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                          c.status === 'open' ? 'bg-amber-100 text-amber-700' : c.status === 'assigned' ? 'bg-blue-100 text-blue-700' : c.status === 'in_progress' ? 'bg-purple-100 text-purple-700' : c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>
                    )) : <p className="text-sm text-slate-400 text-center py-8">No complaints found</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* NGOs TAB                                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'ngos' && (
          <motion.div key="ngoTab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">NGO Categories</h3>
                {ngoCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ngoCategories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={24}>{ngoCategories.map((_, i) => (<Cell key={`ncell-${i}`} fill={['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#6366F1'][i % 6]} />))}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No categories found</div>}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">NGOs by City</h3>
                {ngoCityDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ngoCityDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="city" type="category" width={90} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No city data</div>}
              </div>
            </div>

            {/* Verification Status + Recent NGOs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Verification Status</h3>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-xs text-slate-700 font-medium">Verified</span></div>
                      <span className="text-xs font-bold text-slate-800">{verifiedNGOs} ({totalNGOs > 0 ? Math.round((verifiedNGOs / totalNGOs) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2.5 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${totalNGOs > 0 ? (verifiedNGOs / totalNGOs) * 100 : 0}%` }} transition={{ duration: 1 }} className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2.5 rounded-full" /></div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /><span className="text-xs text-slate-700 font-medium">Pending</span></div>
                      <span className="text-xs font-bold text-slate-800">{pendingNGOs} ({totalNGOs > 0 ? Math.round((pendingNGOs / totalNGOs) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2.5 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${totalNGOs > 0 ? (pendingNGOs / totalNGOs) * 100 : 0}%` }} transition={{ duration: 1 }} className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2.5 rounded-full" /></div>
                  </div>
                </div>
                {/* NGO Verification Pie */}
                <ResponsiveContainer width="100%" height={160} className="mt-3">
                  <PieChart><Pie data={ngoVerificationData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">{ngoVerificationData.map((e, i) => (<Cell key={`nv-${i}`} fill={e.fill} stroke="white" strokeWidth={2} />))}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent NGO Registrations</h3>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {displayNGOs.length > 0 ? [...displayNGOs]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((ngo) => (
                      <div key={ngo._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ngo.isVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          <Building2 className={`w-4 h-4 ${ngo.isVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{ngo.ngoName}</p>
                          <p className="text-[10px] text-slate-400">{ngo.city || 'N/A'} · {new Date(ngo.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ngo.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ngo.isVerified ? 'Verified' : 'Pending'}</span>
                      </div>
                    )) : <p className="text-sm text-slate-400 text-center py-8">No NGOs registered</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SOCIETIES TAB                                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'societies' && (
          <motion.div key="societiesTab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Society Statistics</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                    <p className="text-xs text-purple-600 font-medium">Total</p>
                    <p className="text-2xl font-bold text-purple-900 mt-0.5"><AnimatedCounter value={totalSocieties} /></p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium">Active</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-0.5"><AnimatedCounter value={verifiedSocieties} /></p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart><Pie data={[{ name: 'Active', value: verifiedSocieties, fill: '#22C55E' },{ name: 'Pending', value: pendingSocieties, fill: '#F59E0B' }]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value"><Cell fill="#22C55E" stroke="white" strokeWidth={2} /><Cell fill="#F59E0B" stroke="white" strokeWidth={2} /></Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">{[{ name: 'Active', color: '#22C55E', val: verifiedSocieties },{ name: 'Pending', color: '#F59E0B', val: pendingSocieties }].map((e) => (<div key={e.name} className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-slate-600">{e.name} ({e.val})</span></div>))}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Society Growth</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrendData}>
                    <defs><linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="societies" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#socGrad)" name="Societies" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Recent Societies */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100 mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Registrations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displaySocieties.length > 0 ? [...displaySocieties]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 9)
                  .map((s) => (
                    <div key={s._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0"><Users2 className="w-4 h-4 text-purple-600" /></div>
                      <div className="min-w-0"><p className="text-xs font-medium text-slate-800 truncate">{s.name}</p><p className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p></div>
                    </div>
                  )) : <p className="text-sm text-slate-400 text-center py-8 col-span-3">No societies registered</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Export Modal ─────────────────────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Export Report</h2>
              <button onClick={() => setShowExportModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">&times;</button>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Report Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'summary', label: 'Full Summary' },{ value: 'complaints', label: 'Complaints' },{ value: 'ngos', label: 'NGOs' },{ value: 'societies', label: 'Societies' }].map((type) => (
                  <button key={type.value} onClick={() => setFilters(prev => ({ ...prev, reportType: type.value as FilterState['reportType'] }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${filters.reportType === type.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="text-xs font-medium text-slate-700">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={exportToExcel} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm">Excel</button>
              <button onClick={exportToPDF} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm">PDF</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}