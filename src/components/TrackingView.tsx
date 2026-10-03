import React, { useState, useEffect } from 'react';
import { Shipment, ShipmentStatus } from '../types';
import errorArt from '../assets/library/ui-states/error-state.svg';
import { getStatusColor, formatStatusLabel } from '../utils/emailService';
import { RouteMapVisualizer } from './RouteMapVisualizer';
import { hasRealRoute } from './geoRoute';
const GeoMap = React.lazy(() => import('./GeoMap').then(m => ({ default: m.GeoMap })));
import {
  Search,
  Package,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  FileText,
  Bell,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  X,
} from 'lucide-react';

// Real generated high-resolution assets

interface ApiTrackingResult {
  shipment: { trackingNumber: string; status: string; origin: string; destination: string; serviceType: string; estimatedDelivery: string | null; lastUpdatedAt: string };
  events: Array<{ id: string; eventType: string; description: string; occurredAt: string; location?: string }>;
}
type ApiLookupState = 'idle' | 'loading' | 'found' | 'not-found' | 'unavailable';

interface TrackingViewProps {
  shipments: Shipment[];
  initialTrackingNumber?: string;
  onViewWaybill: (shipment: Shipment) => void;
  onSubscribeEmail: (trackingNumber: string, email: string) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  shipments,
  initialTrackingNumber,
  onViewWaybill,
  onSubscribeEmail,
}) => {
  // Only set activeTrackingNumber if initialTrackingNumber is explicitly provided
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string>(initialTrackingNumber ? initialTrackingNumber.trim() : '');
  const [searchInput, setSearchInput] = useState(initialTrackingNumber ? initialTrackingNumber.trim() : '');
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribedToast, setSubscribedToast] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [apiResult, setApiResult] = useState<ApiTrackingResult | null>(null);
  const [apiLookupState, setApiLookupState] = useState<ApiLookupState>('idle');

  useEffect(() => {
    if (initialTrackingNumber) {
      setActiveTrackingNumber(initialTrackingNumber.trim());
      setSearchInput(initialTrackingNumber.trim());
    }
  }, [initialTrackingNumber]);

  // Prefer server-backed tracking records. Local records remain explicitly labelled prototype samples.
  const hasSearched = Boolean(activeTrackingNumber.trim());
  useEffect(() => {
    let cancelled = false;
    if (!activeTrackingNumber.trim()) {
      setApiResult(null); setApiLookupState('idle');
      return () => { cancelled = true; };
    }
    setApiResult(null); setApiLookupState('loading');
    fetch(`/api/tracking/${encodeURIComponent(activeTrackingNumber.trim())}`, { credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 404) { if (!cancelled) setApiLookupState('not-found'); return; }
        if (!response.ok) throw new Error('Tracking service unavailable');
        const payload = await response.json() as ApiTrackingResult;
        if (!cancelled) { setApiResult(payload); setApiLookupState('found'); }
      })
      .catch(() => { if (!cancelled) setApiLookupState('unavailable'); });
    return () => { cancelled = true; };
  }, [activeTrackingNumber]);
  const activeShipment = hasSearched && apiLookupState !== 'found' && apiLookupState !== 'loading'
    ? shipments.find((s) => s.trackingNumber.toUpperCase().trim() === activeTrackingNumber.toUpperCase().trim())
    : null;

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      setActiveTrackingNumber(query.trim().toUpperCase());
      setTimeout(() => {
        const element = document.getElementById('tracking-result-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };



  const handleCloseTracking = () => {
    setActiveTrackingNumber('');
    setSearchInput('');
    window.location.hash = '#track';
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail || !activeShipment) return;
    onSubscribeEmail(activeShipment.trackingNumber, subscribeEmail);
    setSubscribedToast(true);
    setSubscribeEmail('');
    setTimeout(() => setSubscribedToast(false), 4000);
  };

  const handleCopyTrackingNumber = () => {
    if (activeShipment) {
      navigator.clipboard?.writeText(activeShipment.trackingNumber);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Status Milestones Array
  const MILESTONES: { key: ShipmentStatus; label: string; icon: string }[] = [
    { key: 'manifest_created', label: 'Booked', icon: '📝' },
    { key: 'picked_up', label: 'Collected', icon: '📦' },
    { key: 'received_at_facility', label: 'Hub Sorting', icon: '🏢' },
    { key: 'in_transit', label: 'In Transit', icon: '🛫' },
    { key: 'customs_clearance', label: 'Customs', icon: '🛂' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🚚' },
    { key: 'delivered', label: 'Delivered', icon: '✅' },
  ];

  const getMilestoneIndex = (status: ShipmentStatus): number => {
    switch (status) {
      case 'manifest_created':
        return 0;
      case 'picked_up':
        return 1;
      case 'received_at_facility':
        return 2;
      case 'in_transit':
        return 3;
      case 'customs_clearance':
        return 4;
      case 'out_for_delivery':
        return 5;
      case 'delivered':
        return 6;
      default:
        return 3;
    }
  };

  const currentMilestoneIdx = activeShipment ? getMilestoneIndex(activeShipment.status) : 0;
  const color = activeShipment ? getStatusColor(activeShipment.status) : getStatusColor('in_transit');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#071626] px-5 py-7 text-white sm:px-8 sm:py-9">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Shipment visibility</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Track your shipment.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Enter a tracking number to review the latest available status, recorded milestones and delivery details. Private shipment information is not shown in public tracking.</p>
        </div>
        <form onSubmit={event => { event.preventDefault(); handleSearchSubmit(searchInput); }} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-6">
          <label className="sr-only" htmlFor="tracking-number-input">Tracking or reference number</label>
          <input id="tracking-number-input" value={searchInput} onChange={event => setSearchInput(event.target.value)} required maxLength={80} placeholder="Enter tracking or reference number" className="min-h-12 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" />
          <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071626] transition hover:bg-cyan-200"><Search size={16}/> Track shipment <ArrowRight size={16}/></button>
        </form>
      </section>

      {/* 2. SERVER-BACKED TRACKING RESULTS */}
      {hasSearched && (
        <div id="tracking-result-section" className="space-y-6 scroll-mt-20">
          {activeShipment ? (
            <div className="space-y-6">
              <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Prototype sample record: this bundled example is not verified live shipment data. Server-backed records take precedence when available.</div>
              {/* Quick Bar with Active Search & Close/Clear Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 text-white shadow-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Prototype shipment record
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Query: <span className="text-emerald-400 font-bold">{activeShipment.trackingNumber}</span> &bull; {activeShipment.originHub.city} &rarr; {activeShipment.receiver.city}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseTracking}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                    title="Clear search and return to home view"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Tracking Results</span>
                  </button>
                </div>
              </div>

              {/* Main Status & Action Card */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                {/* Top Bar with Tracking ID, Status Badge & Quick Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-2xl md:text-3xl font-mono font-bold text-slate-900 tracking-tight">
                        {activeShipment.trackingNumber}
                      </span>
                      <button
                        onClick={handleCopyTrackingNumber}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Copy Tracking Number"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${color.badgeBg} ${color.text} border ${color.badgeBorder}`}
                      >
                        {formatStatusLabel(activeShipment.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Service: <strong className="text-slate-800">{activeShipment.serviceType.replace('_', ' ').toUpperCase()}</strong> &bull; Waybill Ref: {activeShipment.referenceNumber || 'N/A'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => onViewWaybill(activeShipment)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Air Waybill (AWB)</span>
                    </button>
                  </div>
                </div>

                {/* Status Box */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                        Recorded status summary
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5">
                        {activeShipment.statusMessage}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Route: <strong className="text-slate-800">{activeShipment.originHub.city}, {activeShipment.originHub.country}</strong> &rarr; <strong className="text-slate-800">{activeShipment.receiver.city}, {activeShipment.receiver.country}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stepper Progress Bar */}
                <div className="py-2">
                  <div className="relative">
                    <div className="absolute top-5 left-6 right-6 h-1 bg-slate-100 -z-0">
                      <div
                        className="h-full bg-blue-600 transition-all duration-700"
                        style={{
                          width: `${(currentMilestoneIdx / (MILESTONES.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between relative z-10">
                      {MILESTONES.map((milestone, idx) => {
                        const isPassed = idx <= currentMilestoneIdx;
                        const isCurrent = idx === currentMilestoneIdx;

                        return (
                          <div key={milestone.key} className="flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm ${
                                isCurrent
                                  ? 'bg-blue-700 text-white ring-4 ring-blue-100 scale-110'
                                  : isPassed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              {milestone.icon}
                            </div>
                            <span
                              className={`text-[11px] font-semibold mt-2 hidden sm:block text-center max-w-[80px] ${
                                isCurrent
                                  ? 'text-blue-700 font-bold'
                                  : isPassed
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {milestone.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Shipment summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-blue-700" />
                      Estimated Delivery (sample)
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {new Date(activeShipment.estimatedDelivery).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-blue-700 font-semibold mt-0.5">
                      {activeShipment.status === 'delivered' ? 'Sample record marked delivered' : 'Date not verified with carrier'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-sky-700" />
                      Recorded location (sample)
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-1 truncate">
                      {activeShipment.currentLocation.city}, {activeShipment.currentLocation.country}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {activeShipment.currentLocation.description}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Truck className="w-4 h-4 text-emerald-700" />
                      Carrier / Transit Unit
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-1 truncate">
                      {activeShipment.assignedCourier?.name || activeShipment.transportVessel?.identifier || 'Transport details pending'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {activeShipment.assignedCourier?.vehiclePlate ? `Vehicle Plate: ${activeShipment.assignedCourier.vehiclePlate}` : 'Monitored Cargo Flight'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Global Route Map */}
              {hasRealRoute(activeShipment) ? <React.Suspense fallback={<div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">Loading map…</div>}><GeoMap shipment={activeShipment} /></React.Suspense> : <RouteMapVisualizer shipment={activeShipment} />}

              {/* 2 Column Layout: Checkpoint History & Consignment Specs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Chronological Checkpoint Timeline */}
                <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-700" />
                        Shipment Journey &amp; Milestones Log
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Official timestamps registered across international transport and customs hubs
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {activeShipment.checkpoints.length} Recorded Events
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {activeShipment.checkpoints.map((chk, index) => {
                      const isLatest = index === 0;
                      const chkColor = getStatusColor(chk.status);

                      return (
                        <div key={chk.id} className="relative group">
                          <div
                            className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full transition-transform ${
                              isLatest
                                ? 'bg-blue-700 ring-4 ring-blue-100 scale-125'
                                : 'bg-slate-300'
                            }`}
                          />

                          <div
                            className={`p-4 rounded-xl border transition-all ${
                              isLatest
                                ? 'bg-blue-50/40 border-blue-200 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${chkColor.badgeBg} ${chkColor.text}`}
                                >
                                  {formatStatusLabel(chk.status)}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {chk.title}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {new Date(chk.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZoneName: 'short',
                                })}
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed mt-1">
                              {chk.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                              <span>📍 {chk.location}</span>
                              {chk.facilityCode && <span>&bull; Hub: {chk.facilityCode}</span>}
                              {chk.signedBy && (
                                <span className="text-emerald-700 font-semibold">
                                  &bull; Signed by: {chk.signedBy}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 1 Col: Package Details & Notifications Signup */}
                <div className="space-y-6">
                  {/* Package Specifications Box */}
                  <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Package className="w-4 h-4 text-blue-700" />
                      Freight Specifications
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Weight</span>
                        <span className="font-bold text-slate-900">
                          {activeShipment.packageDetails.weight} {activeShipment.packageDetails.unit}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Pieces</span>
                        <span className="font-bold text-slate-900">
                          {activeShipment.packageDetails.pieces} Unit(s)
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Dimensions</span>
                        <span className="font-medium text-slate-800 font-mono">
                          {activeShipment.packageDetails.dimensions}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Cargo Type</span>
                        <span className="font-medium text-slate-800 text-right max-w-[150px] truncate">
                          {activeShipment.packageDetails.cargoType}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Declared Value</span>
                        <span className="font-bold text-blue-700">
                          {activeShipment.packageDetails.declaredValue}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Insurance</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {activeShipment.packageDetails.isInsured ? 'Underwritten' : 'Standard'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Shipper</div>
                        <div className="font-semibold text-slate-900">{activeShipment.sender.name}</div>
                        <div className="text-slate-500 text-[11px]">{activeShipment.sender.city}, {activeShipment.sender.country}</div>
                      </div>
                      <div className="pt-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Recipient</div>
                        <div className="font-semibold text-slate-900">{activeShipment.receiver.name}</div>
                        <div className="text-slate-500 text-[11px]">{activeShipment.receiver.address}, {activeShipment.receiver.city}</div>
                      </div>
                    </div>
                  </div>

                  {/* Automatic Email Update Subscription */}
                  <div className="rounded-3xl bg-blue-50/50 border border-blue-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Bell className="w-4 h-4 text-blue-700" />
                      <span>Email update preferences (prototype)</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      This prototype records the preference locally; it does not send email notifications.
                    </p>

                    {subscribedToast ? (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Preference saved locally for #{activeShipment.trackingNumber}. No email was sent.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleSubscribe} className="space-y-2">
                        <input
                          type="email"
                          required
                          placeholder="Enter email address"
                          value={subscribeEmail}
                          onChange={(e) => setSubscribeEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          Save notification preference
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : apiResult ? (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start">
                <div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Server tracking result</div><h2 className="mt-2 break-all font-mono text-2xl font-semibold text-slate-950">{apiResult.shipment.trackingNumber}</h2><p className="mt-2 text-sm text-slate-600">{apiResult.shipment.origin} <ArrowRight className="mx-1 inline h-4 w-4" /> {apiResult.shipment.destination}</p></div>
                <div className="flex items-center gap-3"><span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold capitalize text-cyan-900">{apiResult.shipment.status.replaceAll('_', ' ')}</span><button onClick={handleCloseTracking} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear</button></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">Service</div><div className="mt-1 text-sm font-semibold capitalize text-slate-900">{apiResult.shipment.serviceType.replaceAll('_', ' ') || 'To be confirmed'}</div></div><div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">Estimated delivery</div><div className="mt-1 text-sm font-semibold text-slate-900">{apiResult.shipment.estimatedDelivery ? new Date(apiResult.shipment.estimatedDelivery).toLocaleDateString() : 'Not available'}</div></div><div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">Last updated</div><div className="mt-1 text-sm font-semibold text-slate-900">{apiResult.shipment.lastUpdatedAt ? new Date(apiResult.shipment.lastUpdatedAt).toLocaleString() : 'Not available'}</div></div></div>
              <div><h3 className="text-base font-semibold text-slate-950">Shipment timeline</h3>{apiResult.events.length ? <ol className="mt-4 space-y-0">{apiResult.events.map((event, index) => <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center"><span className="z-10 mt-1.5 h-2.5 w-2.5 rounded-full bg-cyan-700 ring-4 ring-cyan-50" />{index < apiResult.events.length - 1 && <span className="absolute top-4 h-full w-px bg-slate-200" />}</div><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><span className="text-sm font-semibold capitalize text-slate-900">{event.eventType.replaceAll('_', ' ')}</span><time className="text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString()}</time></div><p className="mt-1 text-sm leading-6 text-slate-600">{event.description}</p>{event.location && <p className="mt-1 text-xs text-slate-500">{event.location}</p>}</div></li>)}</ol> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">The shipment record exists, but no public tracking events have been recorded yet.</p>}</div>
              <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Only shipment details approved for public tracking are shown here.</p>
            </div>
          ) : apiLookupState === 'loading' ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600"><span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-700" />Checking the tracking service…</div>
          ) : apiLookupState === 'unavailable' ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-10 text-center shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Tracking service unavailable</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">We could not verify this number with the server, and no matching local sample record was found. Please try again later.</p><button onClick={handleCloseTracking} className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Return to tracking</button></div>
          ) : (
            /* Not Found Screen */
            <div className="p-10 text-center rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
              <img src={errorArt} alt="" aria-hidden="true" className="mx-auto h-28 w-auto" />
              <h2 className="text-lg font-bold text-slate-900">
                No Consignment Found for "{activeTrackingNumber}"
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Please verify your Air Waybill or Consignment Reference Number and try again. If you need help, contact the Apex Logistics team through your usual service channel.
              </p>
              <div className="pt-3">
                <button
                  onClick={handleCloseTracking}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Clear search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
