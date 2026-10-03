import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, LogOut, MapPin, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { AuthSession } from '../types';
import { ProofCapture, ProofMedia } from './ProofCapture';

interface DriverStop {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  recipient: string;
  recipientPhone: string;
  address: string;
  estimatedDelivery?: string | null;
  vehicle?: string | null;
  dispatchSequence?: number | null;
  updatedAt: string;
  proofOfDelivery?: { recipientName: string; relation: string; timestamp: string } | null;
}
interface Props { session: AuthSession; onLogout: () => void; }
const ACTIONS = [
  { type: 'picked_up', label: 'Picked up' },
  { type: 'received_at_facility', label: 'At facility' },
  { type: 'in_transit', label: 'In transit' },
  { type: 'out_for_delivery', label: 'Out for delivery' },
  { type: 'delivered', label: 'Delivered' },
  { type: 'exception_hold', label: 'Report exception' },
];

export const DriverPortal: React.FC<Props> = ({ session, onLogout }) => {
  const [stops, setStops] = useState<DriverStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [location, setLocation] = useState('');
  const [exceptionReasons, setExceptionReasons] = useState<Record<string, string | undefined>>({});
  const [savingStop, setSavingStop] = useState<string | null>(null);
  const [proofMedia, setProofMedia] = useState<Record<string, ProofMedia | undefined>>({});
  const [reasonCodes, setReasonCodes] = useState<Record<string, string>>({});
  const [deliveryForms, setDeliveryForms] = useState<Record<string, { recipientName: string; relation: string } | undefined>>({});

  const loadStops = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const response = await fetch('/api/driver/stops', { credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not load your assigned stops.');
      setStops(Array.isArray(payload.stops) ? payload.stops : []);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Could not load assigned stops.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadStops(); }, [loadStops]);

  const recordAction = async (stop: DriverStop, eventType: string) => {
    setActionError('');
    const description = eventType === 'exception_hold' ? exceptionReasons[stop.id]?.trim() : `${eventType.replaceAll('_', ' ')} recorded by ${session.user?.name || 'driver'}.`;
    const proof = deliveryForms[stop.id];
    if (eventType === 'delivered' && (!proof?.recipientName.trim() || !proof?.relation)) { setActionError(`Enter the recipient name and relationship for ${stop.trackingNumber}.`); return; }
    if (eventType === 'exception_hold' && !description) { setActionError(`Add an exception reason for ${stop.trackingNumber} before submitting.`); return; }
    setSavingStop(stop.id);
    try {
      const response = await fetch(`/api/driver/stops/${encodeURIComponent(stop.id)}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ eventType, description, location, ...(eventType === 'delivered' ? { proofOfDelivery: proof, signature: proofMedia[stop.id]?.signature, photo: proofMedia[stop.id]?.photo } : {}), ...(eventType === 'exception_hold' && reasonCodes[stop.id] ? { reasonCode: reasonCodes[stop.id] } : {}) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not record this delivery milestone.');
      setStops(prev => prev.map(item => item.id === stop.id ? { ...item, status: payload.shipment.status, updatedAt: payload.shipment.updatedAt, proofOfDelivery: payload.shipment.proofOfDelivery || item.proofOfDelivery } : item));
      setDeliveryForms(prev => ({ ...prev, [stop.id]: undefined }));
      setExceptionReasons(prev => ({ ...prev, [stop.id]: eventType === 'exception_hold' ? undefined : '' }));
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not record milestone.'); }
    finally { setSavingStop(null); }
  };

  const openStops = stops.filter(stop => stop.status !== 'delivered');
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-2xl bg-[#071626] p-6 text-white sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><Truck size={16}/> Driver workspace</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">Today’s assigned stops</h1><p className="mt-2 text-sm leading-6 text-slate-300">Hello {session.user?.name || 'driver'}. Record delivery milestones for shipments assigned to your account.</p></div><div className="flex gap-2"><button onClick={() => void loadStops()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"><RefreshCw size={15}/> Refresh</button><button onClick={onLogout} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10"><LogOut size={15}/> Sign out</button></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-300">Assigned shipments</div><div className="mt-1 text-2xl font-semibold">{stops.length}</div></div><div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-300">Open stops</div><div className="mt-1 text-2xl font-semibold">{openStops.length}</div></div><div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-1"><div className="text-xs text-slate-300">Status</div><div className="mt-1 flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-cyan-300"/> Assignment-based access</div></div></div>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="mb-5"><h2 className="text-xl font-semibold text-slate-950">Stop details</h2><p className="mt-1 text-sm text-slate-600">Only shipments assigned to your authenticated driver account are shown.</p></div>
      <label className="mb-5 block max-w-md text-sm font-medium text-slate-700">Current location (optional)<input value={location} onChange={event => setLocation(event.target.value)} maxLength={160} placeholder="Facility, area or city" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"/></label>
      {actionError && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{actionError}</p>}
      {loading ? <div role="status" className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600"><Clock3 className="mx-auto mb-2" size={20}/>Loading assigned stops…</div> : loadError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}</div> : stops.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center"><PackageCheck className="mx-auto text-slate-400" size={30}/><h3 className="mt-3 font-semibold text-slate-950">No assigned shipments</h3><p className="mt-1 text-sm text-slate-600">Your dispatch team will assign shipments here when they are ready.</p></div> : <div className="space-y-4">{stops.map(stop => { const allowedByStatus: Record<string, string[]> = { manifest_created: ['picked_up', 'exception_hold'], picked_up: ['received_at_facility', 'in_transit', 'exception_hold'], received_at_facility: ['in_transit', 'out_for_delivery', 'exception_hold'], in_transit: ['received_at_facility', 'out_for_delivery', 'exception_hold'], customs_clearance: ['in_transit', 'out_for_delivery', 'exception_hold'], out_for_delivery: ['delivered', 'exception_hold'], exception_hold: ['in_transit', 'out_for_delivery', 'delivered'], delivered: [] }; const availableActions = ACTIONS.filter(action => (allowedByStatus[stop.status] || []).includes(action.type)); return <article key={stop.id} className="rounded-xl border border-slate-200 p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-slate-950">{stop.trackingNumber}</span>{stop.dispatchSequence !== null && stop.dispatchSequence !== undefined && <span className="rounded bg-cyan-50 px-2 py-1 text-[11px] font-bold text-cyan-900">Stop {stop.dispatchSequence}</span>}<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">{stop.status.replaceAll('_',' ')}</span></div><div className="mt-3 text-sm font-semibold text-slate-800">{stop.origin} <span className="mx-1 text-slate-400">→</span> {stop.destination}</div><div className="mt-2 text-sm text-slate-700">Recipient: {stop.recipient}{stop.recipientPhone ? ` · ${stop.recipientPhone}` : ''}</div>{stop.address && <div className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0"/>{stop.address}</div>}{stop.estimatedDelivery && <div className="mt-2 text-xs text-slate-500">Estimated delivery: {new Date(stop.estimatedDelivery).toLocaleDateString()}</div>}{stop.vehicle && <div className="mt-2 text-xs font-semibold text-slate-500">Assigned vehicle: {stop.vehicle}</div>}</div>{stop.status === 'delivered' && <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={15}/> Delivered</div>}</div>
        {stop.status === 'delivered' && stop.proofOfDelivery && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Delivery confirmation:</strong> {stop.proofOfDelivery.recipientName} · {stop.proofOfDelivery.relation} · {new Date(stop.proofOfDelivery.timestamp).toLocaleString()}</div>}{stop.status !== 'delivered' && <div className="mt-5 border-t border-slate-100 pt-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{availableActions.map(action => <button key={action.type} onClick={() => action.type === 'exception_hold' ? setExceptionReasons(prev => ({ ...prev, [stop.id]: prev[stop.id] === undefined ? '' : prev[stop.id] })) : action.type === 'delivered' ? setDeliveryForms(prev => ({ ...prev, [stop.id]: prev[stop.id] || { recipientName: '', relation: 'Recipient' } })) : void recordAction(stop, action.type)} disabled={savingStop === stop.id} className={`min-h-11 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-50 ${action.type === 'delivered' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : action.type === 'exception_hold' ? 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}>{savingStop === stop.id ? 'Saving…' : action.type === 'exception_hold' ? <><AlertTriangle className="mr-1 inline" size={13}/>{action.label}</> : action.label}</button>)}</div>{deliveryForms[stop.id] && <div className="mt-3 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"><p className="text-xs font-semibold text-emerald-950">Delivery confirmation — typed acknowledgement (not a handwritten signature); signature and photo optional</p><label className="block text-xs font-semibold text-slate-700">Recipient full name<input value={deliveryForms[stop.id]?.recipientName || ''} onChange={event => setDeliveryForms(prev => ({ ...prev, [stop.id]: { ...(prev[stop.id] || { recipientName: '', relation: 'Recipient' }), recipientName: event.target.value } }))} maxLength={120} required className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Name of person receiving shipment"/></label><label className="block text-xs font-semibold text-slate-700">Recipient relationship / role<select value={deliveryForms[stop.id]?.relation || 'Recipient'} onChange={event => setDeliveryForms(prev => ({ ...prev, [stop.id]: { ...(prev[stop.id] || { recipientName: '', relation: 'Recipient' }), relation: event.target.value } }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">{['Recipient','Family member','Receptionist','Security','Authorized representative','Other'].map(role => <option key={role} value={role}>{role}</option>)}</select></label><ProofCapture onChange={media => setProofMedia(prev => ({ ...prev, [stop.id]: media }))} /><div className="flex gap-2"><button onClick={() => void recordAction(stop, 'delivered')} disabled={savingStop === stop.id} className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm delivery</button><button onClick={() => setDeliveryForms(prev => ({ ...prev, [stop.id]: undefined }))} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button></div></div>}{exceptionReasons[stop.id] !== undefined && <div className="mt-3 space-y-2"><label className="block text-xs font-semibold text-slate-700">Reason type<select value={reasonCodes[stop.id] || ''} onChange={event => setReasonCodes(prev => ({ ...prev, [stop.id]: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Select a reason</option><option value="recipient_unavailable">Recipient unavailable</option><option value="address_issue">Address issue</option><option value="delivery_refused">Delivery refused</option><option value="access_denied">Access denied</option><option value="package_damaged">Package damaged</option><option value="other">Other</option></select></label><label className="block text-xs font-semibold text-slate-700">Exception reason<textarea value={exceptionReasons[stop.id] || ''} onChange={event => setExceptionReasons(prev => ({ ...prev, [stop.id]: event.target.value }))} maxLength={500} rows={2} placeholder="Describe the issue and next action needed" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></label><div className="flex gap-2"><button onClick={() => void recordAction(stop, 'exception_hold')} disabled={savingStop === stop.id} className="min-h-10 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Submit exception</button><button onClick={() => setExceptionReasons(prev => ({ ...prev, [stop.id]: undefined }))} className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button></div></div>}</div>}
      </article>; })}</div>}
    </section>
  </div>;
};
