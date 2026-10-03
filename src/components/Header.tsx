import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ChevronDown, 
  Globe2, 
  LockKeyhole, 
  LogOut, 
  Mail, 
  Menu, 
  PackageSearch, 
  UserRound, 
  X, 
  Truck,
  Sparkles,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { AuthSession } from '../types';

type Tab = 'home' | 'track' | 'admin' | 'calculator' | 'services' | 'air-freight' | 'ocean-freight' | 'road-freight' | 'express' | 'warehousing' | 'cold-chain' | 'customs' | 'industries' | 'network' | 'about' | 'contact' | 'customer' | 'driver';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  emailCount: number;
  onOpenMailbox: () => void;
  onToggleAdmin: () => void;
  isAdminMode: boolean;
  session?: AuthSession;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  emailCount, 
  onOpenMailbox, 
  onToggleAdmin, 
  isAdminMode, 
  session, 
  onLogout 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = Boolean(session?.isAuthenticated && session?.user);
  
  const navigate = (tab: Tab) => { 
    setActiveTab(tab); 
    setMobileMenuOpen(false); 
  };

  const navLinks: { label: string; tab: Tab; badge?: string }[] = [
    { label: 'Home', tab: 'home' },
    { label: 'Services', tab: 'services' },
    { label: 'Industries', tab: 'industries' },
    { label: 'Network', tab: 'network' },
    { label: 'About', tab: 'about' },
    { label: 'Contact', tab: 'contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#071322]/95 border-b border-cyan-500/20 text-slate-100 transition-all duration-300">
      {/* Top Banner Ticker */}
      <div className="hidden sm:block border-b border-white/10 bg-[#040b14] text-[11px] text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Global Freight Network Active
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-400">Real-time GPS Tracking & Operations 24/7</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && session?.user ? (
              <div className="flex items-center gap-3">
                <span className="text-cyan-300 font-semibold">{session.user.name} ({session.user.role})</span>
                <button 
                  onClick={onOpenMailbox} 
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition"
                >
                  <Mail size={12} /> ({emailCount})
                </button>
                {onLogout && (
                  <button 
                    onClick={onLogout} 
                    className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 transition"
                  >
                    <LogOut size={12} /> Sign out
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4 text-xs font-medium">
                <button onClick={() => navigate('contact')} className="hover:text-cyan-400 transition flex items-center gap-1">
                  <PhoneCall size={12} /> 24/7 Support Desk
                </button>
                <button onClick={() => navigate('driver')} className="hover:text-cyan-400 transition flex items-center gap-1 text-slate-400">
                  <Truck size={12} /> Driver Access
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <button 
          onClick={() => navigate(isAdminMode ? 'admin' : 'home')} 
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
            <span className="text-2xl font-black tracking-tighter text-white">A</span>
            <div className="absolute inset-0 rounded-xl border border-white/30 pointer-events-none" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span>APEX</span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">LOGISTICS</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 -mt-0.5">
              Air • Ocean • Road • Customs
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = activeTab === link.tab;
            return (
              <button
                key={link.tab}
                onClick={() => navigate(link.tab)}
                className={`relative px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'text-cyan-300 bg-cyan-950/60 shadow-inner border border-cyan-500/30' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={() => navigate('track')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
              activeTab === 'track'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 hover:border-cyan-400/40'
            }`}
          >
            <PackageSearch size={15} className="text-cyan-400" />
            <span>Track</span>
          </button>

          <button
            onClick={() => navigate('calculator')}
            className="shimmer-button inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#061524] shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <span>Get Quote</span>
            <ArrowUpRight size={15} />
          </button>

          <button
            onClick={() => navigate('customer')}
            className={`p-2.5 rounded-xl border transition-all duration-200 ${
              activeTab === 'customer'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Customer Portal"
            aria-label="Customer Portal"
          >
            <UserRound size={17} />
          </button>

          <button
            onClick={onToggleAdmin}
            className={`p-2.5 rounded-xl border transition-all duration-200 ${
              isAdminMode
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Staff / Admin Portal"
            aria-label="Staff / Admin Portal"
          >
            <LockKeyhole size={17} />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => navigate('track')}
            className="sm:hidden inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-3 py-1.5 text-xs font-bold text-cyan-300"
          >
            <PackageSearch size={14} /> Track
          </button>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 transition focus:outline-none"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="animate-slide-down border-t border-cyan-500/20 bg-[#061220] px-4 py-5 shadow-2xl lg:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.tab}
                onClick={() => navigate(link.tab)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold tracking-wide transition ${
                  activeTab === link.tab
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                <span>{link.label}</span>
                <span className="text-slate-500 text-xs">→</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('track')}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 px-3 py-3 text-xs font-bold text-cyan-300"
            >
              <PackageSearch size={15} /> Track Parcel
            </button>
            <button
              onClick={() => navigate('calculator')}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-3 text-xs font-extrabold text-[#061524]"
            >
              <Sparkles size={15} /> Get Quote
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <button
              onClick={() => navigate('customer')}
              className="rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-slate-300 hover:text-white"
            >
              <UserRound size={15} className="mx-auto mb-1 text-cyan-400" /> Customer
            </button>
            <button
              onClick={() => navigate('driver')}
              className="rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-slate-300 hover:text-white"
            >
              <Truck size={15} className="mx-auto mb-1 text-emerald-400" /> Driver
            </button>
            <button
              onClick={() => { onToggleAdmin(); setMobileMenuOpen(false); }}
              className="rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-slate-300 hover:text-white"
            >
              <LockKeyhole size={15} className="mx-auto mb-1 text-amber-400" /> Staff
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
