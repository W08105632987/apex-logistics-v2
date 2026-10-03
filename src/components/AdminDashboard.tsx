import { CustomsCases } from './CustomsCases';
import React, { useEffect, useState } from 'react';
import { Shipment, ShipmentStatus, ServiceType, LocationInfo, EmailLog, AuthUser, StaffRole } from '../types';
import { getStatusColor, formatStatusLabel, sendSimulatedEmail } from '../utils/emailService';

import {
  Plus,
  Package,
  ArrowRight,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Send,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  User,
  Shield,
  Trash2,
  Eye,
  Mail,
  Zap,
  Check,
  Lock,
  LogOut,
  Users,
  KeyRound,
  ShieldCheck,
  BadgeAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminDashboardProps {
  shipments: Shipment[];
  emailLogs: EmailLog[];
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onAddShipment: (newShipment: Shipment, emailLog?: EmailLog) => Promise<boolean>;
  onUpdateShipment: (updatedShipment: Shipment, emailLog?: EmailLog) => Promise<boolean>;
  onDeleteShipment: (id: string) => Promise<boolean>;
  onAssignDriver: (shipmentId: string, driverId: string, vehicleId?: string, dispatchSequence?: number) => Promise<boolean>;
  onViewWaybill: (shipment: Shipment) => void;
  onTrackShipment: (trackingNumber: string) => void;
  onOpenMailbox: () => void;
}

interface StaffAccountView { id: string; username: string; badgeNumber: string; email: string; name: string; role: StaffRole; roleTitle: string; stationLocation: string; avatarInitials: string; active: boolean; }

const GLOBAL_HUBS: LocationInfo[] = [
  { code: 'FRA', name: 'Frankfurt Airport area', city: 'Frankfurt', country: 'Germany', coordinates: [50.0379, 8.5622] },
  { code: 'JFK', name: 'New York JFK Airport area', city: 'New York', country: 'United States', coordinates: [40.6413, -73.7781] },
  { code: 'LHR', name: 'London Heathrow Airport area', city: 'London', country: 'United Kingdom', coordinates: [51.4700, -0.4543] },
  { code: 'NRT', name: 'Tokyo Narita Airport area', city: 'Tokyo', country: 'Japan', coordinates: [35.772, 140.3929] },
  { code: 'DWC', name: 'Dubai logistics area', city: 'Dubai', country: 'United Arab Emirates', coordinates: [25.2048, 55.2708] },
  { code: 'SIN', name: 'Singapore Changi Airport area', city: 'Singapore', country: 'Singapore', coordinates: [1.3644, 103.9915] },
  { code: 'CDG', name: 'Paris Charles de Gaulle Airport area', city: 'Paris', country: 'France', coordinates: [49.0097, 2.5479] },
  { code: 'SYD', name: 'Sydney freight area', city: 'Sydney', country: 'Australia', coordinates: [-33.8688, 151.2093] },
  { code: 'HKG', name: 'Hong Kong airport area', city: 'Hong Kong', country: 'Hong Kong', coordinates: [22.3080, 113.9185] },
  { code: 'LAX', name: 'Los Angeles airport area', city: 'Los Angeles', country: 'United States', coordinates: [33.9416, -118.4085] },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  shipments,
  emailLogs,
  currentUser,
  onLogout,
  onAddShipment,
  onUpdateShipment,
  onDeleteShipment,
  onAssignDriver,
  onViewWaybill,
  onTrackShipment,
  onOpenMailbox,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'manage' | 'emails' | 'personnel' | 'support' | 'bookings' | 'analytics' | 'customs' | 'enquiries' | 'fleet'>('overview');
  const [supportTickets, setSupportTickets] = useState<Array<{ id: string; reference: string; subject: string; message: string; category: string; customerEmail: string; trackingNumber?: string | null; status: string; createdAt: string }>>([]);
  const [supportLoadError, setSupportLoadError] = useState('');
  const [bookingRequests, setBookingRequests] = useState<Array<{ id: string; reference: string; quoteReference: string; customerEmail: string; origin: string; destination: string; cargoDescription: string; servicePreference?: string; weight: number; status: string; createdAt: string }>>([]);
  const [bookingLoadError, setBookingLoadError] = useState('');
  const [uploadingDocumentFor, setUploadingDocumentFor] = useState<string | null>(null);
  const [driverRoster, setDriverRoster] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [vehicleRoster, setVehicleRoster] = useState<Array<{ id: string; identifier: string; type: string; capacityKg: number; status: string; notes?: string }>>([]);
  const [dispatchSequenceDraft, setDispatchSequenceDraft] = useState<Record<string, string>>({});
  const [facilityRoster, setFacilityRoster] = useState<Array<{ id: string; name: string; type: string; city: string; country: string; address?: string; status: string }>>([]);
  const [fleetError, setFleetError] = useState('');
  const [vehicleForm, setVehicleForm] = useState({ identifier: '', type: 'van', capacityKg: '1000', notes: '' });
  const [facilityForm, setFacilityForm] = useState({ name: '', type: 'warehouse', city: '', country: '', address: '' });
  const [contactRequests, setContactRequests] = useState<Array<{ id: string; reference: string; name: string; email: string; inquiryType: string; shipmentReference?: string; message: string; status: string; createdAt: string }>>([]);
  const [contactLoadError, setContactLoadError] = useState('');
  const [notificationJobs, setNotificationJobs] = useState<Array<{ id: string; to: string; subject: string; status: string; attempts: number; maxAttempts: number; nextAttemptAt: string; createdAt: string; lastError?: string | null; providerId?: string | null; sentAt?: string | null }>>([]);
  const [deliveryConfigured, setDeliveryConfigured] = useState(false);
  const [deliveryLoadError, setDeliveryLoadError] = useState('');
  const [analyticsData, setAnalyticsData] = useState<{ generatedAt: string; totals: Record<string, number>; statusCounts: Record<string, number>; serviceCounts: Record<string, number> } | null>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedShipmentForCheckpoint, setSelectedShipmentForCheckpoint] = useState<Shipment | null>(null);

  // Staff & Personnel State (Admin only)
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountView[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('staff');
  const [newStaffPasskey, setNewStaffPasskey] = useState('');

  // Password reset state
  const [selectedOfficerForPasswordReset, setSelectedOfficerForPasswordReset] = useState<string | null>(null);
  const [updatedPasskeyInput, setUpdatedPasskeyInput] = useState('');

  // New Shipment Form State
  const [trackingNumber, setTrackingNumber] = useState(
    'APX-' + Math.floor(1000 + Math.random() * 9000) + '-GL'
  );
  const [serviceType, setServiceType] = useState<ServiceType>('express_air');
  const [originHubCode, setOriginHubCode] = useState('FRA');
  const [destHubCode, setDestHubCode] = useState('JFK');
  
  // Shipper details
  const [senderName, setSenderName] = useState('');
  const [senderCompany, setSenderCompany] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderCountry, setSenderCountry] = useState('Germany');
  const [senderPhone, setSenderPhone] = useState('+49 69 123456');
  const [senderEmail, setSenderEmail] = useState('sender@enterprise.com');

  // Receiver details
  const [receiverName, setReceiverName] = useState('');
  const [receiverCompany, setReceiverCompany] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverCountry, setReceiverCountry] = useState('United States');
  const [receiverPhone, setReceiverPhone] = useState('+1 (555) 890-1234');
  const [receiverEmail, setReceiverEmail] = useState('');

  // Cargo specs
  const [cargoWeight, setCargoWeight] = useState('12.5');
  const [cargoPieces, setCargoPieces] = useState('1');
  const [cargoDimensions, setCargoDimensions] = useState('50 x 35 x 25 cm');
  const [cargoType, setCargoType] = useState('High-Value Electronics & Technology');
  const [declaredValue, setDeclaredValue] = useState('$15,000.00');
  const [isInsured, setIsInsured] = useState(true);
  const [carrierNotes, setCarrierNotes] = useState('');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadStaffAccounts = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not load staff accounts.');
      setStaffAccounts((payload.users || []).map((user: { id: string; name: string; email: string; role: string; active: boolean }) => ({
        id: user.id, username: user.email, email: user.email, name: user.name,
        role: user.role === 'admin' ? 'admin' : user.role === 'customs' ? 'customs' : user.role === 'customer' ? 'customer' : user.role === 'driver' ? 'driver' : 'staff',
        roleTitle: user.role === 'admin' ? 'Administrator' : user.role === 'customs' ? 'Customs operations' : user.role === 'customer' ? 'Customer portal' : user.role === 'driver' ? 'Delivery driver' : 'Operations staff',
        badgeNumber: '', stationLocation: 'Apex Logistics', avatarInitials: user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(), active: user.active,
      })));
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not load staff accounts.', 'info'); }
  };

  useEffect(() => { if (currentUser?.role === 'admin') void loadStaffAccounts(); }, [currentUser?.id, currentUser?.role]);

  const loadNotificationJobs = async () => { setDeliveryLoadError(''); try { const response = await fetch('/api/notification-jobs', { credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not load notification jobs.'); setNotificationJobs(Array.isArray(payload.jobs) ? payload.jobs : []); setDeliveryConfigured(payload.configured === true); } catch (error) { setDeliveryLoadError(error instanceof Error ? error.message : 'Could not load notification jobs.'); } };
  useEffect(() => { if (activeTab === 'emails') void loadNotificationJobs(); }, [activeTab]);
  const retryNotificationJob = async (id: string) => { try { const response = await fetch(`/api/notification-jobs/${encodeURIComponent(id)}/retry`, { method: 'POST', credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not retry notification.'); showToast('Notification queued for retry.'); await loadNotificationJobs(); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not retry notification.', 'info'); } };

  const loadContactRequests = async () => { setContactLoadError(''); try { const response = await fetch('/api/contact', { credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not load contact requests.'); setContactRequests(Array.isArray(payload.contactRequests) ? payload.contactRequests : []); } catch (error) { setContactLoadError(error instanceof Error ? error.message : 'Could not load contact requests.'); } };
  useEffect(() => { if (activeTab === 'enquiries') void loadContactRequests(); }, [activeTab]);
  const updateContactStatus = async (id: string, status: string) => { try { const response = await fetch(`/api/contact/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not update contact request.'); setContactRequests(prev => prev.map(item => item.id === id ? payload.contactRequest : item)); showToast(`Enquiry updated to ${status}.`); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update enquiry.', 'info'); } };

  const loadSupportTickets = async () => {
    setSupportLoadError('');
    try { const response = await fetch('/api/support', { credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not load support tickets.'); setSupportTickets(Array.isArray(payload.tickets) ? payload.tickets : []); }
    catch (error) { setSupportLoadError(error instanceof Error ? error.message : 'Could not load support tickets.'); }
  };
  useEffect(() => { if (activeTab === 'support') void loadSupportTickets(); }, [activeTab]);
  const loadDispatchResources = async () => { try { const [driverResponse, vehicleResponse] = await Promise.all([fetch('/api/drivers', { credentials: 'same-origin' }), fetch('/api/vehicles', { credentials: 'same-origin' })]); const [driverPayload, vehiclePayload] = await Promise.all([driverResponse.json().catch(() => ({})), vehicleResponse.json().catch(() => ({}))]); if (!driverResponse.ok) throw new Error(driverPayload.error || 'Could not load driver accounts.'); if (!vehicleResponse.ok) throw new Error(vehiclePayload.error || 'Could not load vehicles.'); setDriverRoster(Array.isArray(driverPayload.drivers) ? driverPayload.drivers : []); setVehicleRoster(Array.isArray(vehiclePayload.vehicles) ? vehiclePayload.vehicles : []); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not load dispatch resources.', 'info'); } };
  const loadFleetData = async () => { setFleetError(''); try { const [vehicleResponse, facilityResponse] = await Promise.all([fetch('/api/vehicles', { credentials: 'same-origin' }), fetch('/api/facilities', { credentials: 'same-origin' })]); const [vehiclePayload, facilityPayload] = await Promise.all([vehicleResponse.json().catch(() => ({})), facilityResponse.json().catch(() => ({}))]); if (!vehicleResponse.ok) throw new Error(vehiclePayload.error || 'Could not load vehicles.'); if (!facilityResponse.ok) throw new Error(facilityPayload.error || 'Could not load facilities.'); setVehicleRoster(Array.isArray(vehiclePayload.vehicles) ? vehiclePayload.vehicles : []); setFacilityRoster(Array.isArray(facilityPayload.facilities) ? facilityPayload.facilities : []); } catch (error) { setFleetError(error instanceof Error ? error.message : 'Could not load fleet data.'); } };
  useEffect(() => { if (activeTab === 'manage' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) void loadDispatchResources(); if (activeTab === 'fleet' && (currentUser?.role === 'admin' || currentUser?.role === 'staff')) void loadFleetData(); }, [activeTab, currentUser?.id, currentUser?.role]);
  const createVehicle = async (event: React.FormEvent) => { event.preventDefault(); setFleetError(''); try { const response = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ ...vehicleForm, capacityKg: Number(vehicleForm.capacityKg) }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not create vehicle.'); setVehicleRoster(prev => [payload.vehicle, ...prev]); setVehicleForm({ identifier: '', type: 'van', capacityKg: '1000', notes: '' }); showToast('Vehicle registered.'); } catch (error) { setFleetError(error instanceof Error ? error.message : 'Could not create vehicle.'); } };
  const updateVehicleStatus = async (id: string, status: string) => { try { const response = await fetch(`/api/vehicles/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not update vehicle.'); setVehicleRoster(prev => prev.map(item => item.id === id ? payload.vehicle : item)); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update vehicle.', 'info'); } };
  const deleteVehicle = async (id: string) => { try { const response = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' }); if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'Could not delete vehicle.'); } setVehicleRoster(prev => prev.filter(item => item.id !== id)); showToast('Vehicle removed from the fleet.'); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not delete vehicle.', 'info'); } };
  const createFacility = async (event: React.FormEvent) => { event.preventDefault(); setFleetError(''); try { const response = await fetch('/api/facilities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(facilityForm) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not create facility.'); setFacilityRoster(prev => [payload.facility, ...prev]); setFacilityForm({ name: '', type: 'warehouse', city: '', country: '', address: '' }); showToast('Facility registered.'); } catch (error) { setFleetError(error instanceof Error ? error.message : 'Could not create facility.'); } };
  const updateFacilityStatus = async (id: string, status: string) => { try { const response = await fetch(`/api/facilities/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not update facility.'); setFacilityRoster(prev => prev.map(item => item.id === id ? payload.facility : item)); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update facility.', 'info'); } };
  const loadBookingRequests = async () => { setBookingLoadError(''); try { const response = await fetch('/api/bookings', { credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not load booking requests.'); setBookingRequests(Array.isArray(payload.bookings) ? payload.bookings : []); } catch (error) { setBookingLoadError(error instanceof Error ? error.message : 'Could not load booking requests.'); } };
  useEffect(() => { if (activeTab === 'bookings') void loadBookingRequests(); }, [activeTab]);
  const recordCustomsDecision = async (shipment: Shipment, cleared: boolean) => {
    const now = new Date().toISOString();
    const nextStatus: ShipmentStatus = cleared ? 'in_transit' : 'exception_hold';
    const description = cleared ? 'Customs clearance recorded by authorized customs staff.' : 'Customs hold recorded. Follow-up and documentation review are required.';
    const checkpoint = { id: `customs-${Date.now()}`, timestamp: now, location: shipment.currentLocation?.description || shipment.originHub?.city || '', city: shipment.currentLocation?.city || shipment.originHub?.city || '', country: shipment.currentLocation?.country || shipment.originHub?.country || '', status: nextStatus, title: cleared ? 'Customs cleared' : 'Customs hold', description, completed: true };
    const customsDetails = shipment.customsDetails ? { ...shipment.customsDetails, status: cleared ? 'cleared' as const : 'inspected' as const } : undefined;
    const updated: Shipment = { ...shipment, status: nextStatus, statusMessage: description, updatedAt: now, customsDetails, checkpoints: [checkpoint, ...(shipment.checkpoints || [])] };
    const saved = await onUpdateShipment(updated);
    if (saved) showToast(cleared ? `${shipment.trackingNumber} cleared for transit.` : `${shipment.trackingNumber} placed on customs hold.` , cleared ? 'success' : 'info');
  };

  const loadAnalytics = async () => { setAnalyticsError(''); try { const response = await fetch('/api/analytics', { credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not load analytics.'); setAnalyticsData(payload); } catch (error) { setAnalyticsError(error instanceof Error ? error.message : 'Could not load analytics.'); } };
  useEffect(() => { if (activeTab === 'analytics') void loadAnalytics(); }, [activeTab]);
  const updateBookingStatus = async (id: string, status: string) => { try { const response = await fetch(`/api/bookings/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not update booking request.'); setBookingRequests(prev => prev.map(item => item.id === id ? payload.booking : item)); showToast(`Booking request updated to ${status}.`); } catch (error) { showToast(error instanceof Error ? error.message : 'Could not update booking request.', 'info'); } };
  const updateSupportStatus = async (id: string, status: string) => {
    try { const response = await fetch(`/api/support/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not update ticket.'); setSupportTickets(prev => prev.map(ticket => ticket.id === id ? payload.ticket : ticket)); showToast(`Support ticket updated to ${status.replaceAll('_', ' ')}.`); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Could not update support ticket.', 'info'); }
  };

  const uploadShipmentDocument = async (shipment: Shipment, file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Choose a document smaller than 5 MB.', 'info'); return; }
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    if (!allowed.has(file.type)) { showToast('Only PDF, JPEG and PNG documents are accepted.', 'info'); return; }
    setUploadingDocumentFor(shipment.id);
    try {
      const response = await fetch(`/api/shipments/${encodeURIComponent(shipment.id)}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Document-Name': file.name.replace(/[^\x20-\x7E]/g, '_'), 'X-Document-Type': file.type }, credentials: 'same-origin', body: file });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not upload shipment document.');
      showToast(`Document attached: ${payload.document.name}`);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not upload document.', 'info'); }
    finally { setUploadingDocumentFor(null); }
  };

  const handleGenerateTrackingNumber = () => {
    const prefixes = ['APX', 'VEX', 'GLO', 'EXP'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const countryCode = destHubCode === 'JFK' ? 'US' : destHubCode === 'LHR' ? 'GB' : destHubCode === 'NRT' ? 'JP' : 'GL';
    setTrackingNumber(`${randomPrefix}-${randomNum}-${countryCode}`);
  };

  const handleFillQuickDemo = () => {
    setTrackingNumber('APX-' + Math.floor(1000 + Math.random() * 9000) + '-US');
    setSenderName('AeroTech Global Systems');
    setSenderCompany('Munich Aviation Logistics Hub');
    setSenderAddress('Terminalstr. Mitte 18');
    setSenderCity('Munich');
    setSenderCountry('Germany');
    setSenderPhone('+49 89 975 00');
    setSenderEmail('dispatch@aerotech-munich.de');

    setReceiverName('Horizon Data Centers Inc.');
    setReceiverCompany('Pacific Gateway Technology Park');
    setReceiverAddress('800 Silicon Parkway, Suite 400');
    setReceiverCity('San Francisco');
    setReceiverCountry('United States');
    setReceiverPhone('+1 (415) 555-0921');
    setReceiverEmail('supplies@horizondatacenters.com');

    setCargoWeight('24.0');
    setCargoPieces('2');
    setCargoDimensions('60 x 40 x 40 cm');
    setCargoType('Optical Fiber Switching Gear & Server Nodes');
    setDeclaredValue('$38,000.00');
    setIsInsured(true);
    setCarrierNotes('Fragile optical calibration. Keep upright during transit.');
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !receiverName || !receiverEmail) {
      alert('Please fill in required Sender Name, Receiver Name, and Receiver Email.');
      return;
    }

    const originHub = GLOBAL_HUBS.find((h) => h.code === originHubCode) || GLOBAL_HUBS[0];
    const destinationHub = GLOBAL_HUBS.find((h) => h.code === destHubCode) || GLOBAL_HUBS[1];

    const now = new Date();
    const estDate = new Date();
    estDate.setDate(now.getDate() + (serviceType === 'express_air' ? 2 : 5));

    const newShipment: Shipment = {
      id: 'shp_' + Math.random().toString(36).substring(2, 9),
      trackingNumber: trackingNumber.toUpperCase().trim(),
      referenceNumber: 'REF-' + Math.floor(100000 + Math.random() * 900000),
      serviceType,
      status: 'manifest_created',
      statusMessage: 'Shipment record created. Carrier assignment and transport arrangements require confirmation.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      estimatedDelivery: estDate.toISOString(),
      originHub,
      destinationHub,
      currentLocation: {
        city: originHub.city,
        country: originHub.country,
        description: `${originHub.name} - Registered`,
        coordinates: originHub.coordinates,
        updatedAt: now.toISOString(),
      },
      sender: {
        name: senderName,
        company: senderCompany,
        address: senderAddress || `${originHub.city} Industrial Park`,
        city: senderCity || originHub.city,
        postalCode: '10001',
        country: senderCountry,
        phone: senderPhone,
        email: senderEmail,
      },
      receiver: {
        name: receiverName,
        company: receiverCompany,
        address: receiverAddress || `${destinationHub.city} Center`,
        city: receiverCity || destinationHub.city,
        postalCode: '90001',
        country: receiverCountry,
        phone: receiverPhone,
        email: receiverEmail,
      },
      packageDetails: {
        weight: parseFloat(cargoWeight) || 10,
        unit: 'kg',
        dimensions: cargoDimensions,
        pieces: parseInt(cargoPieces, 10) || 1,
        cargoType,
        declaredValue,
        currency: 'USD',
        isInsured,
        insurancePolicyNumber: isInsured ? 'POL-APX-' + Math.floor(100000 + Math.random() * 900000) : undefined,
        specialHandling: carrierNotes,
        barcodeNumber: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
      },
      transportVessel: {
        type: 'flight',
        identifier: 'Pending carrier assignment',
        carrier: 'To be confirmed',
      },
      subscribers: [receiverEmail, senderEmail],
      checkpoints: [
        {
          id: 'chk_' + Math.random().toString(36).substring(2, 7),
          timestamp: now.toISOString(),
          location: `${originHub.name}`,
          city: originHub.city,
          country: originHub.country,
          status: 'manifest_created',
          title: 'Air Waybill Created & Registered',
          description: `Consignment registered by shipper. Waybill #${trackingNumber} issued for priority transport to ${destinationHub.city}.`,
          facilityCode: `${originHub.code}-EDI`,
          coordinates: originHub.coordinates,
          completed: true,
        },
      ],
    };

    let emailLog: EmailLog | undefined;
    if (sendWelcomeEmail) {
      emailLog = sendSimulatedEmail(newShipment, 'manifest_created');
    }

    const saved = await onAddShipment(newShipment, emailLog);
    if (!saved) { showToast('Shipment was not saved. Check the server error message and try again.', 'info'); return; }
    showToast(`Shipment #${newShipment.trackingNumber} was saved to the server.${sendWelcomeEmail ? ' A notification preview was logged; no email was sent.' : ''}`);

    // Reset Form
    handleGenerateTrackingNumber();
    setActiveTab('manage');
  };

  // Next status sequence map
  const getNextStatus = (current: ShipmentStatus): { nextStatus: ShipmentStatus; title: string; desc: string } => {
    switch (current) {
      case 'manifest_created':
        return {
          nextStatus: 'picked_up',
          title: 'Consignment Collected by Apex Courier',
          desc: 'Package picked up from shipper premises and checked in at local freight center.',
        };
      case 'picked_up':
        return {
          nextStatus: 'received_at_facility',
          title: 'Received & Processed at Sorting Hub',
          desc: 'Cargo details recorded for operational review; confirm all required inspections before dispatch.',
        };
      case 'received_at_facility':
        return {
          nextStatus: 'in_transit',
          title: 'Departed on International Transit Flight',
          desc: 'Consignment departed origin international airport en route to destination.',
        };
      case 'in_transit':
        return {
          nextStatus: 'customs_clearance',
          title: 'Customs Clearance Approved & Duty Cleared',
          desc: 'Import declaration approved by customs authorities. Ready for local handover.',
        };
      case 'customs_clearance':
        return {
          nextStatus: 'out_for_delivery',
          title: 'Loaded on Courier Van for Delivery Today',
          desc: 'Dispatched with regional delivery courier. Expected delivery today.',
        };
      case 'out_for_delivery':
        return {
          nextStatus: 'delivered',
          title: 'Delivered & Signed by Recipient',
          desc: 'Successfully delivered in good order. Signed digital delivery receipt logged.',
        };
      default:
        return {
          nextStatus: 'delivered',
          title: 'Delivered',
          desc: 'Shipment completed.',
        };
    }
  };

  const handleAdvanceStatus = async (shipment: Shipment) => {
    const next = getNextStatus(shipment.status);
    const now = new Date();

    // Determine current location updates
    let updatedLocation = { ...shipment.currentLocation };
    if (next.nextStatus === 'in_transit') {
      updatedLocation = {
        city: 'International Air Corridor',
        country: 'En Route',
        description: `Transport movement recorded toward ${shipment.destinationHub.city}; carrier details pending confirmation`,
        coordinates: [
          (shipment.originHub.coordinates[0] + shipment.destinationHub.coordinates[0]) / 2,
          (shipment.originHub.coordinates[1] + shipment.destinationHub.coordinates[1]) / 2,
        ],
        updatedAt: now.toISOString(),
      };
    } else if (next.nextStatus === 'customs_clearance' || next.nextStatus === 'received_at_facility') {
      updatedLocation = {
        city: shipment.destinationHub.city,
        country: shipment.destinationHub.country,
        description: `${shipment.destinationHub.name} (Customs Clearance Terminal)`,
        coordinates: shipment.destinationHub.coordinates,
        updatedAt: now.toISOString(),
      };
    } else if (next.nextStatus === 'out_for_delivery') {
      updatedLocation = {
        city: shipment.receiver.city,
        country: shipment.receiver.country,
        description: `Local Courier Van en route to ${shipment.receiver.address}`,
        coordinates: shipment.destinationHub.coordinates,
        updatedAt: now.toISOString(),
      };
    } else if (next.nextStatus === 'delivered') {
      updatedLocation = {
        city: shipment.receiver.city,
        country: shipment.receiver.country,
        description: `Delivered at ${shipment.receiver.address}`,
        coordinates: shipment.destinationHub.coordinates,
        updatedAt: now.toISOString(),
      };
      // Confetti effect!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    const newCheckpoint = {
      id: 'chk_' + Math.random().toString(36).substring(2, 7),
      timestamp: now.toISOString(),
      location: updatedLocation.description,
      city: updatedLocation.city,
      country: updatedLocation.country,
      status: next.nextStatus,
      title: next.title,
      description: next.desc,
      coordinates: updatedLocation.coordinates,
      completed: true,
      signedBy: next.nextStatus === 'delivered' ? shipment.receiver.name : undefined,
    };

    const updatedShipment: Shipment = {
      ...shipment,
      status: next.nextStatus,
      statusMessage: next.desc,
      updatedAt: now.toISOString(),
      currentLocation: updatedLocation,
      actualDelivery: next.nextStatus === 'delivered' ? now.toISOString() : undefined,
      signatureProof:
        next.nextStatus === 'delivered'
          ? {
              signedBy: shipment.receiver.name,
              timestamp: now.toISOString(),
              relation: 'Direct Recipient',
            }
          : shipment.signatureProof,
      checkpoints: [newCheckpoint, ...shipment.checkpoints],
    };

    // Auto trigger notification email
    const emailLog = sendSimulatedEmail(updatedShipment, next.nextStatus);

    const saved = await onUpdateShipment(updatedShipment, emailLog);
    if (!saved) { showToast('Status update was not saved. Check the server error message and try again.', 'info'); return; }
    showToast(`Updated #${shipment.trackingNumber} to "${formatStatusLabel(next.nextStatus)}". Notification preview logged; no email was sent.`);
  };

  // Add custom checkpoint state
  const [customCheckpointTitle, setCustomCheckpointTitle] = useState('');
  const [customCheckpointLocation, setCustomCheckpointLocation] = useState('');
  const [customCheckpointDesc, setCustomCheckpointDesc] = useState('');
  const [customCheckpointStatus, setCustomCheckpointStatus] = useState<ShipmentStatus>('in_transit');

  const handleAddCustomCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentForCheckpoint || !customCheckpointTitle) return;

    const now = new Date();
    const newCheckpoint = {
      id: 'chk_' + Math.random().toString(36).substring(2, 7),
      timestamp: now.toISOString(),
      location: customCheckpointLocation || selectedShipmentForCheckpoint.currentLocation.description,
      city: selectedShipmentForCheckpoint.currentLocation.city,
      country: selectedShipmentForCheckpoint.currentLocation.country,
      status: customCheckpointStatus,
      title: customCheckpointTitle,
      description: customCheckpointDesc || 'Milestone logged by freight administrator.',
      coordinates: selectedShipmentForCheckpoint.currentLocation.coordinates,
      completed: true,
    };

    const updatedShipment: Shipment = {
      ...selectedShipmentForCheckpoint,
      status: customCheckpointStatus,
      statusMessage: customCheckpointDesc || customCheckpointTitle,
      updatedAt: now.toISOString(),
      checkpoints: [newCheckpoint, ...selectedShipmentForCheckpoint.checkpoints],
    };

    const emailLog = sendSimulatedEmail(updatedShipment, customCheckpointStatus, customCheckpointDesc);

    const saved = await onUpdateShipment(updatedShipment, emailLog);
    if (!saved) { showToast('Checkpoint was not saved. Check the server error message and try again.', 'info'); return; }
    showToast('Checkpoint saved to the server. Notification preview logged; no email was sent.');
    setSelectedShipmentForCheckpoint(null);
    setCustomCheckpointTitle('');
    setCustomCheckpointDesc('');
  };

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.receiver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.receiver.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.originHub.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/50 shadow-2xl text-white text-xs font-medium animate-slide-up">
          <div className="p-1 rounded-full bg-amber-500/20 text-amber-400">
            <Send className="w-4 h-4" />
          </div>
          <div>{toastMessage.text}</div>
          <button
            onClick={() => onOpenMailbox()}
            className="ml-2 px-2 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer"
          >
            View In Mailbox &rarr;
          </button>
        </div>
      )}

      {/* Admin Top Navigation & KPI Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {currentUser ? currentUser.roleTitle : 'Operations Control Desk'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Account: {currentUser?.badgeNumber || currentUser?.username || 'Not assigned'}
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-emerald-400 font-medium">
              Workspace: {currentUser?.stationLocation || 'Apex Logistics'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            Operations workspace
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create shipment records, maintain an auditable milestone history, and review notification previews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
          >
            <Package className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Consignment
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Shipments ({shipments.length})
          </button>

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
            <button onClick={() => setActiveTab('emails')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'emails' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <Mail className="w-4 h-4" /> Delivery queue
            </button>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
            <button onClick={() => setActiveTab('fleet')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'fleet' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <Truck className="w-4 h-4" /> Fleet & facilities
            </button>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
            <button onClick={() => setActiveTab('enquiries')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'enquiries' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <Mail className="w-4 h-4" /> Enquiries
            </button>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'customs') && (
            <button onClick={() => setActiveTab('customs')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'customs' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <ShieldCheck className="w-4 h-4" /> Customs queue
            </button>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
            <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'analytics' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <CheckCircle2 className="w-4 h-4" /> Analytics
            </button>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
            <button onClick={() => setActiveTab('bookings')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'bookings' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <Calendar className="w-4 h-4" /> Booking requests
            </button>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
            <button onClick={() => setActiveTab('support')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'support' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
              <ShieldCheck className="w-4 h-4" /> Support inbox
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('personnel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'personnel'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              Staff &amp; Access ({staffAccounts.length})
            </button>
          )}

          <button
            onClick={onOpenMailbox}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
          >
            <Mail className="w-4 h-4 text-amber-400" />
            <span>Notification previews</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
              {emailLogs.length}
            </span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-bold transition-colors cursor-pointer"
              title="Lock dispatch terminal session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Lock Session</span>
            </button>
          )}
        </div>
      </div>

      {/* OPERATIONS OVERVIEW: COMPUTED FROM AUTHENTICATED SERVER RECORDS */}
      {activeTab === 'overview' && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total shipments', value: shipments.length, note: 'Server records loaded for this staff session' },
              { label: 'In progress', value: shipments.filter(item => item.status !== 'delivered').length, note: 'Not marked delivered' },
              { label: 'Exceptions', value: shipments.filter(item => item.status === 'exception_hold').length, note: 'Records currently on hold' },
              { label: 'Delivered', value: shipments.filter(item => item.status === 'delivered').length, note: 'Marked delivered in the system' },
            ].map(metric => <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</div><p className="mt-2 text-xs leading-5 text-slate-500">{metric.note}</p></div>)}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">Recently updated shipments</h2><p className="mt-1 text-xs text-slate-500">Sorted by the latest recorded update.</p></div><button onClick={() => setActiveTab('manage')} className="text-xs font-semibold text-cyan-800">View all</button></div>
              {shipments.length ? <div className="divide-y divide-slate-100">{[...shipments].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()).slice(0,6).map(shipment => <div key={shipment.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"><div><div className="font-mono text-sm font-bold text-slate-950">{shipment.trackingNumber}</div><div className="mt-1 text-xs text-slate-500">{shipment.originHub?.city || 'Origin pending'} → {shipment.destinationHub?.city || 'Destination pending'}</div></div><div className="flex items-center gap-3"><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{formatStatusLabel(shipment.status)}</span><button onClick={() => onTrackShipment(shipment.trackingNumber)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Track</button></div></div>)}</div> : <div className="p-10 text-center"><Package className="mx-auto h-8 w-8 text-slate-300"/><h3 className="mt-3 font-semibold text-slate-950">No server shipments yet</h3><p className="mt-1 text-sm text-slate-600">Create a shipment to begin building the operational record.</p><button onClick={() => setActiveTab('create')} className="mt-4 rounded-lg bg-[#071626] px-4 py-2.5 text-xs font-semibold text-white">Create shipment</button></div>}
            </div>
            <div className="rounded-xl bg-[#071626] p-5 text-white"><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Quick actions</div><h2 className="mt-3 text-xl font-semibold">Keep operations moving.</h2><p className="mt-2 text-sm leading-6 text-slate-300">Create a shipment, record a milestone, or review notification previews.</p><div className="mt-5 space-y-2"><button onClick={() => setActiveTab('create')} className="flex min-h-11 w-full items-center justify-between rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#071626] hover:bg-cyan-200">Create shipment <Plus size={16}/></button><button onClick={() => setActiveTab('manage')} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Manage shipments <ArrowRight size={15}/></button><button onClick={onOpenMailbox} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Notification previews <Mail size={15}/></button></div><p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">Outbound email requires Resend configuration; driver and vehicle assignment is available, while live carrier integrations are not configured.</p></div>
          </div>
        </section>
      )}

      {/* TAB: CREATE NEW SHIPMENT */}
      {activeTab === 'create' && (
        <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Generate New Waybill &amp; Tracking Record
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter shipment details to create a server-backed tracking record and its first milestone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFillQuickDemo}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                ✨ Load Sample Cargo Details
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateShipment} className="space-y-6">
            {/* Tracking Code & Service Level */}
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-200">Location choices are route references, not proof of an Apex-owned facility or confirmed carrier coverage. Confirm availability and handling requirements before promising service to a customer.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tracking Code (AWB Number) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm uppercase focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateTrackingNumber}
                    title="Generate New Code"
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Service Speed Tier
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="express_air">Apex Express Priority Air (1-2 Days)</option>
                  <option value="priority_ocean">Apex Global Maritime Cargo (10-15 Days)</option>
                  <option value="international_freight">International Heavy Freight (3-5 Days)</option>
                  <option value="cold_chain">Pharma &amp; Cold-Chain Priority (Refrigerated)</option>
                  <option value="same_day_courier">Same-Day Dedicated Diplomatic Courier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Origin Departure Hub &rarr; Destination Hub
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={originHubCode}
                    onChange={(e) => setOriginHubCode(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  >
                    {GLOBAL_HUBS.map((h) => (
                      <option key={h.code} value={h.code}>
                        {h.code} - {h.city}
                      </option>
                    ))}
                  </select>
                  <select
                    value={destHubCode}
                    onChange={(e) => setDestHubCode(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  >
                    {GLOBAL_HUBS.map((h) => (
                      <option key={h.code} value={h.code}>
                        {h.code} - {h.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2 Columns: Shipper & Consignee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipper Box */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400 tracking-wider">
                  <User className="w-4 h-4" />
                  Shipper / Sender Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Sender Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Klaus Hoffman"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Company (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. EuroTech Precision"
                      value={senderCompany}
                      onChange={(e) => setSenderCompany(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Sender Address &amp; City</label>
                  <input
                    type="text"
                    placeholder="Street Address, City, Country"
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Sender Email</label>
                    <input
                      type="email"
                      placeholder="shipper@company.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Sender Phone</label>
                    <input
                      type="text"
                      placeholder="+49 69 12345"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Consignee Box */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400 tracking-wider">
                  <User className="w-4 h-4" />
                  Consignee / Receiver Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Receiver Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Sample"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Company (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Mount Sinai Medical"
                      value={receiverCompany}
                      onChange={(e) => setReceiverCompany(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Delivery Address &amp; City</label>
                  <input
                    type="text"
                    placeholder="1425 Madison Ave, New York, NY 10029"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Customer Notification Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="customer@email.com"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Receiver Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (212) 555-0198"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cargo Specs & Declared Value */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                Cargo Specifications &amp; Handling Instructions
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Gross Weight (kg)</label>
                  <input
                    type="text"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Package Pieces</label>
                  <input
                    type="number"
                    min="1"
                    value={cargoPieces}
                    onChange={(e) => setCargoPieces(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Dimensions (L x W x H)</label>
                  <input
                    type="text"
                    value={cargoDimensions}
                    onChange={(e) => setCargoDimensions(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Declared Value</label>
                  <input
                    type="text"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Cargo Classification / Description</label>
                  <input
                    type="text"
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Special Handling / Courier Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Temperature Controlled 2-8°C, Direct Signature"
                    value={carrierNotes}
                    onChange={(e) => setCarrierNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Email automation trigger checkbox */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <label htmlFor="sendWelcomeEmail" className="text-xs text-slate-200 cursor-pointer">
                  <strong className="text-amber-400">Notification preview:</strong> Record a simulated booking notification for <span className="font-mono text-slate-300">{receiverEmail || 'customer email'}</span>. No email is sent by this prototype.
                </label>
              </div>
              <Mail className="w-5 h-5 text-amber-400 hidden sm:block" />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Issue Waybill &amp; Register Consignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MANAGE ACTIVE SHIPMENTS */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search tracking, recipient, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'out_for_delivery', label: 'Out for Delivery' },
                { id: 'in_transit', label: 'In Transit' },
                { id: 'customs_clearance', label: 'Customs' },
                { id: 'delivered', label: 'Delivered' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    filterStatus === f.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Consignments List Cards */}
          <div className="space-y-3">
            {filteredShipments.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No shipments match current filters.</p>
              </div>
            ) : (
              filteredShipments.map((shipment) => {
                const color = getStatusColor(shipment.status);
                const nextAction = getNextStatus(shipment.status);

                return (
                  <div
                    key={shipment.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            onClick={() => onTrackShipment(shipment.trackingNumber)}
                            className="font-mono text-sm font-bold text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{shipment.trackingNumber}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </button>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${color.badgeBg} ${color.text} border ${color.badgeBorder}`}
                          >
                            {formatStatusLabel(shipment.status)}
                          </span>

                          <span className="text-xs text-slate-400 font-medium">
                            {shipment.serviceType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        {/* Origin -> Dest */}
                        <div className="flex items-center gap-3 text-xs text-slate-300">
                          <span className="font-semibold">{shipment.originHub.city} ({shipment.originHub.code})</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className="font-semibold text-emerald-400">{shipment.destinationHub.city} ({shipment.destinationHub.code})</span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-400">Recipient: <strong className="text-slate-200">{shipment.receiver.name}</strong></span>
                        </div>

                        {/* Current milestone message */}
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="text-slate-500">Latest:</span>
                          <span className="text-slate-300 font-medium">{shipment.statusMessage}</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1-Click Advance Status Button */}
                        {shipment.status !== 'delivered' && (
                          <button
                            onClick={() => handleAdvanceStatus(shipment)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Advance: {formatStatusLabel(nextAction.nextStatus)}</span>
                          </button>
                        )}

                        {/* Add Custom Checkpoint */}
                        <button
                          onClick={() => setSelectedShipmentForCheckpoint(shipment)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Checkpoint
                        </button>

                        {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && <label className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">Stop order<input aria-label={`Dispatch stop order for ${shipment.trackingNumber}`} type="number" min="0" max="10000" value={dispatchSequenceDraft[shipment.id] ?? String((shipment as Shipment & { dispatchSequence?: number }).dispatchSequence ?? 0)} onChange={event=>setDispatchSequenceDraft(prev=>({...prev,[shipment.id]:event.target.value}))} onBlur={async event=>{const sequence=Number(event.currentTarget.value);if(Number.isFinite(sequence)&&sequence>=0){const ok=await onAssignDriver(shipment.id,(shipment as Shipment & {assignedDriverId?:string}).assignedDriverId||'',(shipment as Shipment & {assignedVehicleId?:string}).assignedVehicleId||'',sequence);if(ok)showToast('Dispatch stop order saved.');}}} className="w-14 bg-transparent text-xs outline-none"/></label>}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && <label className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300"><Truck className="h-3.5 w-3.5 text-cyan-300"/><select aria-label={`Assign driver for ${shipment.trackingNumber}`} value={(shipment as Shipment & { assignedDriverId?: string }).assignedDriverId || ''} onChange={async event => { const ok = await onAssignDriver(shipment.id, event.target.value, (shipment as Shipment & { assignedVehicleId?: string }).assignedVehicleId || '', Number(dispatchSequenceDraft[shipment.id] ?? (shipment as Shipment & { dispatchSequence?: number }).dispatchSequence ?? 0)); if (ok) showToast(event.target.value ? 'Driver assigned to shipment.' : 'Driver assignment cleared.'); }} className="max-w-36 bg-transparent text-xs outline-none"><option value="">Unassigned driver</option>{driverRoster.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>}

                        {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && <label className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300"><Package className="h-3.5 w-3.5 text-cyan-300"/><select aria-label={`Assign vehicle for ${shipment.trackingNumber}`} value={(shipment as Shipment & { assignedVehicleId?: string }).assignedVehicleId || ''} onChange={async event => { const ok = await onAssignDriver(shipment.id, (shipment as Shipment & { assignedDriverId?: string }).assignedDriverId || '', event.target.value, Number(dispatchSequenceDraft[shipment.id] ?? (shipment as Shipment & { dispatchSequence?: number }).dispatchSequence ?? 0)); if (ok) showToast(event.target.value ? 'Vehicle assigned to shipment.' : 'Vehicle assignment cleared.'); }} className="max-w-36 bg-transparent text-xs outline-none"><option value="">Unassigned vehicle</option>{vehicleRoster.filter(vehicle => vehicle.status === 'active').map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.identifier}</option>)}</select></label>}

                        <label className={`flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 ${uploadingDocumentFor === shipment.id ? 'opacity-50' : 'cursor-pointer'}`} title="Attach PDF, JPEG or PNG document (max 5 MB)">
                          <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={uploadingDocumentFor === shipment.id} className="sr-only" onChange={event => { const file = event.currentTarget.files?.[0]; void uploadShipmentDocument(shipment, file); event.currentTarget.value = ''; }} />
                          <FileText className="h-3.5 w-3.5 text-cyan-300" /> {uploadingDocumentFor === shipment.id ? 'Uploading…' : 'Attach document'}
                        </label>

                        {/* View AWB Document */}
                        <button
                          onClick={() => onViewWaybill(shipment)}
                          title="View Official Air Waybill"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          AWB
                        </button>

                        {/* Track in Viewer */}
                        <button
                          onClick={() => onTrackShipment(shipment.trackingNumber)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                          title="Open shipment tracking view"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Delete (Admin Only) */}
                        {(currentUser?.role === 'admin' || currentUser?.permissions?.canDeleteShipments) && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete shipment #${shipment.trackingNumber}?`)) {
                                void onDeleteShipment(shipment.id).then((deleted) => { if (deleted) showToast(`Shipment #${shipment.trackingNumber} deleted from the server.`); else showToast('Shipment was not deleted. Check the server error message.', 'info'); });
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Shipment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* EMAIL DELIVERY QUEUE */}
      {activeTab === 'emails' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Notification delivery</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Email delivery queue</h2><p className="mt-2 text-sm leading-6 text-slate-600">Opt-in customer milestone emails are queued and retried with backoff. In-app updates remain separate from email delivery.</p></div><button onClick={() => void loadNotificationJobs()} className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14}/> Refresh</button></div>
          <div className={`rounded-xl border p-4 text-sm ${deliveryConfigured ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><strong>{deliveryConfigured ? 'Email provider configured' : 'Email provider not configured'}</strong><p className="mt-1 text-xs leading-5">{deliveryConfigured ? 'Resend is enabled. Delivery is only confirmed when the provider accepts a message.' : 'Set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL on the server to enable outbound email. The application will not mark previews as delivered.'}</p></div>
          {deliveryLoadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{deliveryLoadError}</p>}
          {!deliveryLoadError && notificationJobs.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No opt-in email jobs have been queued.</div> : <div className="space-y-3">{notificationJobs.map(job=><article key={job.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-700">{job.status}</span><span className="text-xs text-slate-500">Attempt {job.attempts}/{job.maxAttempts}</span></div><h3 className="mt-2 break-words font-semibold text-slate-950">{job.subject}</h3><p className="mt-1 break-all text-xs text-slate-500">To: {job.to} · Queued {new Date(job.createdAt).toLocaleString()}</p>{job.sentAt && <p className="mt-1 text-xs text-emerald-700">Provider accepted: {new Date(job.sentAt).toLocaleString()}{job.providerId ? ` · ID ${job.providerId}` : ''}</p>}{job.lastError && <p className="mt-2 break-words text-xs text-rose-700">Last error: {job.lastError}</p>}</div>{job.status !== 'sent' && <button disabled={!deliveryConfigured} onClick={()=>void retryNotificationJob(job.id)} className="min-h-9 shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Retry now</button>}</div></article>)}</div>}
        </section>
      )}

      {/* FLEET AND FACILITIES */}
      {activeTab === 'fleet' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
        <section className="space-y-7 rounded-2xl border border-slate-200 bg-white p-5 md:p-7"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Operational resources</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Fleet & facilities</h2><p className="mt-2 text-sm leading-6 text-slate-600">Maintain the vehicles and facilities recorded in this system. These records do not imply ownership or current real-world availability.</p></div>{fleetError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{fleetError}</p>}
          <div className="grid gap-6 xl:grid-cols-2"><div className="space-y-4"><form onSubmit={createVehicle} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><h3 className="font-semibold text-slate-950 sm:col-span-2">Register a vehicle</h3><label className="text-xs font-semibold text-slate-600">Vehicle identifier<input required maxLength={80} value={vehicleForm.identifier} onChange={e=>setVehicleForm({...vehicleForm,identifier:e.target.value})} placeholder="e.g. VH-014" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Type<select value={vehicleForm.type} onChange={e=>setVehicleForm({...vehicleForm,type:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="van">Van</option><option value="truck">Truck</option><option value="motorbike">Motorbike</option><option value="trailer">Trailer</option><option value="other">Other</option></select></label><label className="text-xs font-semibold text-slate-600">Capacity (kg)<input required type="number" min="1" max="1000000" value={vehicleForm.capacityKg} onChange={e=>setVehicleForm({...vehicleForm,capacityKg:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Notes (optional)<input maxLength={500} value={vehicleForm.notes} onChange={e=>setVehicleForm({...vehicleForm,notes:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><button className="min-h-10 rounded-lg bg-[#071626] px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Add vehicle</button></form><div className="space-y-2">{vehicleRoster.length ? vehicleRoster.map(vehicle=><article key={vehicle.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><div className="font-semibold text-slate-950">{vehicle.identifier}</div><div className="mt-1 text-xs capitalize text-slate-500">{vehicle.type} · {vehicle.capacityKg} kg capacity</div>{vehicle.notes && <p className="mt-1 text-xs text-slate-600">{vehicle.notes}</p>}</div><div className="flex items-center gap-2"><select aria-label={`Vehicle status ${vehicle.identifier}`} value={vehicle.status} onChange={e=>void updateVehicleStatus(vehicle.id,e.target.value)} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="out_of_service">Out of service</option></select>{currentUser?.role === 'admin' && <button onClick={()=>void deleteVehicle(vehicle.id)} className="min-h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700">Delete</button>}</div></article>) : <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No vehicles registered.</p>}</div></div>
          <div className="space-y-4"><form onSubmit={createFacility} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><h3 className="font-semibold text-slate-950 sm:col-span-2">Register a facility</h3><label className="text-xs font-semibold text-slate-600">Facility name<input required maxLength={120} value={facilityForm.name} onChange={e=>setFacilityForm({...facilityForm,name:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Type<select value={facilityForm.type} onChange={e=>setFacilityForm({...facilityForm,type:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="warehouse">Warehouse</option><option value="hub">Hub</option><option value="customs">Customs facility</option><option value="cross_dock">Cross-dock</option><option value="office">Office</option><option value="other">Other</option></select></label><label className="text-xs font-semibold text-slate-600">City<input required maxLength={120} value={facilityForm.city} onChange={e=>setFacilityForm({...facilityForm,city:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Country<input required maxLength={120} value={facilityForm.country} onChange={e=>setFacilityForm({...facilityForm,country:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Address (optional)<input maxLength={240} value={facilityForm.address} onChange={e=>setFacilityForm({...facilityForm,address:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><button className="min-h-10 rounded-lg bg-[#071626] px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Add facility</button></form><div className="space-y-2">{facilityRoster.length ? facilityRoster.map(facility=><article key={facility.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><div className="font-semibold text-slate-950">{facility.name}</div><div className="mt-1 text-xs capitalize text-slate-500">{facility.type.replaceAll('_',' ')} · {facility.city}, {facility.country}</div>{facility.address && <p className="mt-1 text-xs text-slate-600">{facility.address}</p>}</div><select aria-label={`Facility status ${facility.name}`} value={facility.status} onChange={e=>void updateFacilityStatus(facility.id,e.target.value)} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="active">Active</option><option value="limited">Limited</option><option value="closed">Closed</option></select></article>) : <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No facilities registered.</p>}</div></div></div>
        </section>
      )}

      {/* PUBLIC CONTACT ENQUIRIES */}
      {activeTab === 'enquiries' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-7"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Inbound requests</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Contact enquiries</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review public website submissions. Status updates are saved and audited; no reply email is sent by this application.</p></div>
          {contactLoadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{contactLoadError}</p>}
          {!contactLoadError && contactRequests.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No contact enquiries have been submitted.</div> : <div className="space-y-3">{contactRequests.map(request => <article key={request.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-slate-900">{request.reference}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-700">{request.status}</span></div><h3 className="mt-2 font-semibold text-slate-950">{request.inquiryType}</h3><p className="mt-1 text-xs text-slate-500">{request.name} · {request.email}{request.shipmentReference ? ` · Ref ${request.shipmentReference}` : ''} · {new Date(request.createdAt).toLocaleString()}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message}</p></div><label className="shrink-0 text-xs font-semibold text-slate-600">Status<select aria-label={`Update status for ${request.reference}`} value={request.status} onChange={event => void updateContactStatus(request.id, event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="received">Received</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div></article>)}</div>}
        </section>
      )}

      {/* CUSTOMS CLEARANCE QUEUE */}
      {activeTab === 'customs' && (currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'customs') && (<div className="space-y-6"><CustomsCases canEdit={currentUser?.role === 'admin' || currentUser?.role === 'customs'} shipments={shipments.map(sh => ({ id: sh.id, trackingNumber: sh.trackingNumber }))} />
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-7"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Clearance workflow</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Customs queue</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review shipments awaiting clearance or already marked for inspection. Decisions are recorded as shipment events and audit entries. Confirm local requirements before clearing a shipment.</p></div>
          {(() => { const queue = shipments.filter(shipment => shipment.status === 'customs_clearance' || ['pending', 'inspected'].includes(shipment.customsDetails?.status || '')); return queue.length ? <div className="space-y-3">{queue.map(shipment => <article key={shipment.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-slate-950">{shipment.trackingNumber}</span><span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{shipment.customsDetails?.status || 'clearance required'}</span></div><h3 className="mt-2 font-semibold text-slate-900">{shipment.originHub?.city || 'Origin pending'} → {shipment.destinationHub?.city || 'Destination pending'}</h3><p className="mt-1 text-sm text-slate-600">Consignee: {shipment.receiver?.name || 'Not specified'} · {shipment.packageDetails?.pieces || 1} piece(s) · {shipment.packageDetails?.weight ?? 'Weight not recorded'} {shipment.packageDetails?.unit || 'kg'}</p><p className="mt-2 text-sm leading-6 text-slate-700">{shipment.statusMessage || 'Review documents and shipment details before recording a decision.'}</p><p className="mt-2 text-xs text-slate-500">Declaration: {shipment.customsDetails?.declarationNumber || 'Not recorded'}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void recordCustomsDecision(shipment, true)} className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Clear for transit</button><button onClick={() => void recordCustomsDecision(shipment, false)} className="min-h-10 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100">Place on hold</button><button onClick={() => onViewWaybill(shipment)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileText size={14}/> View waybill</button></div></div></article>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No shipments are currently in the customs queue.</div>; })()}
        </section>
      </div>)}

      {/* ANALYTICS WORKSPACE */}
      {activeTab === 'analytics' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Operational intelligence</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Analytics overview</h2><p className="mt-2 text-sm leading-6 text-slate-600">Aggregates are calculated from records currently stored by this API. No estimates or external network statistics are added.</p></div><button onClick={() => void loadAnalytics()} className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14}/> Refresh</button></div>
          {analyticsError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{analyticsError}</p>}
          {!analyticsError && !analyticsData && <p role="status" className="rounded-xl border border-slate-200 p-8 text-sm text-slate-600">Loading analytics…</p>}
          {analyticsData && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Total shipments',key:'shipments'},{label:'In progress',key:'inTransit'},{label:'Delivered',key:'delivered'},{label:'Exceptions',key:'exceptions'},{label:'Customs queue',key:'customsQueue'},{label:'Quote requests',key:'quotes'},{label:'Open bookings',key:'bookingRequests'},{label:'Open support tickets',key:'openSupportTickets'}].map(item=><div key={item.key} className="rounded-xl border border-slate-200 p-4"><div className="text-xs text-slate-500">{item.label}</div><div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{analyticsData.totals[item.key] ?? 0}</div></div>)}</div>
          <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-950">Shipment status distribution</h3><p className="mt-1 text-xs text-slate-500">Counts from current shipment records</p><div className="mt-5 space-y-4">{Object.entries(analyticsData.statusCounts).length ? Object.entries(analyticsData.statusCounts).map(([status,rawCount])=>{const count=Number(rawCount);const total=Math.max(1,analyticsData.totals.shipments||0);return <div key={status}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="capitalize text-slate-700">{status.replaceAll('_',' ')}</span><strong className="text-slate-950">{count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-700" style={{width:`${Math.min(100,count/total*100)}%`}}/></div></div>}) : <p className="text-sm text-slate-500">No shipment records to summarize.</p>}</div></section>
          <section className="rounded-xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-950">Service mix</h3><p className="mt-1 text-xs text-slate-500">Counts from current shipment records</p><div className="mt-5 space-y-4">{Object.entries(analyticsData.serviceCounts).length ? Object.entries(analyticsData.serviceCounts).map(([service,rawCount])=>{const count=Number(rawCount);const total=Math.max(1,analyticsData.totals.shipments||0);return <div key={service}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="capitalize text-slate-700">{service.replaceAll('_',' ')}</span><strong className="text-slate-950">{count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{width:`${Math.min(100,count/total*100)}%`}}/></div></div>}) : <p className="text-sm text-slate-500">No service records to summarize.</p>}</div></section></div><p className="text-xs text-slate-400">Data refreshed {new Date(analyticsData.generatedAt).toLocaleString()}.</p></>}
        </section>
      )}

      {/* BOOKING REQUEST WORKSPACE */}
      {activeTab === 'bookings' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
          <div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Quote conversion</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Booking requests</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review quote conversions and update their status. Confirmed here means the request is accepted internally; collection and route availability still require operational validation.</p></div>
          {bookingLoadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{bookingLoadError}</p>}
          {!bookingLoadError && bookingRequests.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No customer booking requests yet.</div> : <div className="space-y-3">{bookingRequests.map(booking => <article key={booking.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-slate-900">{booking.reference}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-700">{booking.status}</span></div><h3 className="mt-2 font-semibold text-slate-950">{booking.origin} → {booking.destination}</h3><p className="mt-1 text-xs text-slate-500">{booking.customerEmail} · Quote {booking.quoteReference} · {booking.weight} kg · {booking.servicePreference || 'Help me choose'} · {new Date(booking.createdAt).toLocaleString()}</p><p className="mt-2 text-sm leading-6 text-slate-700">{booking.cargoDescription || 'No cargo description supplied.'}</p></div><label className="shrink-0 text-xs font-semibold text-slate-600">Update status<select aria-label={`Update status for ${booking.reference}`} value={booking.status} onChange={event => void updateBookingStatus(booking.id, event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="requested">Requested</option><option value="reviewing">Reviewing</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></label></div></article>)}</div>}
        </section>
      )}

      {/* SUPPORT TICKET WORKSPACE */}
      {activeTab === 'support' && (currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
          <div><div className="text-xs font-bold uppercase tracking-[.16em] text-cyan-800">Customer care</div><h2 className="mt-2 text-2xl font-semibold text-slate-950">Support inbox</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review account-linked requests and update their lifecycle. This queue does not send email notifications.</p></div>
          {supportLoadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{supportLoadError}</p>}
          {!supportLoadError && supportTickets.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No support tickets have been submitted.</div> : <div className="space-y-3">{supportTickets.map(ticket => <article key={ticket.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-slate-900">{ticket.reference}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-700">{ticket.status.replaceAll('_',' ')}</span></div><h3 className="mt-2 font-semibold text-slate-950">{ticket.subject}</h3><p className="mt-1 text-xs text-slate-500">{ticket.customerEmail} · {ticket.category}{ticket.trackingNumber ? ` · ${ticket.trackingNumber}` : ''} · {new Date(ticket.createdAt).toLocaleString()}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.message}</p></div><label className="shrink-0 text-xs font-semibold text-slate-600">Status<select aria-label={`Update status for ${ticket.reference}`} value={ticket.status} onChange={event => void updateSupportStatus(ticket.id, event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div></article>)}</div>}
        </section>
      )}

      {/* TAB 3: SECURITY & PERSONNEL ACCESS MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'personnel' && currentUser?.role === 'admin' && (
        <div className="space-y-6">
          <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Authorized Personnel &amp; Terminal Access Control
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage staff accounts through the server, assign roles, and reset passwords. Use unique passwords of at least 14 characters.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Staff accounts: {staffAccounts.length}</span>
              </div>
            </div>

            {/* Officer Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {staffAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold flex items-center justify-center text-sm">
                        {acc.avatarInitials || acc.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{acc.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {acc.username}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        acc.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : acc.role === 'customs'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {acc.role}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="text-slate-300 font-medium text-[11px]">{acc.roleTitle}</div>
                    <div className="text-slate-500 text-[10px] font-mono">Badge: {acc.badgeNumber}</div>
                    <div className="text-slate-400 text-[10px]">Station: {acc.stationLocation}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {acc.active ? 'Active' : 'Disabled'}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedOfficerForPasswordReset(acc.id);
                        setUpdatedPasskeyInput('');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Reset password</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Change Passkey Form if Selected */}
            {selectedOfficerForPasswordReset && (
              <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    <span>Reset password for Officer ID: {selectedOfficerForPasswordReset}</span>
                  </div>
                  <button
                    onClick={() => setSelectedOfficerForPasswordReset(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    placeholder="Enter new secure passkey"
                    value={updatedPasskeyInput}
                    onChange={(e) => setUpdatedPasskeyInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => {
                      if (!updatedPasskeyInput.trim()) {
                        alert('Please enter a valid passkey.');
                        return;
                      }
                      if (updatedPasskeyInput.length < 14) { alert('Use a password with at least 14 characters.'); return; }
                      void fetch(`/api/users/${encodeURIComponent(selectedOfficerForPasswordReset)}/password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ password: updatedPasskeyInput }) })
                        .then(async response => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Password update failed.'); await loadStaffAccounts(); setSelectedOfficerForPasswordReset(null); setUpdatedPasskeyInput(''); showToast('Staff password updated on the server.'); })
                        .catch(error => alert(error instanceof Error ? error.message : 'Password update failed.'));
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Save New Passkey
                  </button>
                </div>
              </div>
            )}

            {/* Register New Officer Form */}
            <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Create staff account
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newStaffName.trim() || !newStaffEmail.trim() || newStaffPasskey.length < 14) { alert('Provide a name, work email, and password of at least 14 characters.'); return; }
                  try {
                    const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name: newStaffName.trim(), email: newStaffEmail.trim(), password: newStaffPasskey, role: newStaffRole }) });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(payload.error || 'Failed to register staff account.');
                    await loadStaffAccounts(); setNewStaffName(''); setNewStaffEmail(''); setNewStaffPasskey(''); showToast(`Staff account for ${newStaffName} created on the server.`);
                  } catch (error) { alert(error instanceof Error ? error.message : 'Failed to register staff account.'); }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Full name *</label>
                    <input type="text" required maxLength={120} placeholder="Account holder name" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Account role *</label>
                    <select required value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as StaffRole)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none">
                      <option value="staff">Operations staff</option><option value="admin">Administrator</option><option value="customs">Customs operations</option><option value="customer">Customer portal user</option><option value="driver">Delivery driver</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Email address (sign-in) *</label>
                    <input type="email" required maxLength={160} autoComplete="off" placeholder="account@company.com" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Temporary password * (14+ characters)</label>
                    <input type="password" required minLength={14} maxLength={1024} autoComplete="new-password" placeholder="Create a unique password" value={newStaffPasskey} onChange={e => setNewStaffPasskey(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Create account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CHECKPOINT MODAL */}
      {selectedShipmentForCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Add shipment checkpoint event
                </h3>
                <p className="text-xs text-amber-400 font-mono">
                  Consignment #{selectedShipmentForCheckpoint.trackingNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedShipmentForCheckpoint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddCustomCheckpoint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status Category
                </label>
                <select
                  value={customCheckpointStatus}
                  onChange={(e) => setCustomCheckpointStatus(e.target.value as ShipmentStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="in_transit">In Transit / Vessel Movement</option>
                  <option value="received_at_facility">Received at Intermediate Sorting Hub</option>
                  <option value="customs_clearance">Customs Inspection / Clearance</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered &amp; Signed</option>
                  <option value="exception_hold">⚠️ Exception / Weather Delay / On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scanned into Regional Courier Depot"
                  value={customCheckpointTitle}
                  onChange={(e) => setCustomCheckpointTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location / Facility Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terminal 2 Logistics Center, JFK"
                  value={customCheckpointLocation}
                  onChange={(e) => setCustomCheckpointLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Activity Details &amp; Courier Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed notes explaining checkpoint progress..."
                  value={customCheckpointDesc}
                  onChange={(e) => setCustomCheckpointDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>
                  Adding this checkpoint will automatically trigger an email notification to{' '}
                  <strong className="text-white">{selectedShipmentForCheckpoint.receiver.email}</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedShipmentForCheckpoint(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Publish Checkpoint &amp; Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
