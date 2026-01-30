'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, ChevronRight } from 'lucide-react';
import Logo from '../../../assets/images/JanMitra-logo.jpg';

export default function Navbar() {
  const { isLoggedIn, userType, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial scroll position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = useCallback((e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    // If not on home page, navigate to home first
    if (pathname !== '/') {
      router.push(`/${sectionId}`);
      return;
    }
    
    const element = document.querySelector(sectionId);
    if (element) {
      const navHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - navHeight,
        behavior: 'smooth'
      });
    }
  }, [pathname, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const getDashboardLink = () => {
    switch (userType) {
      case 'platform_admin':
        return { href: '/admin', label: 'Admin Panel' };
      case 'org_admin':
        return { href: '/org/queue', label: 'Dashboard' };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#testimonials', label: 'Testimonials' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/98 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-100' 
        : 'bg-white/50 backdrop-blur-sm'
    }`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center transition-all duration-500 ${
          scrolled ? 'h-16' : 'h-20'
        }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`relative overflow-hidden rounded-xl transition-all duration-500 ${
              scrolled ? 'w-10 h-10' : 'w-12 h-12'
            }`}>
              <Image 
                src={Logo} 
                alt="JanMitra Logo" 
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className={`font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent transition-all duration-500 ${
              scrolled ? 'text-xl' : 'text-2xl'
            }`}>
              JanMitra
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="px-4 py-2 text-slate-600 hover:text-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-50/80 transition-all duration-200 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            {isLoggedIn && dashboardLink && (
              <Link 
                href={dashboardLink.href} 
                className="px-4 py-2 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-all duration-200"
              >
                {dashboardLink.label}
              </Link>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
              >
                Logout
              </button>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="group px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 flex items-center gap-2"
                >
                  Get Started
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`md:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-xl border-t border-slate-100 shadow-xl transition-all duration-300 ${
        mobileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
      }`}>
        <div className="px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="block px-4 py-3 text-slate-700 hover:text-emerald-600 font-medium rounded-xl hover:bg-emerald-50 transition-all cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          {isLoggedIn && dashboardLink && (
            <Link 
              href={dashboardLink.href} 
              className="block px-4 py-3 text-emerald-600 font-medium rounded-xl hover:bg-emerald-50 transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              {dashboardLink.label}
            </Link>
          )}
          
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="w-full py-3 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Logout
              </button>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="block w-full py-3 text-center text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="block w-full py-3 text-center text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
