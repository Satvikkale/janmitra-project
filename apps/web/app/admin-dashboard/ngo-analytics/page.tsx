'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users2,
  Bell,
  CalendarDays,
  UserRound,
  PackageSearch,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

type BreakdownItem = { name: string; value: number };

type AdminSummary = {
  generatedAt: string;
  totals: {
    orgs: number;
    ngos: number;
    verifiedNgos: number;
    societies: number;
    approvedSocieties: number;
    pendingSocieties: number;
    rejectedSocieties: number;
    users: number;
    complaints: number;
    orgComplaints: number;
    events: number;
    upcomingEvents: number;
    notifications: number;
    unreadNotifications: number;
    memberships: number;
    ngoUsers: number;
    activeNgoUsers: number;
    organizationUsers: number;
    activeOrganizationUsers: number;
  };
  charts: {
    monthlyActivity: Array<{
      month: string;
      orgs: number;
      societies: number;
      complaints: number;
      orgComplaints: number;
      events: number;
      users: number;
      notifications: number;
      memberships: number;
    }>;
    orgTypeBreakdown: BreakdownItem[];
    orgCityBreakdown: BreakdownItem[];
    societyStatusBreakdown: BreakdownItem[];
    complaintStatusBreakdown: BreakdownItem[];
    complaintPriorityBreakdown: BreakdownItem[];
    complaintCategoryBreakdown: BreakdownItem[];
    orgComplaintStatusBreakdown: BreakdownItem[];
    orgComplaintSourceBreakdown: BreakdownItem[];
    eventStatusBreakdown: BreakdownItem[];
    notificationTypeBreakdown: BreakdownItem[];
    membershipStatusBreakdown: BreakdownItem[];
    membershipRoleBreakdown: BreakdownItem[];
    userRoleBreakdown: BreakdownItem[];
  };
  recent: {
    orgs: Array<{ _id: string; name: string; type?: string; city?: string; isVerified?: boolean; createdAt?: string }>;
    societies: Array<{ _id: string; name: string; status?: string; createdAt?: string }>;
    complaints: Array<{ _id: string; category: string; status: string; priority: string; societyId?: string; orgId?: string; createdAt?: string }>;
    orgComplaints: Array<{ _id: string; orgId: string; status: string; sourceType?: string; complaintCategory?: string; createdAt?: string }>;
    events: Array<{ _id: string; title: string; status: string; location?: string; createdAt?: string }>;
    users: Array<{ _id: string; name: string; email?: string; roles?: string[]; createdAt?: string }>;
  };
};

