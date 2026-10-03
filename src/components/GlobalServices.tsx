import React from 'react';
import { Plane, Ship, Truck, Thermometer, ShieldCheck, FileCheck, Globe2, Boxes, ArrowRight, CheckCircle } from 'lucide-react';

// Real generated high-resolution assets
import airCargoImg from '../assets/images/cargo_plane_hero_1787730752988.webp';
import oceanCargoImg from '../assets/images/ocean_freight_hero_1787730773821.webp';
import overlandCargoImg from '../assets/images/express_logistics_hero_1787730786284.webp';
import warehouseImg from '../assets/images/smart_warehouse_hub_1787732277761.webp';
import pharmaColdChainImg from '../assets/images/pharma_cold_chain_1787732293031.webp';
import customsPortImg from '../assets/images/customs_port_terminal_1787732310825.webp';

export const GlobalServices: React.FC<{ onSelectService?: (page: string) => void }> = ({ onSelectService }) => {
  const services = [
    {
      page: 'air-freight',
      image: airCargoImg,
      icon: <Plane className="w-4 h-4 text-blue-600" />,
      tag: 'Air Express',
      title: 'Priority Air Freight',
      desc: 'Air freight options for time-sensitive cargo, with service selected around your shipment requirements.',
      stats: 'Service options by route',
      coverage: 'Route-dependent availability',
    },
    {
      page: 'ocean-freight',
      image: oceanCargoImg,
      icon: <Ship className="w-4 h-4 text-sky-600" />,
      tag: 'Maritime Corridors',
      title: 'Ocean Cargo (FCL & LCL)',
      desc: 'Full-container and less-than-container-load options for planned international cargo movements.',
      stats: 'Route-dependent service',
      coverage: 'Origin and destination dependent',
    },
    {
      page: 'road-freight',
      image: overlandCargoImg,
      icon: <Truck className="w-4 h-4 text-emerald-600" />,
      tag: 'Ground Escort',
      title: 'Overland Fleet & Transport',
      desc: 'Regional and cross-border road transport options, subject to route and service availability.',
      stats: 'Route-dependent service',
      coverage: 'Route availability varies',
    },
    {
      page: 'express',
      image: overlandCargoImg,
      icon: <Truck className="w-4 h-4 text-cyan-700" />,
      tag: 'Express delivery',
      title: 'Express Logistics',
      desc: 'Express parcel and business cargo options with route-specific service levels and transit estimates.',
      stats: 'Confirm transit estimate',
      coverage: 'Route-dependent availability',
    },
    {
      page: 'cold-chain',
      image: pharmaColdChainImg,
      icon: <Thermometer className="w-4 h-4 text-purple-600" />,
      tag: 'Cold Chain',
      title: 'Pharma & Cryogenic Logistics',
      desc: 'Temperature-sensitive cargo planning based on product requirements and confirmed handling capabilities.',
      stats: 'Confirm handling options',
      coverage: 'Confirm monitoring availability',
    },
    {
      page: 'customs',
      image: customsPortImg,
      icon: <FileCheck className="w-4 h-4 text-indigo-600" />,
      tag: 'Customs Desk',
      title: 'Customs Clearance & Brokerage',
      desc: 'Documentation coordination and clearance support based on destination requirements.',
      stats: 'Documentation support',
      coverage: 'Documentation support',
    },
    {
      page: 'warehousing',
      image: warehouseImg,
      icon: <Boxes className="w-4 h-4 text-amber-600" />,
      tag: 'Bonded Storage',
      title: 'Smart Warehousing & Fulfillment',
      desc: 'Storage, fulfillment and dispatch support based on facility availability and cargo needs.',
      stats: 'Confirm facility options',
      coverage: 'Confirm facility availability',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
          <Globe2 className="w-3.5 h-3.5" />
          <span>Freight and supply-chain services</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Freight solutions for your business
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Explore available services and request confirmation of route coverage, handling capabilities and shipment visibility for your needs.
        </p>
      </div>

      {/* Services Grid with Visual Photo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div
            key={svc.title}
            className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col group"
          >
            {/* Photo Header with subtle zoom */}
            <div className="relative h-48 w-full overflow-hidden bg-slate-950">
              <img
                src={svc.image}
                alt={svc.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              
              {/* Floating Tag */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold">
                {svc.icon}
                <span>{svc.tag}</span>
              </div>

              {/* Stat Pill */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-mono font-semibold text-slate-100 flex items-center gap-1">
                  {svc.stats}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">{svc.coverage}</span>
              </div>
            </div>

            {/* Concise Description */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {svc.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {svc.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700">
                <button onClick={() => onSelectService?.(svc.page)} className="inline-flex items-center gap-2 hover:text-cyan-800">Explore solution <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-600">
        Service coverage, transit estimates, handling capabilities and any certifications should be confirmed for the specific shipment before booking.
      </div>
    </div>
  );
};
