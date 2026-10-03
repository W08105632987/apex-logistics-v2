import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  ArrowUpRight, 
  Boxes, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Globe2, 
  PackageSearch, 
  Pause, 
  Play, 
  Plane, 
  ShieldCheck, 
  Ship, 
  Truck,
  Sparkles,
  Timer,
  BadgeCheck,
  TrendingUp,
  MapPin,
  Clock,
  Activity,
  Calculator,
  Compass
} from 'lucide-react';

import airCargoImg from '../assets/images/cargo_plane_hero_1787730752988.webp';
import oceanCargoImg from '../assets/images/ocean_freight_hero_1787730773821.webp';
import roadImg from '../assets/images/express_logistics_hero_1787730786284.webp';
import warehouseImg from '../assets/images/smart_warehouse_hub_1787732277761.webp';
import coldChainImg from '../assets/images/pharma_cold_chain_1787732293031.webp';
import customsImg from '../assets/images/customs_port_terminal_1787732310825.webp';
import secHealth from '../assets/images/industry-healthcare.webp';
import secEcom from '../assets/images/industry-ecommerce.webp';
import secMfg from '../assets/images/industry-manufacturing.webp';
import secRetail from '../assets/images/industry-retail.webp';
import secAuto from '../assets/images/industry-automotive.webp';
import secTech from '../assets/images/industry-technology.webp';

interface HomePageProps {
  onTrack: (trackingNumber: string) => void;
  onQuote: () => void;
  onServices: () => void;
}

const HERO_STATES = [
  { 
    eyebrow: 'Next-Gen Global Freight Forwarding', 
    headline: 'Orchestrating Global Trade.', 
    highlight: 'With Zero Blindspots.', 
    supporting: 'Real-time telemetry, predictive milestone ETAs, and multi-modal freight operations unified across 140+ countries.', 
    image: airCargoImg, 
    mode: 'AIR PRIORITY',
    stats: 'Avg Transit: 24-48h',
    badgeColor: 'border-cyan-400/40 bg-cyan-950/70 text-cyan-300'
  },
  { 
    eyebrow: 'Ocean & Maritime Container Logistics', 
    headline: 'FCL & LCL Ocean Freight.', 
    highlight: 'Engineered for Scale.', 
    supporting: 'High-capacity vessel space contracts, smart port customs clearance, and end-to-end container tracking.', 
    image: oceanCargoImg, 
    mode: 'MARITIME FCL/LCL',
    stats: '45,000+ TEU / Month',
    badgeColor: 'border-blue-400/40 bg-blue-950/70 text-blue-300'
  },
  { 
    eyebrow: 'Autonomous Dispatch & Cross-Border Road Fleet', 
    headline: 'High-Velocity Road Network.', 
    highlight: 'Last-Mile Precision.', 
    supporting: 'Dynamic route optimization, electronic proof-of-delivery, and dedicated fleet dispatching 24/7/365.', 
    image: roadImg, 
    mode: 'ROAD & EXPRESS',
    stats: '99.8% On-Time SLA',
    badgeColor: 'border-emerald-400/40 bg-emerald-950/70 text-emerald-300'
  },
];

const SAMPLE_TRACKING_NUMBERS = [
  { id: 'APX-782941', label: 'Air Express (London → Frankfurt)' },
  { id: 'APX-901423', label: 'Cold Chain (New York → Tokyo)' },
  { id: 'APX-310542', label: 'Ocean Freight (Singapore → Rotterdam)' }
];

