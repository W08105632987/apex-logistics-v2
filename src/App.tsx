import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Shipment, EmailLog, AuthUser, AuthSession } from './types';
import { INITIAL_SHIPMENTS, getInitialEmailLogs } from './data/initialShipments';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { PublicContentPage } from './components/PublicContentPage';
import { IndustryPage, INDUSTRY_KEYS, IndustryKey } from './components/IndustryPage';
const CustomerPortal = lazy(() => import('./components/CustomerPortal').then(m => ({ default: m.CustomerPortal })));
import { Footer } from './components/Footer';
const TrackingView = lazy(() => import('./components/TrackingView').then(m => ({ default: m.TrackingView })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminAuthGate = lazy(() => import('./components/AdminAuthGate').then(m => ({ default: m.AdminAuthGate })));
const DriverPortal = lazy(() => import('./components/DriverPortal').then(m => ({ default: m.DriverPortal })));
import { RateCalculator } from './components/RateCalculator';
import { GlobalServices } from './components/GlobalServices';
const AirWaybillModal = lazy(() => import('./components/AirWaybillModal').then(m => ({ default: m.AirWaybillModal })));
const CustomerMailboxModal = lazy(() => import('./components/CustomerMailboxModal').then(m => ({ default: m.CustomerMailboxModal })));
import { sendSimulatedEmail } from './utils/emailService';
import { getCurrentSession, logoutUser, restoreServerSession } from './utils/authService';

type AppTab = 'home' | 'track' | 'admin' | 'calculator' | 'services' | 'air-freight' | 'ocean-freight' | 'road-freight' | 'express' | 'warehousing' | 'cold-chain' | 'customs' | 'industries' | 'network' | 'about' | 'contact' | 'customer' | 'driver' | IndustryKey;
const PUBLIC_CONTENT_TABS = new Set<AppTab>(['air-freight', 'ocean-freight', 'road-freight', 'express', 'warehousing', 'cold-chain', 'customs', 'industries', 'network', 'about', 'contact']);

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [trackedTrackingNumber, setTrackedTrackingNumber] = useState<string>('');
  
  // Authentication session state
  const [session, setSession] = useState<AuthSession>(() => getCurrentSession());

  // Shipments state
  const [shipments, setShipments] = useState<Shipment[]>(INITIAL_SHIPMENTS);

  // Email Logs state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => getInitialEmailLogs());

  // Modals state
  const [selectedWaybillShipment, setSelectedWaybillShipment] = useState<Shipment | null>(null);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Hash route management for URL separation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase().replace('#/', '').replace('#', '');
      const params = new URLSearchParams(window.location.search);
      
      if (hash === 'admin' || hash === 'staff' || params.get('portal') === 'admin') {
        setActiveTab('admin');
      } else if (hash === 'home' || hash === '') {
        setActiveTab('home');
      } else if (hash === 'calculator' || hash === 'quote') {
        setActiveTab('calculator');
      } else if (hash === 'services') {
        setActiveTab('services');
      } else if (hash === 'customer') {
        setActiveTab('customer');
      } else if (hash === 'driver') {
        setActiveTab('driver');
      } else if (['air-freight', 'ocean-freight', 'road-freight', 'express', 'warehousing', 'cold-chain', 'customs', 'industries', 'network', 'about', 'contact'].includes(hash)) {
        setActiveTab(hash as AppTab);
      } else if ((INDUSTRY_KEYS as string[]).includes(hash)) {
        setActiveTab(hash as AppTab);
      } else if (hash.startsWith('track/')) {
        const trackingNum = hash.replace('track/', '').toUpperCase();
        setTrackedTrackingNumber(trackingNum);
        setActiveTab('track');
      } else {
        setActiveTab('track');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'customer') {
      window.location.hash = '#customer';
    } else if (tab === 'driver') {
      window.location.hash = '#driver';
    } else if (tab === 'home') {
      window.location.hash = '#home';
    } else if (tab === 'admin') {
      window.location.hash = '#admin';
    } else if (tab === 'calculator') {
      window.location.hash = '#calculator';
    } else if (tab === 'services' || PUBLIC_CONTENT_TABS.has(tab) || (INDUSTRY_KEYS as string[]).includes(tab)) {
      window.location.hash = `#${tab}`;
    } else {
      window.location.hash = '#track';
    }
  };

  const handleToggleAdmin = () => {
    if (activeTab === 'admin') {
      handleTabChange('home');
    } else {
      handleTabChange('admin');
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    const newSession: AuthSession = {
      user,
      isAuthenticated: true,
      loginTime: new Date().toISOString(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    };
    setSession(newSession);
    if (user.role === 'customer') handleTabChange('customer');
    else if (user.role === 'driver') handleTabChange('driver');
    else handleTabChange('admin');
  };

  const handleLogout = () => {
    void logoutUser();
    setSession({
      user: null,
      isAuthenticated: false,
      loginTime: null,
      expiresAt: null,
    });
  };

  // Restore the authenticated staff session from the HTTP-only server cookie.
  useEffect(() => {
    let cancelled = false;
    restoreServerSession().then((restored) => { if (!cancelled && restored.isAuthenticated) { setSession(restored); if (restored.user?.role === 'customer') setActiveTab('customer'); else if (restored.user?.role === 'driver') setActiveTab('driver'); else setActiveTab('admin'); } });
    return () => { cancelled = true; };
  }, []);

  // Load staff shipment records from the server after authentication. The bundled records are demo samples only.
  useEffect(() => {
    if (!session.isAuthenticated || !session.user || session.user.role === 'customer' || session.user.role === 'driver') return;
    let cancelled = false;
    fetch('/api/shipments', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not load server shipment records.');
        if (!cancelled) setShipments(Array.isArray(payload.shipments) ? payload.shipments : []);
      })
      .catch((error) => { if (!cancelled) setOperationError(error instanceof Error ? error.message : 'Could not load shipment records.'); });
    return () => { cancelled = true; };
  }, [session.isAuthenticated, session.user?.id]);

  // Actions
  const handleAddShipment = async (newShipment: Shipment, emailLog?: EmailLog): Promise<boolean> => {
    setOperationError(null);
    try {
      const response = await fetch('/api/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ ...newShipment, origin: newShipment.originHub.city, destination: newShipment.destinationHub.city }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.shipment) throw new Error(payload.error || 'The server could not create this shipment.');
      setShipments((prev) => [payload.shipment, ...prev.filter(item => item.id !== payload.shipment.id)]);
      if (emailLog) setEmailLogs((prev) => [emailLog, ...prev]);
      setTrackedTrackingNumber(payload.shipment.trackingNumber);
      return true;
    } catch (error) { setOperationError(error instanceof Error ? error.message : 'Could not create shipment. Check the backend connection.'); return false; }
  };

  const handleUpdateShipment = async (updatedShipment: Shipment, emailLog?: EmailLog): Promise<boolean> => {
    setOperationError(null);
    try {
      const isCustomsRole = session.user?.role === 'customs';
      const latestCheckpoint = updatedShipment.checkpoints?.[0];
      const response = isCustomsRole
        ? await fetch(`/api/shipments/${encodeURIComponent(updatedShipment.id)}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ eventType: updatedShipment.status, description: latestCheckpoint?.description || latestCheckpoint?.title || updatedShipment.statusMessage, occurredAt: latestCheckpoint?.timestamp || updatedShipment.updatedAt, location: latestCheckpoint?.location || updatedShipment.currentLocation?.description, visibility: 'public', customsStatus: updatedShipment.customsDetails?.status }) })
        : await fetch(`/api/shipments/${encodeURIComponent(updatedShipment.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ ...updatedShipment, origin: updatedShipment.originHub.city, destination: updatedShipment.destinationHub.city }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.shipment) throw new Error(payload.error || 'The server could not update this shipment.');
      const savedShipment = isCustomsRole ? { ...payload.shipment, checkpoints: updatedShipment.checkpoints } : payload.shipment;
      setShipments((prev) => prev.map(item => item.id === savedShipment.id ? savedShipment : item));
      if (emailLog) setEmailLogs((prev) => [{ ...emailLog, status: 'simulated' }, ...prev]);
      return true;
    } catch (error) { setOperationError(error instanceof Error ? error.message : 'Could not update shipment. Check the backend connection.'); return false; }
  };

  const handleDeleteShipment = async (id: string): Promise<boolean> => {
    setOperationError(null);
    try {
      const response = await fetch(`/api/shipments/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'The server could not delete this shipment.'); }
      setShipments((prev) => prev.filter(item => item.id !== id));
      return true;
    } catch (error) { setOperationError(error instanceof Error ? error.message : 'Could not delete shipment. Check the backend connection.'); return false; }
  };

  const handleAssignDriver = async (shipmentId: string, driverId: string, vehicleId = '', dispatchSequence = 0): Promise<boolean> => {
    setOperationError(null);
    try {
      const response = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}/assignment`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ driverId: driverId || null, vehicleId: vehicleId || null, dispatchSequence }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.shipment) throw new Error(payload.error || 'Could not update driver assignment.');
      setShipments(prev => prev.map(item => item.id === payload.shipment.id ? payload.shipment : item));
      return true;
    } catch (error) { setOperationError(error instanceof Error ? error.message : 'Could not update driver assignment.'); return false; }
  };

  const handleTrackShipment = (trackingNumber: string) => {
    setTrackedTrackingNumber(trackingNumber);
    handleTabChange('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribeEmail = (trackingNumber: string, email: string) => {
    const shipment = shipments.find((s) => s.trackingNumber === trackingNumber);
    if (shipment) {
      const updatedSubscribers = Array.from(new Set([...(shipment.subscribers || []), email]));
      const updatedShipment: Shipment = {
        ...shipment,
        subscribers: updatedSubscribers,
      };
      // Prototype-only preference: do not claim delivery or change the server record from this public demo form.
      setShipments((prev) => prev.map(item => item.id === updatedShipment.id ? updatedShipment : item));
      const emailLog = sendSimulatedEmail(updatedShipment, 'booking_created', `Prototype notification preference recorded for #${trackingNumber}. No email was sent.`, email);
      setEmailLogs((prev) => [{ ...emailLog, status: 'simulated' }, ...prev]);
    }
  };




  const isAdminMode = activeTab === 'admin';

  return (
    <div className="min-h-screen bg-[#071322] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-[#061524]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        emailCount={emailLogs.length}
        onOpenMailbox={() => setIsMailboxOpen(true)}
        onToggleAdmin={handleToggleAdmin}
        isAdminMode={isAdminMode}
        session={session}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <Suspense fallback={<div role="status" aria-live="polite" className="flex flex-1 items-center justify-center p-16 text-sm font-medium text-slate-500">Loading…</div>}>
      <main className={`flex-1 w-full ${activeTab === 'home' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8'}`}>
        {/* Reset Database Indicator & Active Portal Breadcrumb */}
        <div className={`flex items-center justify-between mb-4 ${activeTab === 'home' || activeTab === 'customer' ? 'hidden' : ''}`}>
          <div className="text-xs font-semibold text-slate-500">
            {isAdminMode ? (
              <span className="flex items-center gap-1.5 text-blue-800">
                <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                {session.isAuthenticated && session.user ? (
                  <>
                    <span>Authorized Terminal:</span>
                    <strong className="text-slate-900">{session.user.name}</strong>
                    <span className="text-slate-400 font-mono">({session.user.badgeNumber})</span>
                  </>
                ) : (
                  <span>Personnel Access Gateway &bull; Restrictive Operational Clearance</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Shipment tracking
              </span>
            )}
          </div>


        </div>

        {activeTab === 'customer' && <CustomerPortal session={session} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} onQuote={() => handleTabChange('calculator')} onTrack={handleTrackShipment} onContact={() => handleTabChange('contact')} />}
        {activeTab === 'driver' && session.user?.role === 'driver' && <DriverPortal session={session} onLogout={handleLogout} />}
        {activeTab === 'driver' && !session.isAuthenticated && <AdminAuthGate onAuthenticated={handleLoginSuccess} onCancel={() => handleTabChange('home')} />}
        {activeTab === 'driver' && session.isAuthenticated && session.user?.role !== 'driver' && <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"><h2 className="font-semibold">Driver access required</h2><p className="mt-2">This workspace is restricted to driver accounts. Sign in with a driver account or return to the website.</p><button onClick={handleLogout} className="mt-4 rounded-lg border border-rose-300 px-3 py-2 font-semibold">Sign out</button></div>}

        {activeTab === 'home' && <HomePage onTrack={(number) => handleTrackShipment(number)} onQuote={() => handleTabChange('calculator')} onServices={() => handleTabChange('services')} />}

        {activeTab === 'track' && (
          <TrackingView
            shipments={shipments}
            initialTrackingNumber={trackedTrackingNumber}
            onViewWaybill={(shp) => setSelectedWaybillShipment(shp)}
            onSubscribeEmail={handleSubscribeEmail}
          />
        )}

        {activeTab === 'admin' && session.user?.role === 'driver' && <DriverPortal session={session} onLogout={handleLogout} />}
        {activeTab === 'admin' && session.user?.role === 'customer' && <CustomerPortal session={session} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} onQuote={() => handleTabChange('calculator')} onTrack={handleTrackShipment} onContact={() => handleTabChange('contact')} />}

        {activeTab === 'admin' && session.user?.role !== 'customer' && session.user?.role !== 'driver' && operationError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{operationError}</div>}

        {activeTab === 'admin' && session.user?.role !== 'customer' && session.user?.role !== 'driver' && (
          session.isAuthenticated && session.user ? (
            <AdminDashboard
              shipments={shipments}
              emailLogs={emailLogs}
              currentUser={session.user}
              onLogout={handleLogout}
              onAddShipment={handleAddShipment}
              onUpdateShipment={handleUpdateShipment}
              onDeleteShipment={handleDeleteShipment}
              onAssignDriver={handleAssignDriver}
              onViewWaybill={(shp) => setSelectedWaybillShipment(shp)}
              onTrackShipment={handleTrackShipment}
              onOpenMailbox={() => setIsMailboxOpen(true)}
            />
          ) : (
            <AdminAuthGate
              onAuthenticated={handleLoginSuccess}
              onCancel={() => handleTabChange('track')}
            />
          )
        )}

        {activeTab === 'calculator' && <RateCalculator />}

        {activeTab === 'services' && <GlobalServices onSelectService={(page) => handleTabChange(page as AppTab)} />}
        {(INDUSTRY_KEYS as string[]).includes(activeTab) && <IndustryPage page={activeTab as IndustryKey} onQuote={() => handleTabChange('calculator')} onBack={() => handleTabChange('industries')} />}
        {PUBLIC_CONTENT_TABS.has(activeTab) && <PublicContentPage page={activeTab as 'air-freight' | 'ocean-freight' | 'road-freight' | 'express' | 'warehousing' | 'cold-chain' | 'customs' | 'industries' | 'network' | 'about' | 'contact'} onQuote={() => handleTabChange('calculator')} onTrack={() => handleTabChange('track')} onIndustry={(key) => handleTabChange(key)} />}
      </main>

      {/* Modals */}
      {selectedWaybillShipment && (
        <AirWaybillModal
          shipment={selectedWaybillShipment}
          onClose={() => setSelectedWaybillShipment(null)}
        />
      )}

      {isMailboxOpen && (
        <CustomerMailboxModal
          emailLogs={emailLogs}
          onClose={() => setIsMailboxOpen(false)}
          onClearLogs={() => setEmailLogs([])}
        />
      )}

      </Suspense>

      {/* Footer */}
      <Footer onToggleAdmin={handleToggleAdmin} isAdminMode={isAdminMode} />
    </div>
  );
}
