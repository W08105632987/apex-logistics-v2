import { AuthUser, AuthSession, StaffRole } from '../types';

const emptySession = (): AuthSession => ({ user: null, isAuthenticated: false, loginTime: null, expiresAt: null });

/** Authentication is intentionally server-backed. Browser storage is not an authority for staff access. */
export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string; expiresAt?: number }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: payload.error || (response.status === 404 ? 'The authentication API is not running. Start the API server and try again.' : 'Sign-in failed. Check your credentials and try again.') };
    }
    const raw = payload.user;
    const role: StaffRole = raw.role === 'admin' ? 'admin' : raw.role === 'customs' ? 'customs' : raw.role === 'customer' ? 'customer' : raw.role === 'driver' ? 'driver' : 'staff';
    const user: AuthUser = {
      id: raw.id,
      username: raw.email,
      name: raw.name,
      role,
      roleTitle: role === 'admin' ? 'Administrator' : role === 'customs' ? 'Customs operations' : role === 'customer' ? 'Customer portal' : role === 'driver' ? 'Delivery driver' : 'Operations staff',
      badgeNumber: '',
      stationLocation: 'Apex Logistics',
      token: '', // Session is an HTTP-only cookie; JavaScript cannot read it.
      lastLogin: new Date().toISOString(),
      avatarInitials: String(raw.name || 'A').split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(),
      permissions: {
        canCreateShipments: role === 'admin' || role === 'staff',
        canUpdateCheckpoints: role === 'staff' || role === 'admin' || role === 'customs',
        canDeleteShipments: role === 'admin',
        canBroadcastEmails: role === 'admin' || role === 'staff',
        canManageStaff: role === 'admin',
        canClearCustoms: role === 'admin' || role === 'customs',
      },
    };
    return { success: true, user, expiresAt: payload.expiresAt ? new Date(payload.expiresAt).getTime() : Date.now() + 8 * 60 * 60 * 1000 };
  } catch {
    return { success: false, error: 'Could not reach the authentication API. Ensure the backend is running and try again.' };
  }
}

/** The server validates its HTTP-only cookie; no authentication token is persisted in browser storage. */
export function getCurrentSession(): AuthSession { return emptySession(); }

export async function restoreServerSession(): Promise<AuthSession> {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!response.ok) return emptySession();
    const payload = await response.json();
    const raw = payload.user;
    const role: StaffRole = raw.role === 'admin' ? 'admin' : raw.role === 'customs' ? 'customs' : raw.role === 'customer' ? 'customer' : raw.role === 'driver' ? 'driver' : 'staff';
    const user: AuthUser = {
      id: raw.id, username: raw.email, name: raw.name, role,
      roleTitle: role === 'admin' ? 'Administrator' : role === 'customs' ? 'Customs operations' : role === 'customer' ? 'Customer portal' : role === 'driver' ? 'Delivery driver' : 'Operations staff',
      badgeNumber: '', stationLocation: 'Apex Logistics', token: '', lastLogin: new Date().toISOString(),
      avatarInitials: String(raw.name || 'A').split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(),
      permissions: { canCreateShipments: role === 'admin' || role === 'staff', canUpdateCheckpoints: role === 'staff' || role === 'admin' || role === 'customs', canDeleteShipments: role === 'admin', canBroadcastEmails: role === 'admin' || role === 'staff', canManageStaff: role === 'admin', canClearCustoms: role === 'admin' || role === 'customs' },
    };
    return { user, isAuthenticated: true, loginTime: new Date().toISOString(), expiresAt: payload.expiresAt ? new Date(payload.expiresAt).getTime() : null };
  } catch { return emptySession(); }
}


export async function logoutUser(): Promise<void> {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); }
  finally { /* The server clears its HTTP-only cookie. */ }
}

// Staff management must be performed by authorized server endpoints; local account creation is disabled.
export interface StaffAccountSummary {
  id: string; username: string; badgeNumber: string; email: string; name: string; role: StaffRole;
  roleTitle: string; stationLocation: string; avatarInitials: string; passwordHash?: string;
}
export function getStoredAccounts(): StaffAccountSummary[] { return []; }
export function createStaffAccount(_newAccount: Omit<StaffAccountSummary, 'id'>): { success: boolean; error?: string } {
  return { success: false, error: 'Staff account management must be connected to the authenticated backend before it can be used.' };
}
export function updateAccountPasskey(_userId: string, _newPasskey: string): { success: boolean; error?: string } {
  return { success: false, error: 'Password changes must be completed through the authenticated backend.' };
}
