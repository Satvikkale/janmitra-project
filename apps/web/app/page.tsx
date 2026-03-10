'use client';

import { ArrowRight, Shield, Users, Bell, BarChart3, MessageCircle, Building2, Check, Star, Zap, Clock, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import QRImage from '../assets/images/QR.jpg';

const features = [
  {
    icon: MessageCircle,
    title: 'Smart Complaints',
    description: 'AI categorizes and routes complaints to the right team instantly.',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description: 'Real-time notifications keep everyone informed and connected.',
  },
  {
    icon: BarChart3,
    title: 'Live Analytics',
    description: 'Visual dashboards with actionable insights at your fingertips.',
  },
  {
    icon: Users,
    title: 'Member Portal',
    description: 'Easy member management with verification and access control.',
  },
  {
    icon: Building2,
    title: 'Multi-Society',
    description: 'Manage multiple societies from one unified dashboard.',
  },
  {
    icon: Lock,
    title: 'Bank-grade Security',
    description: 'Enterprise encryption with role-based access protection.',
  },
];

const stats = [
  { value: '500+', label: 'Societies', icon: Building2 },
  { value: '50K+', label: 'Families', icon: Users },
  { value: '99.9%', label: 'Uptime', icon: Zap },
  { value: '<2hr', label: 'Avg Response', icon: Clock },
];

const testimonials = [
  {
    quote: "Complaints that took weeks now get resolved in days. Game changer for our society.",
    author: "Rajesh Kumar",
    role: "Secretary, Green Valley",
    avatar: "RK",
  },
  {
    quote: "The announcement feature alone has saved us countless hours of door-to-door notices.",
    author: "Priya Sharma", 
    role: "President, Sunrise Heights",
    avatar: "PS",
  },
  {
    quote: "Clean interface, powerful features. Exactly what modern societies need.",
    author: "Amit Patel",
    role: "Head, Royal Gardens",
    avatar: "AP",
  },
];

export default function LandingPage() {
  const { isLoggedIn, userType } = useAuth();

  const getDashboardLink = () => {
    switch (userType) {
      case 'admin':
      case 'platform_admin':
        return '/admin-dashboard';
      case 'ngo':
      case 'org_admin':
        return '/ngo-dashboard';
      case 'ngo-user':
      case 'org_member':
        return '/ngo-users';
      default: return '/';
    }
  };

  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f910_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f910_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-6 border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>{' '}
              Trusted by 500+ Housing Societies
            </div>
            
            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Society management,
              <br />
              <span className="text-emerald-600">simplified.</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Streamline complaints, announcements, and community management 
              with one powerful platform built for Indian housing societies.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              {isLoggedIn ? (
                <Link
                  href={getDashboardLink()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all shadow-sm"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 px-6 py-3 text-slate-700 font-medium rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-emerald-600 font-semibold text-sm uppercase tracking-wide mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Purpose-built tools for residential societies and welfare associations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-emerald-600 font-semibold text-sm uppercase tracking-wide mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Simple setup, powerful results. Get your society online today.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Steps */}
            <div className="space-y-8">
              {[
                { step: '01', title: 'Register', desc: 'Create your society profile with basic details. Takes under 2 minutes.' },
                { step: '02', title: 'Invite Members', desc: 'Add residents via phone or email. They get instant access.' },
                { step: '03', title: 'Go Live', desc: 'Start managing complaints, sharing updates, and tracking everything.' },
              ].map((item, idx) => (
                <div key={item.step} className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {item.step}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
              
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700 transition-colors mt-4"
              >
                Get started now
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {/* QR Code Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium mb-4">
                    <Shield className="w-4 h-4" />
                    Mobile App
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Get the App</h3>
                  <p className="text-slate-500 text-sm">Scan to download for residents</p>
                </div>
                <div className="flex justify-center">
                  <Image
                    src={QRImage}
                    alt="Download JanMitra App"
                    className="w-48 h-48 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-emerald-600 font-semibold text-sm uppercase tracking-wide mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Loved by society admins
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item) => (
              <div
                key={item.author}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={`${item.author}-star-${i}`} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{item.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-sm">
                    {item.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{item.author}</div>
                    <div className="text-slate-500 text-xs">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to modernize your society?
          </h2>
          <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
            Join 500+ societies already using JanMitra. Free trial, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}