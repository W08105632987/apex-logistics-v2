import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, FileText, MapPin, Package, ShieldCheck } from 'lucide-react';

interface QuoteResponse { quote?: { reference: string; status: string; message: string }; error?: string; }
type QuoteStep = 1 | 2 | 3;

export const RateCalculator: React.FC = () => {
  const [origin, setOrigin] = useState('Nigeria');
  const [destination, setDestination] = useState('United Kingdom');
  const [weight, setWeight] = useState('15');
  const [cargoDescription, setCargoDescription] = useState('General commercial goods');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('Help me choose');
  const [step, setStep] = useState<QuoteStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);
  const [error, setError] = useState('');

  const continueStep = () => {
    setError('');
    if (step === 1 && (!origin.trim() || !destination.trim())) { setError('Enter both an origin and destination to continue.'); return; }
    if (step === 2 && (!cargoDescription.trim() || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || Number(weight) > 1000000)) { setError('Enter a cargo description and a valid weight.'); return; }
    setStep(step === 1 ? 2 : 3);
  };

  const submitQuote = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setResult(null);
    if (!origin.trim() || !destination.trim()) { setStep(1); setError('Complete the route details.'); return; }
    if (!cargoDescription.trim() || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || Number(weight) > 1000000) { setStep(2); setError('Complete the cargo details with a valid weight.'); return; }
    if (!email.trim()) { setStep(3); setError('Enter a work email for follow-up.'); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ origin, destination, weight: Number(weight), cargoDescription, servicePreference: service, email }) });
      const data = await response.json() as QuoteResponse;
      if (!response.ok || !data.quote) throw new Error(data.error || 'Your request could not be submitted. Please try again.');
      setResult({ reference: data.quote.reference, message: data.quote.message });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not connect to the quote service. Please try again when the API is available.');
    } finally { setIsSubmitting(false); }
  };

  return <div className="mx-auto w-full max-w-5xl space-y-8">
    <section className="relative overflow-hidden rounded-2xl bg-[#071626] px-6 py-9 text-white sm:px-10 sm:py-12">
      <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-cyan-300/15"/><div className="absolute -right-2 -top-10 h-44 w-44 rounded-full border border-cyan-300/15"/>
      <div className="relative max-w-2xl"><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><FileText size={15}/> Shipping quote request</div><h1 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Tell us what you need to move.</h1><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Share your route and cargo details. Apex can review your requirements and confirm available services and pricing. No invented instant rates or delivery promises.</p></div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {result ? <div className="mx-auto max-w-xl py-7 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={28}/></div><h2 className="mt-5 text-2xl font-semibold text-slate-950">Request received</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your reference number is shown below. Keep it for follow-up.</p><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quote reference</div><div className="mt-2 font-mono text-xl font-bold text-slate-950">{result.reference}</div><p className="mt-3 text-sm leading-6 text-slate-600">{result.message}</p></div><button onClick={() => { setResult(null); setEmail(''); setStep(1); }} className="mt-6 rounded-lg bg-[#071626] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Submit another request</button></div> : <form onSubmit={submitQuote} className="space-y-7">
        <div className="flex items-center gap-3" aria-label={`Step ${step} of 3`}>{([1,2,3] as const).map(number => <div key={number} className="flex flex-1 items-center gap-2"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step >= number ? 'bg-[#071626] text-white' : 'bg-slate-100 text-slate-500'}`}>{number}</div><span className={`hidden text-xs font-semibold sm:block ${step === number ? 'text-slate-950' : 'text-slate-400'}`}>{number === 1 ? 'Route' : number === 2 ? 'Cargo & service' : 'Contact'}</span><div className={`h-1 flex-1 rounded-full ${number < step ? 'bg-cyan-500' : 'bg-slate-100'}`}/></div>)}</div>

        {step === 1 && <div><div className="mb-4 flex items-center gap-2"><MapPin size={17} className="text-cyan-800"/><h2 className="font-semibold text-slate-950">Route details</h2></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="quote-origin" className="mb-2 block text-sm font-medium text-slate-700">Origin country or city</label><input id="quote-origin" required maxLength={120} value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Lagos, Nigeria" className="min-h-12 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"/></div><div><label htmlFor="quote-destination" className="mb-2 block text-sm font-medium text-slate-700">Destination country or city</label><input id="quote-destination" required maxLength={120} value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. London, United Kingdom" className="min-h-12 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"/></div></div><p className="mt-4 text-sm leading-6 text-slate-500">Apex staff will review the route and confirm whether the requested service is available.</p></div>}

        {step === 2 && <div><div className="mb-4 flex items-center gap-2"><Package size={17} className="text-cyan-800"/><h2 className="font-semibold text-slate-950">Cargo information</h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="quote-cargo" className="mb-2 block text-sm font-medium text-slate-700">What are you shipping?</label><input id="quote-cargo" required maxLength={500} value={cargoDescription} onChange={e => setCargoDescription(e.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"/></div><div><label htmlFor="quote-weight" className="mb-2 block text-sm font-medium text-slate-700">Estimated weight (kg)</label><input id="quote-weight" required type="number" min="0.1" max="1000000" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"/></div><div><label htmlFor="quote-service" className="mb-2 block text-sm font-medium text-slate-700">Preferred service</label><select id="quote-service" value={service} onChange={e => setService(e.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"><option>Help me choose</option><option>Air freight</option><option>Ocean freight</option><option>Road transport</option><option>Express delivery</option><option>Warehousing</option><option>Cold chain</option><option>Customs support</option></select></div></div></div>}

        {step === 3 && <div className="space-y-5"><div><h2 className="text-lg font-semibold text-slate-950">Where should we send the follow-up?</h2><p className="mt-1 text-sm text-slate-600">Your request is saved for staff review. No automatic rate or email is generated.</p></div><div><label htmlFor="quote-email" className="mb-2 block text-sm font-medium text-slate-700">Work email for follow-up</label><input id="quote-email" required type="email" maxLength={160} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="min-h-12 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"/></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Request summary</h3><div className="mt-3 space-y-2 text-sm text-slate-700"><div><strong>Route:</strong> {origin} → {destination}</div><div><strong>Cargo:</strong> {cargoDescription}</div><div><strong>Weight:</strong> {weight} kg</div><div><strong>Preferred service:</strong> {service}</div></div></div></div>}

        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-cyan-800"/>Final pricing and transit estimates require confirmation against route, cargo and service availability.</p><div className="flex flex-wrap items-center gap-2">{step > 1 && <button type="button" onClick={() => { setError(''); setStep(step === 3 ? 2 : 1); }} className="min-h-12 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>}{step < 3 ? <button type="button" onClick={continueStep} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071626] transition hover:bg-cyan-200">Continue <ArrowRight size={16}/></button> : <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071626] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{isSubmitting ? <><Clock3 size={16} className="animate-spin"/> Submitting…</> : <>Send quote request <ArrowRight size={16}/></>}</button>}</div></div>
      </form>}
    </section>
  </div>;
};
