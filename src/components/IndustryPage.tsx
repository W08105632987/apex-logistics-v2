import React from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import indHealth from '../assets/images/industry-healthcare.webp';
import indEcom from '../assets/images/industry-ecommerce.webp';
import indMfg from '../assets/images/industry-manufacturing.webp';
import indRetail from '../assets/images/industry-retail.webp';
import indTech from '../assets/images/industry-technology.webp';
import indAuto from '../assets/images/industry-automotive.webp';
import coldImage from '../assets/images/pharma_cold_chain_1787732293031.webp';
import warehouseImage from '../assets/images/smart_warehouse_hub_1787732277761.webp';
import expressImage from '../assets/images/express_logistics_hero_1787730786284.webp';
import airImage from '../assets/images/cargo_plane_hero_1787730752988.webp';
import oceanImage from '../assets/images/ocean_freight_hero_1787730773821.webp';

export type IndustryKey = 'industry-healthcare' | 'industry-ecommerce' | 'industry-manufacturing' | 'industry-retail' | 'industry-technology' | 'industry-automotive';
export const INDUSTRY_KEYS: IndustryKey[] = ['industry-healthcare', 'industry-ecommerce', 'industry-manufacturing', 'industry-retail', 'industry-technology', 'industry-automotive'];

interface Industry { artAlt: string; name: string; headline: string; intro: string; art: string; photo: string; photoAlt: string; challenges: string[]; approach: string[]; services: string[]; faq: { q: string; a: string }[]; }

// Content describes how shipments are planned. It deliberately makes no statistics, certification or coverage claims.
const INDUSTRIES: Record<IndustryKey, Industry> = {
  'industry-healthcare': { name: 'Healthcare & life sciences', headline: 'Sensitive cargo starts with its requirements.', intro: 'Medical and pharmaceutical products often come with handling, documentation and timing requirements that must be understood before a route is chosen.', art: indHealth, artAlt: 'Operator in protective clothing handling an insulated temperature-controlled container in a clean facility', photo: coldImage, photoAlt: 'Temperature-sensitive cargo being handled in a controlled facility',
    challenges: ['Products that must stay within a defined temperature range', 'Documentation that must travel with the cargo', 'Tight delivery windows after production or release', 'Clear escalation when something changes in transit'],
    approach: ['Confirm the product’s handling requirements before quoting', 'Plan packaging, route and handover points around those requirements', 'Record milestones and exceptions on the shipment timeline', 'Keep documents attached to the shipment for authorised users'],
    services: ['Cold chain', 'Air freight', 'Customs & clearance'], faq: [{ q: 'Do you guarantee temperature ranges?', a: 'Capabilities depend on the route and facilities available. Share your requirements in a quote request and we will confirm what can be arranged.' }, { q: 'Can documents be attached to a shipment?', a: 'Yes. Authorised staff can attach PDF, JPEG or PNG documents, and linked customers can download them from the portal.' }] },
  'industry-ecommerce': { name: 'E-commerce', headline: 'From inventory to doorstep, in one workflow.', intro: 'Online sellers need inbound stock, storage, parcel movement and delivery updates to work together.', art: indEcom, artAlt: 'Fulfilment centre operator sealing a parcel at a packing station', photo: warehouseImage, photoAlt: 'Modern fulfilment warehouse',
    challenges: ['Inbound stock arriving in varied sizes and volumes', 'Seasonal changes in parcel volume', 'Customers expecting delivery updates', 'Returns and failed deliveries'],
    approach: ['Plan storage and dispatch around your order profile', 'Choose service levels per destination and parcel type', 'Give customers a tracking page and notifications', 'Record failed-delivery reasons for follow-up'],
    services: ['Warehousing', 'Express logistics', 'Road freight'], faq: [{ q: 'Can my customers track parcels?', a: 'Every shipment has a tracking number that works on the public Track Shipment page.' }, { q: 'Do you integrate with online stores?', a: 'No store integrations are configured at present. Tell us what you use and we can discuss options.' }] },
  'industry-manufacturing': { name: 'Manufacturing', headline: 'Keep production supplied and finished goods moving.', intro: 'Manufacturers depend on components arriving when production needs them and on finished goods reaching customers.', art: indMfg, artAlt: 'Forklift moving crated components towards an outbound truck on a factory floor', photo: oceanImage, photoAlt: 'Container vessel approaching a port',
    challenges: ['Components from several origins', 'Production schedules sensitive to late arrivals', 'Bulky or heavy cargo', 'Import and export paperwork'],
    approach: ['Map inbound and outbound lanes against your production plan', 'Combine ocean, air and road legs where it makes sense', 'Coordinate customs documents ahead of arrival', 'Track each leg through shipment milestones'],
    services: ['Ocean freight', 'Road freight', 'Customs & clearance'], faq: [{ q: 'Can you handle full container loads?', a: 'Full-container and consolidated options are offered subject to route and availability. Request a quote with your cargo details.' }] },
  'industry-retail': { name: 'Retail & consumer goods', headline: 'Connect suppliers, storage and stores.', intro: 'Retail supply chains link suppliers, distribution points and stores, often with seasonal peaks.', art: indRetail, artAlt: 'Distribution dock worker scanning labelled cartons on a pallet', photo: warehouseImage, photoAlt: 'Distribution warehouse with organised inventory',
    challenges: ['Many suppliers and delivery points', 'Seasonal peaks and promotions', 'Stock held between suppliers and stores', 'Visibility across handovers'],
    approach: ['Plan supplier shipments and storage together', 'Sequence onward distribution to stores or customers', 'Share shipment progress with the people who need it', 'Review exceptions as they are recorded'],
    services: ['Warehousing', 'Road freight', 'Express logistics'], faq: [{ q: 'Can you store goods before distribution?', a: 'Storage and dispatch support is available subject to facility availability. Ask us about your volumes and timing.' }] },
  'industry-technology': { name: 'Technology', headline: 'Handle valuable equipment with care.', intro: 'Electronics and equipment shipments need careful packaging, accurate declarations and dependable handovers.', art: indTech, artAlt: 'Operator placing foam-protected server equipment on a pallet', photo: airImage, photoAlt: 'Cargo aircraft at a freight terminal',
    challenges: ['High-value or fragile equipment', 'Accurate declared values and descriptions', 'Time-sensitive deployments', 'Chain-of-handover records'],
    approach: ['Capture dimensions, weight and declared value up front', 'Select speed and handling to match the equipment', 'Prepare customs documents before departure', 'Keep a timestamped record of every milestone'],
    services: ['Air freight', 'Express logistics', 'Customs & clearance'], faq: [{ q: 'Can I insure high-value shipments?', a: 'Insurance options are not described on this site. Contact us to discuss your requirements.' }] },
  'industry-automotive': { name: 'Automotive', headline: 'Move parts and larger cargo with precision.', intro: 'Automotive logistics ranges from urgent spare parts to larger equipment and components.', art: indAuto, artAlt: 'Warehouse worker checking automotive parts beside a delivery van', photo: expressImage, photoAlt: 'Road logistics vehicle on a regional route',
    challenges: ['Urgent parts needed to restore operations', 'Large or irregular cargo', 'Multi-leg routes between plants and dealers', 'Documentation for cross-border movement'],
    approach: ['Match service speed to how urgent the part is', 'Plan handling for size and weight constraints', 'Assign vehicles and drivers for regional legs', 'Track the shipment from pickup to delivery'],
    services: ['Road freight', 'Express logistics', 'Ocean freight'], faq: [{ q: 'Can you move oversized cargo?', a: 'It depends on route and equipment. Send the dimensions and weight in a quote request and we will confirm what is possible.' }] },
};

