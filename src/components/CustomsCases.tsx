import React, { useCallback, useEffect, useState } from 'react';

interface ChecklistItem { key: string; label: string; received: boolean; }
interface CustomsCase { id: string; shipmentId: string; trackingNumber: string; stage: string; checklist: ChecklistItem[]; duty: { amount: number; currency: string; paid: boolean } | null; holdReason: string; notes: string; updatedAt: string; }
interface Props { canEdit: boolean; shipments: { id: string; trackingNumber: string }[]; }

const STAGE_LABEL: Record<string, string> = { document_review: 'Document review', assessment: 'Assessment', cleared: 'Cleared', held: 'On hold' };

export const CustomsCases: React.FC<Props> = ({ canEdit, shipments }) => {
  const [cases, setCases] = useState<CustomsCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newShipment, setNewShipment] = useState('');
  const [busy, setBusy] = useState('');
  const [dutyDraft, setDutyDraft] = useState<Record<string, { amount: string; currency: string }>>({});
  const [holdDraft, setHoldDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await fetch('/api/customs/cases', { credentials: 'same-origin' }); const p = await r.json().catch(() => ({})); if (!r.ok) throw new Error(p.error || 'Could not load customs cases.'); setCases(p.cases || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load customs cases.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const send = async (url: string, method: string, body: unknown, key: string) => {
    setBusy(key); setError('');
    try { const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const p = await r.json().catch(() => ({})); if (!r.ok) throw new Error(p.error || 'The change could not be saved.'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The change could not be saved.'); } finally { setBusy(''); }
  };

  const openShipments = shipments.filter(s => !cases.some(c => c.shipmentId === s.id && c.stage !== 'cleared'));

  return <section aria-labelledby="customs-cases-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h3 id="customs-cases-title" className="text-lg font-semibold text-slate-950">Customs cases</h3><p className="mt-1 text-sm text-slate-600">Document review → assessment → cleared or on hold.</p></div>
      {canEdit && <div className="flex gap-2"><label className="sr-only" htmlFor="new-case-shipment">Shipment</label><select id="new-case-shipment" value={newShipment} onChange={e => setNewShipment(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Select shipment</option>{openShipments.map(s => <option key={s.id} value={s.id}>{s.trackingNumber}</option>)}</select><button disabled={!newShipment || busy === 'new'} onClick={() => { void send('/api/customs/cases', 'POST', { shipmentId: newShipment }, 'new'); setNewShipment(''); }} className="min-h-10 rounded-lg bg-cyan-800 px-4 text-sm font-bold text-white disabled:opacity-50">Open case</button></div>}
    </div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-600">Loading customs cases…</p> : cases.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No customs cases yet.{canEdit ? ' Open one from a shipment above.' : ''}</p> :
      <div className="space-y-4">{cases.map(c => { const draft = dutyDraft[c.id] || { amount: c.duty ? String(c.duty.amount) : '', currency: c.duty?.currency || 'USD' }; return <article key={c.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-slate-950">{c.trackingNumber}</div><span className={`rounded-full px-3 py-1 text-xs font-bold ${c.stage === 'cleared' ? 'bg-emerald-50 text-emerald-800' : c.stage === 'held' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>{STAGE_LABEL[c.stage] || c.stage}</span></div>
        {c.holdReason && <p className="mt-2 text-xs text-rose-800">Hold reason: {c.holdReason}</p>}
        <fieldset className="mt-3" disabled={!canEdit || c.stage === 'cleared'}><legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Document checklist</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{c.checklist.map(item => <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={item.received} onChange={e => void send(`/api/customs/cases/${c.id}`, 'PATCH', { checklist: [{ key: item.key, received: e.target.checked }] }, c.id)} />{item.label}</label>)}</div></fieldset>
        {canEdit && c.stage !== 'cleared' && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Duty / fees</div><div className="mt-1 flex gap-2"><input aria-label="Duty amount" inputMode="decimal" value={draft.amount} onChange={e => setDutyDraft(p => ({ ...p, [c.id]: { ...draft, amount: e.target.value } }))} placeholder="Amount" className="min-h-10 w-24 rounded-lg border border-slate-300 px-2 text-sm" /><input aria-label="Currency" maxLength={3} value={draft.currency} onChange={e => setDutyDraft(p => ({ ...p, [c.id]: { ...draft, currency: e.target.value.toUpperCase() } }))} className="min-h-10 w-16 rounded-lg border border-slate-300 px-2 text-sm" /><button disabled={busy === c.id || !draft.amount} onClick={() => void send(`/api/customs/cases/${c.id}`, 'PATCH', { duty: { amount: Number(draft.amount), currency: draft.currency, paid: c.duty?.paid || false } }, c.id)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-bold disabled:opacity-50">Save</button></div>{c.duty && <label className="mt-2 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={c.duty.paid} onChange={e => void send(`/api/customs/cases/${c.id}`, 'PATCH', { duty: { ...c.duty, paid: e.target.checked } }, c.id)} />Duty of {c.duty.amount} {c.duty.currency} marked as paid</label>}</div>
          <div className="flex flex-wrap items-end gap-2">{c.stage === 'document_review' && <button disabled={busy === c.id} onClick={() => void send(`/api/customs/cases/${c.id}`, 'PATCH', { stage: 'assessment' }, c.id)} className="min-h-10 rounded-lg bg-cyan-800 px-3 text-xs font-bold text-white">Move to assessment</button>}{(c.stage === 'assessment' || c.stage === 'held') && <button disabled={busy === c.id} onClick={() => void send(`/api/customs/cases/${c.id}`, 'PATCH', { stage: 'cleared' }, c.id)} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">Clear</button>}<input aria-label="Hold reason" value={holdDraft[c.id] || ''} onChange={e => setHoldDraft(p => ({ ...p, [c.id]: e.target.value }))} placeholder="Hold reason" className="min-h-10 w-40 rounded-lg border border-slate-300 px-2 text-sm" /><button disabled={busy === c.id || !(holdDraft[c.id] || '').trim()} onClick={() => void send(`/api/customs/cases/${c.id}`, 'PATCH', { stage: 'held', holdReason: holdDraft[c.id] }, c.id)} className="min-h-10 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white disabled:opacity-50">Place on hold</button></div>
        </div>}
      </article>; })}</div>}
  </section>;
};
