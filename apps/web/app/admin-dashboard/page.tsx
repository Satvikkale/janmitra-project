import React from 'react'
import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 text-lg">Manage and oversee platform operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link href="/admin-dashboard/manage-ngos" className="block group">
            <div className="bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-slate-200/50">
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6 flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Manage NGOs</h3>
                    <p className="text-blue-600 font-semibold">View &amp; Verify</p>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Review NGO applications, verify organizations, and manage registrations
                </p>
                <div className="mt-6 flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                  <span>Manage NGOs</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin-dashboard/manage-societies" className="block group">
            <div className="bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-slate-200/50">
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6 flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Manage Societies</h3>
                    <p className="text-emerald-600 font-semibold">View &amp; Verify</p>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Review society applications, verify community groups, and manage registrations
                </p>
                <div className="mt-6 flex items-center text-emerald-600 font-medium group-hover:text-emerald-700">
                  <span>Manage Societies</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin-dashboard/ngo-analytics" className="block group">
            <div className="bg-white overflow-hidden shadow-lg rounded-2xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-slate-200/50">
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6 flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Analytics</h3>
                    <p className="text-purple-600 font-semibold">Insights &amp; Reports</p>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  View comprehensive analytics, generate reports, and track platform performance
                </p>
                <div className="mt-6 flex items-center text-purple-600 font-medium group-hover:text-purple-700">
                  <span>Get Started</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
