'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';
import Logo from '../../../assets/images/JanMitra-logo.jpg';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Smooth scroll function
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.querySelector(sectionId);
    if (element) {
      const navHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - navHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative w-12 h-12 overflow-hidden rounded-xl shadow-lg">
                <Image 
                  src={Logo} 
                  alt="JanMitra Logo" 
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-2xl font-bold text-white">JanMitra</span>
            </Link>
            <p className="text-slate-400 leading-relaxed mb-6 max-w-sm">
              Empowering housing societies with smart management tools. Streamline complaints, share announcements, and build stronger communities.
            </p>
            <div className="space-y-3">
              <a href="mailto:support@janmitra.com" className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group">
                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                support@janmitra.com
              </a>
              <a href="tel:+911234567890" className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group">
                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                +91 123 456 7890
              </a>
              <div className="flex items-center gap-3 text-slate-400">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Nagpur, Maharashtra, India</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">Product</h3>
            <ul className="space-y-4">
              <li>
                <a 
                  href="#features" 
                  onClick={(e) => scrollToSection(e, '#features')}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
                >
                  Features
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => scrollToSection(e, '#how-it-works')}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
                >
                  How It Works
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a 
                  href="#testimonials" 
                  onClick={(e) => scrollToSection(e, '#testimonials')}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
                >
                  Testimonials
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <Link href="/auth/register" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Get Started
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">Company</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  About Us
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Contact
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Careers
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Blog
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">Legal</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Privacy Policy
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Terms of Service
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  Cookie Policy
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {currentYear} JanMitra. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">
              Made with ❤️ in India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