const STATUS_COLORS: Record<string, string> = {
  open: '#f59e0b',
  assigned: '#3b82f6',
  in_progress: '#8b5cf6',
  resolved: '#10b981',
  closed: '#94a3b8',
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  upcoming: '#3b82f6',
  ongoing: '#8b5cf6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const PIE_COLORS = ['#2563eb', '#7c3aed', '#0f766e', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#22c55e'];

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 12px 24px rgba(15,23,42,0.08)',
};

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let startTime = 0;
    const startValue = displayValue;
    const endValue = value;

    const tick = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / 700, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (endValue - startValue) * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <span>{displayValue.toLocaleString()}{suffix}</span>;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900"><AnimatedCounter value={value} /></p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function BreakdownPie({ title, data }: { title: string; data: BreakdownItem[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">Simple distribution view.</p>
        </div>
        <PackageSearch className="h-5 w-5 text-slate-400" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={4} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        {data.map((entry, index) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
            {entry.name} ({entry.value})
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}

export default function NGOAnalytics() {
  const { isLoggedIn } = useAuth();
  const [data, setData] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportType, setExportType] = useState<'summary' | 'complaints' | 'orgs' | 'societies'>('summary');
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchSummary = async () => {
    try {
      setIsRefreshing(true);
      const summary = await apiFetch('/v1/analytics/admin-summary');
      setData(summary);
      setError(null);
    } catch (fetchError) {
      console.error('Error fetching admin analytics summary:', fetchError);
      setError('Failed to load database analytics.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      void fetchSummary();
    }
  }, [isLoggedIn]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    [],
  );

  const complaintStatus = data?.charts.complaintStatusBreakdown ?? [];
  const orgTypes = data?.charts.orgTypeBreakdown ?? [];
  const monthlyActivity = data?.charts.monthlyActivity ?? [];

  const exportToExcel = () => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();

    if (exportType === 'summary') {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          { Metric: 'Organizations', Value: data.totals.orgs },
          { Metric: 'NGOs', Value: data.totals.ngos },
          { Metric: 'Verified NGOs', Value: data.totals.verifiedNgos },
          { Metric: 'Societies', Value: data.totals.societies },
          { Metric: 'Complaints', Value: data.totals.complaints },
          { Metric: 'Org Complaints', Value: data.totals.orgComplaints },
          { Metric: 'Events', Value: data.totals.events },
          { Metric: 'Users', Value: data.totals.users },
          { Metric: 'Notifications', Value: data.totals.notifications },
        ]),
        'Summary',
      );
    }

    if (exportType === 'complaints' || exportType === 'summary') {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(data.recent.complaints.map((item) => ({
          ID: item._id,
          Category: item.category,
          Status: item.status,
          Priority: item.priority,
          Society: item.societyId || '',
          Organization: item.orgId || '',
          CreatedAt: formatDate(item.createdAt),
        }))),
        'Complaints',
      );
    }

    if (exportType === 'orgs' || exportType === 'summary') {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(data.recent.orgs.map((item) => ({
          ID: item._id,
          Name: item.name,
          Type: item.type || '',
          City: item.city || '',
          Verified: item.isVerified ? 'Yes' : 'No',
          CreatedAt: formatDate(item.createdAt),
        }))),
        'Organizations',
      );
    }

    if (exportType === 'societies' || exportType === 'summary') {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(data.recent.societies.map((item) => ({
          ID: item._id,
          Name: item.name,
          Status: item.status || '',
          CreatedAt: formatDate(item.createdAt),
        }))),
        'Societies',
      );
    }

    XLSX.writeFile(workbook, `Database_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  const exportToPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('Database Analytics', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, 26, { align: 'center' });

    const summaryRows = [
      ['Organizations', String(data.totals.orgs)],
      ['NGOs', String(data.totals.ngos)],
      ['Verified NGOs', String(data.totals.verifiedNgos)],
      ['Societies', String(data.totals.societies)],
      ['Complaints', String(data.totals.complaints)],
      ['Org Complaints', String(data.totals.orgComplaints)],
      ['Events', String(data.totals.events)],
      ['Users', String(data.totals.users)],
      ['Notifications', String(data.totals.notifications)],
    ];

    autoTable(doc, {
      startY: 36,
      head: [['Metric', 'Value']],
      body: summaryRows,
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    });

    doc.save(`Database_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportModal(false);
  };

  if (!isLoggedIn) {
    return <div className="p-8 text-slate-700">Please log in to view analytics.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.10),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-8">
        <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
            <div>
              <p className="font-semibold text-slate-900">Loading analytics</p>
              <p className="text-sm text-slate-500">Reading the database summary.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="m-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.10),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-3 text-white shadow-lg shadow-slate-900/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Database Analytics</h1>
                  <p className="mt-1 text-sm text-slate-500">A compact summary of orgs, societies, complaints, events, users, and notifications.</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
                <span>Updated from the database</span>
                <span>•</span>
                <span>{todayLabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => void fetchSummary()}
                disabled={isRefreshing}
                className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                aria-label="Refresh analytics"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Organizations" value={data.totals.orgs} detail={`${data.totals.verifiedNgos} verified NGOs`} icon={Building2} accent="bg-gradient-to-br from-blue-600 to-cyan-500" />
          <MetricCard title="Societies" value={data.totals.societies} detail={`${data.totals.pendingSocieties} pending approvals`} icon={Users2} accent="bg-gradient-to-br from-violet-600 to-fuchsia-500" />
          <MetricCard title="Complaints" value={data.totals.complaints} detail={`${data.totals.orgComplaints} routed to organizations`} icon={ShieldAlert} accent="bg-gradient-to-br from-amber-500 to-orange-500" />
          <MetricCard title="Users" value={data.totals.users} detail={`${data.totals.unreadNotifications} unread notifications`} icon={UserRound} accent="bg-gradient-to-br from-emerald-500 to-green-500" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Events" value={data.totals.events} detail={`${data.totals.upcomingEvents} upcoming now`} icon={CalendarDays} accent="bg-gradient-to-br from-sky-600 to-blue-500" />
          <MetricCard title="Notifications" value={data.totals.notifications} detail={`${data.totals.unreadNotifications} unread`} icon={Bell} accent="bg-gradient-to-br from-slate-700 to-slate-900" />
          <MetricCard title="Memberships" value={data.totals.memberships} detail={`${data.totals.pendingSocieties} societies pending`} icon={PackageSearch} accent="bg-gradient-to-br from-teal-600 to-cyan-500" />
          <MetricCard title="Activity" value={monthlyActivity.reduce((sum, item) => sum + item.complaints + item.orgComplaints + item.events + item.societies + item.orgs + item.users + item.notifications + item.memberships, 0)} detail="Total records in the last 6 months" icon={TrendingUp} accent="bg-gradient-to-br from-indigo-600 to-violet-500" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Monthly activity</h2>
                <p className="text-sm text-slate-500">Database additions over the last six months.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={monthlyActivity}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="complaints" stroke="#2563eb" strokeWidth={2.5} fill="url(#activityGrad)" name="Complaints" />
                <Area type="monotone" dataKey="orgComplaints" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={0.15} name="Org Complaints" />
                <Area type="monotone" dataKey="events" stroke="#10b981" strokeWidth={2.5} fillOpacity={0.12} name="Events" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <BreakdownPie title="Complaint status" data={complaintStatus} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownPie title="Organization types" data={orgTypes} />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Key status counts</h2>
                <p className="text-sm text-slate-500">Quick view of the database state.</p>
              </div>
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {[
                { label: 'Societies approved', value: data.totals.approvedSocieties, color: 'bg-emerald-100 text-emerald-700' },
                { label: 'Societies pending', value: data.totals.pendingSocieties, color: 'bg-amber-100 text-amber-700' },
                { label: 'Societies rejected', value: data.totals.rejectedSocieties, color: 'bg-rose-100 text-rose-700' },
                { label: 'Unread notifications', value: data.totals.unreadNotifications, color: 'bg-slate-100 text-slate-700' },
                { label: 'Approved memberships', value: data.charts.membershipStatusBreakdown.find((item) => item.name === 'approved')?.value ?? 0, color: 'bg-cyan-100 text-cyan-700' },
                { label: 'Verified NGOs', value: data.totals.verifiedNgos, color: 'bg-blue-100 text-blue-700' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Recent complaints</h2>
            <p className="mb-4 text-sm text-slate-500">Latest complaint records.</p>
            <div className="space-y-3">
              {data.recent.complaints.length > 0 ? data.recent.complaints.map((item) => (
                <div key={item._id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.category}</p>
                      <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_COLORS[item.status] ? 'bg-white text-slate-600 shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Society {item.societyId || item.orgId || 'N/A'}</span>
                    <span className={item.priority === 'high' ? 'text-red-600' : item.priority === 'med' ? 'text-amber-600' : 'text-emerald-600'}>{item.priority}</span>
                  </div>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No complaints found.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Recent organizations</h2>
            <p className="mb-4 text-sm text-slate-500">Latest NGO and organization records.</p>
            <div className="space-y-3">
              {data.recent.orgs.length > 0 ? data.recent.orgs.map((item) => (
                <div key={item._id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.type || 'Unknown'} • {item.city || 'N/A'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No organizations found.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Recent events</h2>
            <p className="mb-4 text-sm text-slate-500">Current NGO event records.</p>
            <div className="space-y-3">
              {data.recent.events.length > 0 ? data.recent.events.map((item) => (
                <div key={item._id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.location || 'N/A'} • {formatDate(item.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.status in STATUS_COLORS ? 'bg-white text-slate-600 shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No events found.</p>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Recent societies</h2>
            <p className="mb-4 text-sm text-slate-500">Latest society records.</p>
            <div className="space-y-3">
              {data.recent.societies.length > 0 ? data.recent.societies.map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.status || 'unknown'}
                  </span>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No societies found.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Recent users</h2>
            <p className="mb-4 text-sm text-slate-500">Latest user records and roles.</p>
            <div className="space-y-3">
              {data.recent.users.length > 0 ? data.recent.users.map((item) => (
                <div key={item._id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.email || 'No email'} • {formatDate(item.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {(item.roles || ['resident']).slice(0, 2).map((role) => (
                        <span key={role} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )) : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">No users found.</p>}
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Export report</h2>
                <p className="text-sm text-slate-500">Choose a simple database view.</p>
              </div>
              <button type="button" onClick={() => setShowExportModal(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-200">
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'summary', label: 'Summary' },
                { value: 'complaints', label: 'Complaints' },
                { value: 'orgs', label: 'Organizations' },
                { value: 'societies', label: 'Societies' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExportType(option.value as typeof exportType)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${exportType === option.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <span className="text-sm font-medium text-slate-800">{option.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={exportToExcel} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                Excel
              </button>
              <button type="button" onClick={exportToPDF} className="flex-1 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700">
                PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