export const HomePage: React.FC<HomePageProps> = ({ onTrack, onQuote, onServices }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const isPaused = isHovered || isManuallyPaused;
  const hero = HERO_STATES[currentSlide];

  // Quick estimator state
  const [calcMode, setCalcMode] = useState<'air' | 'ocean' | 'express'>('air');
  const [calcWeight, setCalcWeight] = useState<number>(250);
  const [calcOrigin, setCalcOrigin] = useState('New York (JFK)');
  const [calcDest, setCalcDest] = useState('Frankfurt (FRA)');

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setCurrentSlide((index) => (index + 1) % HERO_STATES.length);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const submitTracking = (event: React.FormEvent) => {
    event.preventDefault();
    if (trackingNumber.trim()) {
      onTrack(trackingNumber.trim().toUpperCase());
    }
  };

  const handleQuickDemoTrack = (sampleNum: string) => {
    setTrackingNumber(sampleNum);
    onTrack(sampleNum);
  };

  // Estimate calculation
  const getEstimatedCost = () => {
    let rate = calcMode === 'air' ? 4.8 : calcMode === 'ocean' ? 1.6 : 6.2;
    return Math.round(calcWeight * rate + 120);
  };

  const getEstimatedDays = () => {
    return calcMode === 'air' ? '2 - 3 Days' : calcMode === 'ocean' ? '14 - 18 Days' : '1 - 2 Days';
  };

  const services = [
    { 
      title: 'Air Freight Forwarding', 
      description: 'Scheduled consolidation, charter operations, and time-critical next-flight-out dispatch.', 
      image: airCargoImg, 
      icon: <Plane size={20} className="text-cyan-400" />, 
      tag: 'PRIORITY AIR',
      transit: '1 - 3 Days'
    },
    { 
      title: 'Global Ocean Logistics', 
      description: 'Full Container Load (FCL) and Less than Container Load (LCL) with premier ocean carriers.', 
      image: oceanCargoImg, 
      icon: <Ship size={20} className="text-blue-400" />, 
      tag: 'FCL & LCL',
      transit: '12 - 24 Days'
    },
    { 
      title: 'Express Road Freight', 
      description: 'Cross-border dedicated trucking, LTL consolidation, and guaranteed last-mile delivery.', 
      image: roadImg, 
      icon: <Truck size={20} className="text-emerald-400" />, 
      tag: 'FAST ROAD',
      transit: 'Same-Day / Next-Day'
    },
    { 
      title: 'Smart Warehousing & 3PL', 
      description: 'Automated inventory indexing, Pick & Pack fulfillment, and cross-docking hubs.', 
      image: warehouseImg, 
      icon: <Boxes size={20} className="text-amber-400" />, 
      tag: 'STORAGE & 3PL',
      transit: '24/7 Access'
    },
    { 
      title: 'Pharma Cold Chain', 
      description: 'Calibrated temperature-controlled transport (-20°C to +25°C) with continuous telemetry logging.', 
      image: coldChainImg, 
      icon: <ShieldCheck size={20} className="text-teal-400" />, 
      tag: 'TEMPERATURE SENSITIVE',
      transit: 'Monitored 24/7'
    },
    { 
      title: 'Customs & Compliance Brokerage', 
      description: 'Automated HS code classification, bonded transit documentation, and duty pre-calculation.', 
      image: customsImg, 
      icon: <Globe2 size={20} className="text-indigo-400" />, 
      tag: 'REGULATORY CLEARANCE',
      transit: 'Pre-Cleared'
    },
  ];

  return (
    <div className="w-full text-slate-100 overflow-hidden">
      {/* =========================================================================
          HERO SECTION WITH DYNAMIC CAROUSEL AND GLASS TRACKING MODULE
         ========================================================================= */}
      <section 
        className="relative isolate min-h-[640px] lg:min-h-[740px] overflow-hidden bg-[#071322] flex items-center"
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background Image Carousel with Overlay */}
        <div className="absolute inset-0 -z-20">
          <img 
            key={hero.image} 
            src={hero.image} 
            alt={hero.eyebrow} 
            className="h-full w-full object-cover object-center animate-fade-in opacity-40 scale-105 transition-all duration-1000"
          />
        </div>
        
        {/* Ambient Dark Mesh Gradients */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#050e18] via-[#071424]/90 to-[#071424]/40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1523] via-transparent to-[#050e18]/80" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Telemetry pill */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/30 bg-cyan-950/70 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-lg shadow-cyan-950/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span>{hero.eyebrow}</span>
                <span className="text-cyan-500">•</span>
                <span className="text-slate-300">{hero.stats}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                {hero.headline}{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent glow-text-cyan">
                  {hero.highlight}
                </span>
              </h1>

              {/* Supporting Description */}
              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-300 font-normal">
                {hero.supporting}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  onClick={onQuote} 
                  className="shimmer-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 px-7 py-3 text-sm font-extrabold uppercase tracking-wider text-[#061524] shadow-xl shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <span>Request Live Quote</span>
                  <ArrowRight size={17} />
                </button>

                <button 
                  onClick={onServices} 
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 hover:border-cyan-400/40 backdrop-blur-sm transition-all duration-200"
                >
                  <span>Explore Solutions</span>
                  <ArrowUpRight size={17} />
                </button>
              </div>

              {/* Slide controls */}
              <div className="flex items-center gap-3 pt-4">
                <div className="flex items-center gap-1.5">
                  {HERO_STATES.map((state, idx) => (
                    <button
                      key={state.mode}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'w-8 bg-cyan-400 shadow-md shadow-cyan-400/50' : 'w-2 bg-white/25 hover:bg-white/50'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs pl-2">
                  <button 
                    onClick={() => setCurrentSlide(prev => (prev - 1 + HERO_STATES.length) % HERO_STATES.length)}
                    className="p-1 rounded-full hover:bg-white/10 text-white transition"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setIsManuallyPaused(p => !p)}
                    className="p-1 rounded-full hover:bg-white/10 text-white transition"
                    aria-label={isManuallyPaused ? "Resume slideshow" : "Pause slideshow"}
                  >
                    {isManuallyPaused ? <Play size={12} /> : <Pause size={12} />}
                  </button>
                  <button 
                    onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_STATES.length)}
                    className="p-1 rounded-full hover:bg-white/10 text-white transition"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Premium Interactive Tracking Module */}
            <div className="lg:col-span-5 w-full">
              <div className="glass-card rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-cyan-500/25">
                {/* Ambient top glow bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500" />
                
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-extrabold uppercase tracking-wider">
                      <Activity size={15} />
                      <span>Live Waybill Telemetry</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Track Cargo Shipment</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Query real-time customs, air waybill, and driver checkpoints.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    <PackageSearch size={24} />
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={submitTracking} className="space-y-4">
                  <div>
                    <label htmlFor="hero-tracking-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Tracking or Reference ID
                    </label>
                    <div className="relative">
                      <input 
                        id="hero-tracking-input"
                        type="text" 
                        value={trackingNumber} 
                        onChange={(e) => setTrackingNumber(e.target.value)} 
                        placeholder="e.g. APX-782941" 
                        className="glass-input w-full min-h-[50px] rounded-xl px-4 text-sm font-mono tracking-wider placeholder:text-slate-500 placeholder:font-sans"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="shimmer-button w-full min-h-[50px] rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-[#061524] text-sm font-black uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Inspect Live Status</span>
                    <ArrowRight size={17} />
                  </button>
                </form>

                {/* One-Click Demo Tracking Shortcuts */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-cyan-400" />
                    <span>Instant Demo Tracking (1-Click Test):</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {SAMPLE_TRACKING_NUMBERS.map(sample => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleQuickDemoTrack(sample.id)}
                        className="flex items-center justify-between text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-xs transition duration-150 group"
                      >
                        <span className="font-mono font-bold text-cyan-300 group-hover:text-cyan-200">{sample.id}</span>
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-200 flex items-center gap-1">
                          {sample.label}
                          <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          GLOBAL OPERATIONS METRICS BANNER
         ========================================================================= */}
      <section className="border-y border-cyan-500/20 bg-[#06111e] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-white/10">
            <div className="px-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 tracking-tight">140+</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Countries Connected</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Air, sea & bonded transit</p>
            </div>
            <div className="px-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-300 tracking-tight">99.8%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">On-Time Handover</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Audited delivery SLAs</p>
            </div>
            <div className="px-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 tracking-tight">45k+</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Monthly TEU & Cargo</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Continuous volume flow</p>
            </div>
            <div className="px-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">24/7/365</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Active Operations</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Global support desk</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE INSTANT RATE ESTIMATOR
         ========================================================================= */}
      <section className="py-14 sm:py-18 bg-[#091524] border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-3xl p-6 sm:p-10 border border-cyan-500/30">
            <div className="max-w-2xl mb-8">
              <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-extrabold uppercase tracking-wider mb-2">
                <Calculator size={15} />
                <span>Instant Freight Estimator</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Calculate Instant Shipping Estimates</h2>
              <p className="text-sm text-slate-300 mt-2">
                Select your transport mode, route, and cargo weight to calculate transit time and commercial freight estimates.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Form Controls */}
              <div className="lg:col-span-8 space-y-6">
                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Select Transport Mode</label>
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setCalcMode('air')}
                      className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border transition-all ${
                        calcMode === 'air'
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-lg shadow-cyan-950/50'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Plane size={22} className="mb-1" />
                      <span className="text-xs font-bold">Air Priority</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCalcMode('ocean')}
                      className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border transition-all ${
                        calcMode === 'ocean'
                          ? 'border-blue-400 bg-blue-950/60 text-blue-300 shadow-lg shadow-blue-950/50'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Ship size={22} className="mb-1" />
                      <span className="text-xs font-bold">Ocean Cargo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCalcMode('express')}
                      className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border transition-all ${
                        calcMode === 'express'
                          ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-lg shadow-emerald-950/50'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Truck size={22} className="mb-1" />
                      <span className="text-xs font-bold">Road Express</span>
                    </button>
                  </div>
                </div>

                {/* Origin and Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Origin Hub</label>
                    <select
                      value={calcOrigin}
                      onChange={(e) => setCalcOrigin(e.target.value)}
                      className="glass-input w-full min-h-[46px] rounded-xl px-4 text-xs font-semibold bg-[#0c1827]"
                    >
                      <option value="New York (JFK)">New York (JFK), United States</option>
                      <option value="London (LHR)">London Heathrow (LHR), UK</option>
                      <option value="Shanghai (PVG)">Shanghai Port (PVG), China</option>
                      <option value="Dubai (DXB)">Dubai Logistics City (DXB), UAE</option>
                      <option value="Singapore (SIN)">Singapore Hub (SIN), Singapore</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Destination Hub</label>
                    <select
                      value={calcDest}
                      onChange={(e) => setCalcDest(e.target.value)}
                      className="glass-input w-full min-h-[46px] rounded-xl px-4 text-xs font-semibold bg-[#0c1827]"
                    >
                      <option value="Frankfurt (FRA)">Frankfurt Cargo Hub (FRA), Germany</option>
                      <option value="Tokyo (NRT)">Tokyo Narita (NRT), Japan</option>
                      <option value="Rotterdam (RTM)">Rotterdam Europort (RTM), Netherlands</option>
                      <option value="Sydney (SYD)">Sydney Kingsford (SYD), Australia</option>
                      <option value="Toronto (YYZ)">Toronto Pearson (YYZ), Canada</option>
                    </select>
                  </div>
                </div>

                {/* Weight Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-2">
                    <span>Cargo Weight:</span>
                    <span className="font-mono text-cyan-400 text-sm">{calcWeight} kg ({Math.round(calcWeight * 2.204)} lbs)</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="5000"
                    step="10"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>10 kg (Courier)</span>
                    <span>1,000 kg (Pallet)</span>
                    <span>5,000 kg (Container)</span>
                  </div>
                </div>
              </div>

              {/* Right Output Box */}
              <div className="lg:col-span-4 bg-[#06111e] rounded-2xl p-6 border border-cyan-400/30 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-cyan-500/10 rounded-full p-8 pointer-events-none">
                  <Sparkles size={40} className="text-cyan-400/20" />
                </div>
                
                <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">Indicative Estimate</div>
                <div className="text-4xl font-black text-white mt-2 font-mono">
                  ${getEstimatedCost()} <span className="text-sm font-sans font-normal text-slate-400">USD</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Transit:</span>
                    <span className="text-white font-bold">{getEstimatedDays()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Carbon Offset:</span>
                    <span className="text-emerald-400 font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Customs Pre-Check:</span>
                    <span className="text-cyan-400 font-semibold">Available</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onQuote}
                  className="mt-6 w-full shimmer-button min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-[#061524] text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/50 transition-all flex items-center justify-center gap-2"
                >
                  <span>Book This Shipment</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SERVICES SHOWCASE WITH INTERACTIVE HOVER CARDS
         ========================================================================= */}
      <section className="py-16 sm:py-24 bg-[#071322]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-12">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Comprehensive Solutions</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
                Specialized Freight Capabilities
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-xl">
                Every cargo requirement has distinct compliance, handling and velocity specifications.
              </p>
            </div>
            <button 
              onClick={onServices}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition"
            >
              <span>Explore All Solutions</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div 
                key={service.title}
                onClick={onServices}
                className="glass-card glass-card-hover rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-900">
                    <img 
                      src={service.image} 
                      alt={service.title} 
                      loading="lazy" 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1523] via-transparent to-transparent opacity-80" />
                    <div className="absolute top-3 left-3 rounded-lg border border-white/20 bg-[#071424]/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300 backdrop-blur-md">
                      {service.tag}
                    </div>
                    <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-mono text-slate-300 backdrop-blur-md">
                      {service.transit}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
                        {service.icon}
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">APEX SERVICE</span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-2">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 sm:px-6 pb-5 pt-2 flex items-center justify-between border-t border-white/5 text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                  <span>View Details</span>
                  <ArrowRight size={15} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          INDUSTRY SOLUTIONS GRID
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#08121f] border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Industry Vertical Mastery</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Engineered For Your Sector</h2>
            <p className="text-sm text-slate-400 mt-2">
              Tailored handling protocols, validated thermal packaging, and regulatory clearance.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ['Healthcare & Pharma', secHealth],
              ['Global E-Commerce', secEcom],
              ['High-Tech Electronics', secTech],
              ['Advanced Automotive', secAuto],
              ['Heavy Industrial', secMfg],
              ['Omnichannel Retail', secRetail]
            ].map(([label, art]) => (
              <div 
                key={label}
                onClick={onServices}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b1828] hover:border-cyan-400/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={art} 
                    alt={label} 
                    loading="lazy" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06111e] via-[#06111e]/60 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          HIGH-IMPACT CALL TO ACTION
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-[#071322] to-[#040c16]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-cyan-950 via-[#0a1e35] to-blue-950 p-8 sm:p-12 lg:p-16 border border-cyan-400/30 shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 mb-4">
                <Globe2 size={13} />
                <span>Ready For Seamless Logistics?</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                Unlock Total Visibility Over Your Global Cargo.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300">
                Contact our commercial dispatch desk or generate an instant multi-modal rate estimate in under 60 seconds.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <button 
                  onClick={onQuote} 
                  className="shimmer-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-cyan-400 px-8 text-sm font-black uppercase tracking-wider text-[#061524] shadow-xl hover:bg-cyan-300 transition-all"
                >
                  <span>Start Live Quote</span>
                  <ArrowRight size={17} />
                </button>
                <button 
                  onClick={onServices} 
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-bold text-white hover:bg-white/10 transition-all"
                >
                  <span>Consult Logistics Architect</span>
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
