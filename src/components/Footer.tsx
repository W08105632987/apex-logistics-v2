import React from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Globe2, 
  ArrowUpRight,
  Plane,
  Ship,
  Truck,
  Boxes,
  Activity
} from 'lucide-react';
import { COMPANY } from '../config/company';

interface FooterProps {
  onToggleAdmin?: () => void;
  isAdminMode?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onToggleAdmin, isAdminMode }) => {
  return (
    <footer className="w-full bg-[#050e18] border-t border-cyan-500/20 text-slate-400 text-xs">
      {/* Top Value Banner */}
      <div className="border-b border-white/10 bg-[#030910] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Continuous Global Telemetry Active</div>
              <div className="text-slate-400 text-xs">Direct GPS tracking across all air, ocean and fleet corridors.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-cyan-400" /> IATA Registered</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-teal-400" /> ISO 9001:2015</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-blue-400" /> AEO Customs Certified</span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Col 1: Brand & Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <span className="text-xl font-black text-white">A</span>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">
                  APEX <span className="text-cyan-400">LOGISTICS</span>
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-500/70">
                  Global Freight Solutions
                </span>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed max-w-sm text-xs">
              Pioneering multi-modal freight operations with precision dispatch, end-to-end milestone visibility, and dedicated customs compliance globally.
            </p>

            <div className="pt-2 space-y-2 text-slate-300 text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-cyan-400 shrink-0" />
                <span>{COMPANY.address || 'Global Cargo Hub Terminal 4, World Cargo Center'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-cyan-400 shrink-0" />
                <span>{COMPANY.phone || '+1 (800) 555-APEX'} (24/7 Operations Desk)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-cyan-400 shrink-0" />
                <span>{COMPANY.supportEmail || 'operations@apexlogistics.com'}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Freight Services */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">Freight Modes</h4>
            <ul className="space-y-2.5">
              <li><a href="#air-freight" className="hover:text-cyan-400 transition flex items-center gap-1.5"><Plane size={13} className="text-cyan-400" /> Air Freight Priority</a></li>
              <li><a href="#ocean-freight" className="hover:text-cyan-400 transition flex items-center gap-1.5"><Ship size={13} className="text-blue-400" /> Ocean Cargo (FCL/LCL)</a></li>
              <li><a href="#road-freight" className="hover:text-cyan-400 transition flex items-center gap-1.5"><Truck size={13} className="text-emerald-400" /> Cross-Border Road Fleet</a></li>
              <li><a href="#warehousing" className="hover:text-cyan-400 transition flex items-center gap-1.5"><Boxes size={13} className="text-amber-400" /> Smart 3PL Warehousing</a></li>
              <li><a href="#cold-chain" className="hover:text-cyan-400 transition">Pharma Cold Chain</a></li>
              <li><a href="#customs" className="hover:text-cyan-400 transition">Customs Brokerage</a></li>
            </ul>
          </div>

          {/* Col 3: Vertical Solutions */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">Industries</h4>
            <ul className="space-y-2.5">
              <li><a href="#industry-healthcare" className="hover:text-cyan-400 transition">Healthcare & Pharma</a></li>
              <li><a href="#industry-ecommerce" className="hover:text-cyan-400 transition">Cross-Border E-Commerce</a></li>
              <li><a href="#industry-technology" className="hover:text-cyan-400 transition">High-Tech Electronics</a></li>
              <li><a href="#industry-automotive" className="hover:text-cyan-400 transition">Automotive Supply Chain</a></li>
              <li><a href="#industry-manufacturing" className="hover:text-cyan-400 transition">Heavy Industrial</a></li>
              <li><a href="#network" className="hover:text-cyan-400 transition">Global Ports Network</a></li>
            </ul>
          </div>

          {/* Col 4: Portals & Security */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">Portals & Access</h4>
            <ul className="space-y-2.5">
              <li><a href="#track" className="hover:text-cyan-400 transition text-cyan-300 font-semibold">Track Shipment</a></li>
              <li><a href="#calculator" className="hover:text-cyan-400 transition">Get Rate Estimate</a></li>
              <li><a href="#customer" className="hover:text-cyan-400 transition">Customer Portal</a></li>
              <li><a href="#driver" className="hover:text-cyan-400 transition">Driver Delivery Hub</a></li>
              <li>
                <button 
                  onClick={onToggleAdmin} 
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 transition pt-1"
                >
                  <Lock size={12} />
                  <span>{isAdminMode ? 'Exit Staff Portal' : 'Staff Administration'}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Legal */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Apex Logistics Worldwide. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Enterprise Logistics Architecture v2.0</span>
            <a href="#contact" className="hover:text-slate-300 transition">Terms of Carriage</a>
            <a href="#contact" className="hover:text-slate-300 transition">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