interface Props { page: IndustryKey; onQuote: () => void; onBack: () => void; }

export const IndustryPage: React.FC<Props> = ({ page, onQuote, onBack }) => {
  const d = INDUSTRIES[page];
  return <div className="mx-auto max-w-7xl space-y-12">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-cyan-800"><ChevronLeft size={16} /> All industries</button>
    <section className="grid overflow-hidden rounded-2xl bg-[#071626] text-white md:grid-cols-2">
      <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14"><div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">{d.name}</div><h1 className="mt-4 text-3xl font-semibold tracking-[-.035em] sm:text-5xl">{d.headline}</h1><p className="mt-5 text-base leading-7 text-slate-300">{d.intro}</p><button onClick={onQuote} className="mt-8 inline-flex min-h-12 w-fit items-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071626] hover:bg-cyan-200">Request a quote <ArrowRight size={17} /></button></div>
      <img src={d.art} alt={d.artAlt} className="h-full min-h-[240px] w-full object-cover" />
    </section>
    <section className="grid gap-10 md:grid-cols-2">
      <div><h2 className="text-2xl font-semibold text-slate-950">Common challenges</h2><ul className="mt-5 space-y-3">{d.challenges.map(c => <li key={c} className="flex gap-3 text-sm leading-6 text-slate-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-cyan-700" />{c}</li>)}</ul></div>
      <div><h2 className="text-2xl font-semibold text-slate-950">How we plan it</h2><ol className="mt-5 space-y-3">{d.approach.map((a, i) => <li key={a} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800">{i + 1}</span>{a}</li>)}</ol></div>
    </section>
    <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2"><img src={d.photo} alt={d.photoAlt} loading="lazy" className="h-full min-h-[220px] w-full object-cover" /><div className="p-7 sm:p-10"><h2 className="text-xl font-semibold text-slate-950">Relevant services</h2><div className="mt-4 flex flex-wrap gap-2">{d.services.map(s => <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">{s}</span>)}</div><p className="mt-5 text-sm leading-6 text-slate-600">Service availability depends on your route and cargo. Tell us what you need to move and we will confirm the options.</p></div></section>
    <section><h2 className="text-2xl font-semibold text-slate-950">Questions</h2><div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">{d.faq.map(f => <details key={f.q} className="group p-5"><summary className="cursor-pointer text-sm font-semibold text-slate-900">{f.q}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{f.a}</p></details>)}</div></section>
  </div>;
};
