import 'dotenv/config';
import express from 'express';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, migrate, loadAll, saveDiff } from './db/mysql.mjs';

const scrypt = promisify(scryptCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.APEX_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'apex-data.json');
const DATA_BACKUP_FILE = path.join(DATA_DIR, 'apex-data.backup.json');
const PORT = Number(process.env.API_PORT || 4000);
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = 'apex_session';
const app = express();
// Behind nginx/Caddy/a host's proxy, set TRUST_PROXY_HOPS=1 so rate limits use the real visitor IP, not the proxy's.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 0);
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

let store = { users: [], shipments: [], events: [], quotes: [], bookings: [], supportTickets: [], notifications: [], documents: [], savedAddresses: [], vehicles: [], facilities: [], notificationJobs: [], contactRequests: [], auditLogs: [], customsCases: [] };
let writeQueue = Promise.resolve();
const DATABASE_URL = process.env.DATABASE_URL || '';
const USE_MYSQL = /^mysql:\/\//i.test(DATABASE_URL);
const dbPool = USE_MYSQL ? createPool(DATABASE_URL) : null;
const dbSnapshot = {};
const loginAttempts = new Map();
const publicRateBuckets = new Map();

async function persist() {
  if (USE_MYSQL) { writeQueue = writeQueue.catch(() => {}).then(() => saveDiff(dbPool, store, dbSnapshot)); return writeQueue; }
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const temp = `${DATA_FILE}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
    // Preserve the last committed snapshot so a damaged JSON file is recoverable.
    try { await copyFile(DATA_FILE, DATA_BACKUP_FILE); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await rename(temp, DATA_FILE);
  });
  return writeQueue;
}
async function loadStore() {
  if (USE_MYSQL) { await migrate(dbPool); await loadAll(dbPool, store, dbSnapshot); return; }
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    for (const key of Object.keys(store)) store[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
  } catch (error) {
    if (error.code === 'ENOENT') { await persist(); return; }
    // If the primary snapshot is corrupt, attempt recovery from the previous committed copy.
    try {
      const backup = JSON.parse(await readFile(DATA_BACKUP_FILE, 'utf8'));
      for (const key of Object.keys(store)) store[key] = Array.isArray(backup[key]) ? backup[key] : [];
      await writeFile(DATA_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
      console.error('Recovered application data from the last backup snapshot. Verify recent records before resuming operations.');
    } catch (backupError) {
      if (backupError.code === 'ENOENT') throw error;
      throw new Error(`Primary data file and backup are unreadable. Restore from a verified backup before starting. (${backupError.message})`);
    }
  }
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(key).toString('hex') };
}
async function verifyPassword(password, user) {
  const candidate = await hashPassword(password, user.passwordSalt);
  return safeEqual(candidate.hash, user.passwordHash);
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}
function audit(actor, action, entity, entityId, details = {}) {
  store.auditLogs.unshift({ id: randomBytes(12).toString('hex'), actorId: actor?.id || null, action, entity, entityId, details, createdAt: new Date().toISOString() });
  store.auditLogs = store.auditLogs.slice(0, 10000);
}

function enqueueEmailNotification(user, subject, textBody, metadata = {}) {
  if (user.notificationPreferences?.emailUpdatesEnabled !== true) return;
  store.notificationJobs.unshift({ id: randomBytes(12).toString('hex'), recipientUserId: user.id, to: String(user.email || '').toLowerCase(), subject: cleanText(subject, 180), text: cleanText(textBody, 3000), metadata, status: 'queued', attempts: 0, maxAttempts: 5, nextAttemptAt: new Date().toISOString(), createdAt: new Date().toISOString(), lastError: null, providerId: null, sentAt: null });
  store.notificationJobs = store.notificationJobs.slice(0, 10000);
}
function notifyCustomerAccount(user, reference, title, message, metadata = {}) {
  if (!user || !user.active || user.role !== 'customer') return;
  const createdAt = new Date().toISOString();
  if (user.notificationPreferences?.inAppUpdatesEnabled !== false) store.notifications.unshift({ id: randomBytes(12).toString('hex'), userId: user.id, customerEmail: String(user.email).toLowerCase(), shipmentId: metadata.shipmentId || null, trackingNumber: metadata.trackingNumber || null, reference, title: cleanText(title, 160), message: cleanText(message, 500), readAt: null, createdAt });
  enqueueEmailNotification(user, `${title} · ${reference}`, `${message}

Reference: ${reference}`, metadata);
  store.notifications = store.notifications.slice(0, 20000);
}
function createCustomerNotifications(shipment, title, message) {
  const emails = new Set([shipment.sender?.email, shipment.receiver?.email].map(value => String(value || '').toLowerCase()).filter(Boolean));
  const recipients = store.users.filter(user => user.active && user.role === 'customer' && emails.has(String(user.email || '').toLowerCase()));
  for (const user of recipients) notifyCustomerAccount(user, shipment.trackingNumber, title, message, { type: 'shipment_update', shipmentId: shipment.id, trackingNumber: shipment.trackingNumber });
}
let processingNotificationQueue = false;
async function processNotificationQueue() {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from || processingNotificationQueue) return;
  processingNotificationQueue = true;
  try {
    const now = Date.now();
    const jobs = store.notificationJobs.filter(job => ['queued', 'retrying'].includes(job.status) && job.attempts < job.maxAttempts && new Date(job.nextAttemptAt).getTime() <= now).slice(0, 10);
    for (const job of jobs) {
      job.status = 'sending'; job.attempts += 1; await persist();
      try {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [job.to], subject: job.subject, text: job.text }), signal: AbortSignal.timeout(10_000) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(cleanText(payload.message || payload.error || `Email provider returned HTTP ${response.status}.`, 500));
        job.status = 'sent'; job.providerId = cleanText(payload.id, 160) || null; job.sentAt = new Date().toISOString(); job.lastError = null;
      } catch (error) {
        job.lastError = cleanText(error instanceof Error ? error.message : 'Email delivery failed.', 500);
        if (job.attempts >= job.maxAttempts) job.status = 'failed';
        else { job.status = 'retrying'; job.nextAttemptAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 30_000 * (2 ** (job.attempts - 1)))).toISOString(); }
      }
      await persist();
    }
  } finally { processingNotificationQueue = false; }
}
function auth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Authentication required.' });
  const user = store.users.find(item => item.id === payload.sub && item.active);
  if (!user || payload.ver !== (user.sessionVersion || 0)) return res.status(401).json({ error: 'Session is no longer valid.' });
  req.user = user;
  req.authPayload = payload;
  next();
}
function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission to perform this action.' });
}
function cleanText(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function isValidEmail(value) { return typeof value === 'string' && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
function rateLimitPublic(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = String(req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const bucket = publicRateBuckets.get(key) || { count: 0, start: now };
    if (now - bucket.start >= windowMs) { bucket.count = 0; bucket.start = now; }
    bucket.count += 1; publicRateBuckets.set(key, bucket);
    // Bound memory use when the API is exposed to many unique source IPs.
    if (publicRateBuckets.size > 5000) {
      for (const [bucketKey, value] of publicRateBuckets) {
        if (now - value.start > windowMs * 2) publicRateBuckets.delete(bucketKey);
        if (publicRateBuckets.size <= 4000) break;
      }
    }
    if (bucket.count > maxRequests) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    next();
  };
}

function rateLimitLogin(req, res, next) {
  const key = `${req.ip}:${cleanText(req.body?.email, 160).toLowerCase()}`;
  const entry = loginAttempts.get(key) || { count: 0, start: Date.now() };
  if (Date.now() - entry.start > 15 * 60 * 1000) { entry.count = 0; entry.start = Date.now(); }
  if (entry.count >= 10) return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  entry.count += 1; loginAttempts.set(key, entry);
  if (loginAttempts.size > 5000) {
    const now = Date.now();
    for (const [attemptKey, value] of loginAttempts) {
      if (now - value.start > 30 * 60 * 1000) loginAttempts.delete(attemptKey);
      if (loginAttempts.size <= 4000) break;
    }
  }
  next();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'apex-logistics-api', time: new Date().toISOString() }));
app.post('/api/auth/login', rateLimitLogin, async (req, res) => {
  const email = cleanText(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password || password.length > 1024) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = store.users.find(item => item.email === email && item.active);
  const valid = user ? await verifyPassword(password, user) : false;
  if (!valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const now = Math.floor(Date.now() / 1000);
  const token = sign({ sub: user.id, ver: user.sessionVersion || 0, iat: now, exp: now + SESSION_TTL_SECONDS, nonce: randomBytes(8).toString('hex') });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: SESSION_TTL_SECONDS * 1000, path: '/' });
  audit(user, 'auth.login', 'user', user.id);
  await persist();
  res.json({ user: publicUser(user), expiresAt: new Date((now + SESSION_TTL_SECONDS) * 1000).toISOString() });
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); res.status(204).end(); });
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user), expiresAt: new Date(req.authPayload.exp * 1000).toISOString() }));

app.get('/api/tracking/:trackingNumber', rateLimitPublic(90, 60 * 1000), (req, res) => {
  const trackingNumber = cleanText(req.params.trackingNumber, 80).toUpperCase();
  const shipment = store.shipments.find(item => String(item.trackingNumber || '').toUpperCase() === trackingNumber);
  if (!shipment) return res.status(404).json({ error: 'No shipment was found for that tracking number.' });
  const events = store.events
    .filter(event => event.shipmentId === shipment.id && event.visibility === 'public')
    .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
    // Never expose internal actor IDs, facility IDs, or persistence metadata publicly.
    .map(({ id, eventType, description, occurredAt, location }) => ({ id, eventType, description, occurredAt, location: location || '' }));
  res.json({ shipment: { trackingNumber: shipment.trackingNumber, status: shipment.status, origin: shipment.origin, destination: shipment.destination, serviceType: shipment.serviceType, estimatedDelivery: shipment.estimatedDelivery || null, lastUpdatedAt: shipment.updatedAt || shipment.createdAt }, events });
});
app.post('/api/contact', rateLimitPublic(10, 60 * 1000), async (req, res) => {
  const name = cleanText(req.body?.name, 120); const email = cleanText(req.body?.email, 160).toLowerCase();
  const inquiryType = cleanText(req.body?.inquiryType, 80); const reference = cleanText(req.body?.reference, 100); const message = cleanText(req.body?.message, 4000);
  if (!name || !isValidEmail(email) || message.length < 8) return res.status(400).json({ error: 'Provide your name, a valid email and a message of at least 8 characters.' });
  const request = { id: randomBytes(12).toString('hex'), reference: `APC-${randomBytes(4).toString('hex').toUpperCase()}`, name, email, inquiryType, shipmentReference: reference, message, status: 'received', createdAt: new Date().toISOString() };
  store.contactRequests.unshift(request); await persist(); res.status(201).json({ reference: request.reference, status: request.status });
});
app.get('/api/contact', auth, allow('admin', 'operations'), (_req, res) => res.json({ contactRequests: store.contactRequests }));
app.patch('/api/contact/:id/status', auth, allow('admin', 'operations'), async (req, res) => { const request = store.contactRequests.find(item => item.id === req.params.id); if (!request) return res.status(404).json({ error: 'Contact request not found.' }); const status = cleanText(req.body?.status, 30); if (!['received', 'reviewing', 'resolved', 'closed'].includes(status)) return res.status(400).json({ error: 'Choose a valid enquiry status.' }); request.status = status; request.updatedAt = new Date().toISOString(); audit(req.user, 'contact_request.status_changed', 'contact_request', request.id, { status }); await persist(); res.json({ contactRequest: request }); });

app.post('/api/quotes', rateLimitPublic(10, 60 * 1000), async (req, res) => {
  const origin = cleanText(req.body?.origin, 120); const destination = cleanText(req.body?.destination, 120);
  const cargoDescription = cleanText(req.body?.cargoDescription, 500); const servicePreference = cleanText(req.body?.servicePreference, 80) || 'Help me choose'; const email = cleanText(req.body?.email, 160).toLowerCase();
  const weight = Number(req.body?.weight);
  if (!origin || !destination || !Number.isFinite(weight) || weight <= 0 || weight > 1000000 || !isValidEmail(email)) return res.status(400).json({ error: 'Provide valid origin, destination, weight and contact email.' });
  const quote = { id: randomBytes(12).toString('hex'), reference: `APQ-${randomBytes(4).toString('hex').toUpperCase()}`, origin, destination, cargoDescription, servicePreference, weight, email, status: 'requested', createdAt: new Date().toISOString() };
  store.quotes.unshift(quote); await persist();
  res.status(201).json({ quote: { ...quote, price: null, message: 'Request saved for authorized staff review. No automatic email has been sent; pricing and availability require confirmation.' } });
});

app.get('/api/users', auth, allow('admin'), (_req, res) => res.json({ users: store.users.map(publicUser) }));
app.post('/api/users', auth, allow('admin'), async (req, res) => {
  const name = cleanText(req.body?.name, 120);
  const email = cleanText(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const requestedRole = cleanText(req.body?.role, 40);
  const role = requestedRole === 'staff' ? 'operations' : requestedRole;
  if (!name || !isValidEmail(email) || password.length < 10 || !['admin', 'operations', 'customs', 'customer', 'driver'].includes(role)) return res.status(400).json({ error: 'Provide a name, valid email, password of at least 10 characters, and an allowed role.' });
  if (store.users.some(user => user.email === email)) return res.status(409).json({ error: 'An account with that email already exists.' });
  const credentials = await hashPassword(password);
  const user = { id: randomBytes(12).toString('hex'), name, email, role, active: true, passwordSalt: credentials.salt, passwordHash: credentials.hash, sessionVersion: 0, createdAt: new Date().toISOString() };
  store.users.push(user); audit(req.user, 'user.created', 'user', user.id, { role }); await persist(); res.status(201).json({ user: publicUser(user) });
});
app.patch('/api/users/:id/password', auth, allow('admin'), async (req, res) => {
  const user = store.users.find(item => item.id === req.params.id);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!user) return res.status(404).json({ error: 'Staff account not found.' });
  if (password.length < 14) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
  const credentials = await hashPassword(password); user.passwordSalt = credentials.salt; user.passwordHash = credentials.hash; user.sessionVersion = (user.sessionVersion || 0) + 1; audit(req.user, 'user.password_changed', 'user', user.id); await persist(); res.json({ user: publicUser(user) });
});
app.patch('/api/users/:id/status', auth, allow('admin'), async (req, res) => {
  const user = store.users.find(item => item.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Staff account not found.' });
  if (typeof req.body?.active !== 'boolean') return res.status(400).json({ error: 'Active must be true or false.' });
  if (user.id === req.user.id && req.body.active === false) return res.status(400).json({ error: 'You cannot deactivate your own active session account.' });
  if (user.active && req.body.active === false && user.role === 'admin' && store.users.filter(item => item.active && item.role === 'admin').length <= 1) return res.status(409).json({ error: 'The last active administrator cannot be deactivated. Provision another administrator first.' });
  if (user.active !== req.body.active) user.sessionVersion = (user.sessionVersion || 0) + 1;
  user.active = req.body.active; audit(req.user, 'user.status_changed', 'user', user.id, { active: user.active }); await persist(); res.json({ user: publicUser(user) });
});

app.get('/api/customer/quotes', auth, allow('customer'), (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  const quotes = store.quotes.filter(item => String(item.email || '').toLowerCase() === email).map(item => ({ id: item.id, reference: item.reference, origin: item.origin, destination: item.destination, cargoDescription: item.cargoDescription, servicePreference: item.servicePreference || 'Help me choose', weight: item.weight, status: item.status, createdAt: item.createdAt }));
  res.json({ quotes });
});

app.get('/api/customer/shipments', auth, allow('customer'), (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  const shipments = store.shipments.filter(item => String(item.sender?.email || '').toLowerCase() === email || String(item.receiver?.email || '').toLowerCase() === email).map(item => ({
    id: item.id, trackingNumber: item.trackingNumber, referenceNumber: item.referenceNumber || null, status: item.status,
    origin: item.origin || item.originHub?.city || 'Not available', destination: item.destination || item.destinationHub?.city || 'Not available',
    serviceType: item.serviceType, estimatedDelivery: item.estimatedDelivery || null, updatedAt: item.updatedAt || item.createdAt,
    cargoType: item.packageDetails?.cargoType || 'Not specified', weight: item.packageDetails?.weight ?? null, weightUnit: item.packageDetails?.unit || 'kg',
  }));
  res.json({ shipments });
});


function parseProofImage(value, kind) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const max = kind === 'signature' ? 60000 : 70000;
  if (typeof value !== 'string' || value.length > max) return { ok: false, error: `The ${kind} image is too large. Capture it again.` };
  const match = kind === 'signature' ? /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value) : /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return { ok: false, error: `The ${kind} must be a ${kind === 'signature' ? 'PNG' : 'JPEG'} image.` };
  const bytes = Buffer.from(match[1], 'base64');
  const validMagic = kind === 'signature' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff);
  if (!validMagic) return { ok: false, error: `The ${kind} file content is not a valid image.` };
  return { ok: true, value };
}
const EXCEPTION_REASON_CODES = ['recipient_unavailable', 'address_issue', 'delivery_refused', 'access_denied', 'package_damaged', 'other'];
function customerOwnsShipment(user, shipment) {
  const email = String(user.email || '').toLowerCase();
  return String(shipment.sender?.email || '').toLowerCase() === email || String(shipment.receiver?.email || '').toLowerCase() === email;
}
function publicDocument(document) {
  return { id: document.id, shipmentId: document.shipmentId, trackingNumber: document.trackingNumber, name: document.name, mimeType: document.mimeType, size: document.size, uploadedAt: document.uploadedAt };
}
app.get('/api/customer/documents', auth, allow('customer'), (req, res) => {
  const ownedIds = new Set(store.shipments.filter(item => customerOwnsShipment(req.user, item)).map(item => item.id));
  res.json({ documents: store.documents.filter(item => ownedIds.has(item.shipmentId) && item.customerVisible !== false).map(publicDocument) });
});
app.get('/api/customer/documents/:id/download', auth, allow('customer'), async (req, res) => {
  const document = store.documents.find(item => item.id === req.params.id && item.customerVisible !== false);
  const shipment = document && store.shipments.find(item => item.id === document.shipmentId);
  if (!document || !shipment || !customerOwnsShipment(req.user, shipment)) return res.status(404).json({ error: 'Document not found for this account.' });
  try { const bytes = await readFile(path.join(DATA_DIR, 'documents', document.storageName)); res.setHeader('Content-Type', document.mimeType); res.setHeader('Content-Disposition', `attachment; filename="${document.downloadName}"`); res.setHeader('Content-Length', bytes.length); res.send(bytes); }
  catch (error) { if (error.code === 'ENOENT') return res.status(404).json({ error: 'Document file is no longer available.' }); throw error; }
});
app.post('/api/shipments/:id/documents', auth, allow('admin', 'operations'), express.raw({ type: 'application/octet-stream', limit: '5mb' }), async (req, res) => {
  const shipment = store.shipments.find(item => item.id === req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found.' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Choose a non-empty file.' });
  const originalName = cleanText(req.headers['x-document-name'], 160).replace(/[\\/\r\n\"']/g, '_');
  const mimeType = cleanText(req.headers['x-document-type'], 100).toLowerCase();
  const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  if (!originalName || !allowedTypes.has(mimeType)) return res.status(400).json({ error: 'Only PDF, JPEG and PNG documents are accepted.' });
  const validSignature = mimeType === 'application/pdf' ? req.body.subarray(0, 5).toString('ascii') === '%PDF-' : mimeType === 'image/png' ? req.body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : req.body.length >= 3 && req.body[0] === 0xff && req.body[1] === 0xd8 && req.body[2] === 0xff;
  if (!validSignature) return res.status(400).json({ error: 'The file content does not match the selected document type.' });
  const storageName = `${randomBytes(18).toString('hex')}.${mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg'}`;
  const directory = path.join(DATA_DIR, 'documents'); await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, storageName), req.body, { flag: 'wx', mode: 0o600 });
  const document = { id: randomBytes(12).toString('hex'), shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, name: originalName, downloadName: originalName.replace(/[^a-zA-Z0-9._ -]/g, '_'), mimeType, size: req.body.length, storageName, customerVisible: true, uploadedBy: req.user.id, uploadedAt: new Date().toISOString() };
  store.documents.unshift(document); audit(req.user, 'shipment.document_uploaded', 'document', document.id, { shipmentId: shipment.id, mimeType, size: document.size }); await persist(); res.status(201).json({ document: publicDocument(document) });
});
app.get('/api/shipments/:id/documents', auth, allow('admin', 'operations', 'customs'), (req, res) => {
  const shipment = store.shipments.find(item => item.id === req.params.id); if (!shipment) return res.status(404).json({ error: 'Shipment not found.' });
  res.json({ documents: store.documents.filter(item => item.shipmentId === shipment.id).map(publicDocument) });
});
app.get('/api/shipments/:id/documents/:documentId/download', auth, allow('admin', 'operations', 'customs'), async (req, res) => {
  const document = store.documents.find(item => item.id === req.params.documentId && item.shipmentId === req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found.' });
  try { const bytes = await readFile(path.join(DATA_DIR, 'documents', document.storageName)); res.setHeader('Content-Type', document.mimeType); res.setHeader('Content-Disposition', `attachment; filename="${document.downloadName}"`); res.setHeader('Content-Length', bytes.length); res.send(bytes); }
  catch (error) { if (error.code === 'ENOENT') return res.status(404).json({ error: 'Document file is no longer available.' }); throw error; }
});

app.get('/api/customer/notification-preferences', auth, allow('customer'), (req, res) => {
  res.json({ preferences: { inAppUpdatesEnabled: req.user.notificationPreferences?.inAppUpdatesEnabled !== false, emailUpdatesEnabled: req.user.notificationPreferences?.emailUpdatesEnabled === true, emailDeliveryConfigured: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL) } });
});
app.patch('/api/customer/notification-preferences', auth, allow('customer'), async (req, res) => {
  const updates = {};
  if (typeof req.body?.inAppUpdatesEnabled === 'boolean') updates.inAppUpdatesEnabled = req.body.inAppUpdatesEnabled;
  if (typeof req.body?.emailUpdatesEnabled === 'boolean') {
    if (req.body.emailUpdatesEnabled && !(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL)) return res.status(503).json({ error: 'Email delivery is not configured yet. In-app updates remain available.' });
    updates.emailUpdatesEnabled = req.body.emailUpdatesEnabled;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Choose a notification preference to update.' });
  req.user.notificationPreferences = { ...(req.user.notificationPreferences || {}), ...updates };
  audit(req.user, 'customer.notification_preferences_updated', 'user', req.user.id, updates); await persist();
  res.json({ preferences: { inAppUpdatesEnabled: req.user.notificationPreferences.inAppUpdatesEnabled !== false, emailUpdatesEnabled: req.user.notificationPreferences.emailUpdatesEnabled === true, emailDeliveryConfigured: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL) } });
});
app.get('/api/customer/notifications', auth, allow('customer'), (req, res) => {
  const notifications = store.notifications.filter(item => item.userId === req.user.id).slice(0, 200);
  res.json({ notifications });
});
app.patch('/api/customer/notifications/:id/read', auth, allow('customer'), async (req, res) => {
  const notification = store.notifications.find(item => item.id === req.params.id && item.userId === req.user.id);
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });
  notification.readAt = notification.readAt || new Date().toISOString(); await persist(); res.json({ notification });
});
app.get('/api/customer/addresses', auth, allow('customer'), (req, res) => {
  res.json({ addresses: store.savedAddresses.filter(item => item.userId === req.user.id) });
});
app.post('/api/customer/addresses', auth, allow('customer'), async (req, res) => {
  const label = cleanText(req.body?.label, 80); const contactName = cleanText(req.body?.contactName, 120); const phone = cleanText(req.body?.phone, 50); const address = cleanText(req.body?.address, 240); const city = cleanText(req.body?.city, 120); const region = cleanText(req.body?.region, 120); const postalCode = cleanText(req.body?.postalCode, 30); const country = cleanText(req.body?.country, 120); const kind = req.body?.kind === 'delivery' ? 'delivery' : 'pickup';
  if (!label || !contactName || !address || !city || !country) return res.status(400).json({ error: 'Label, contact name, street address, city and country are required.' });
  const entry = { id: randomBytes(12).toString('hex'), userId: req.user.id, kind, label, contactName, phone, address, city, region, postalCode, country, createdAt: new Date().toISOString() };
  store.savedAddresses.unshift(entry); audit(req.user, 'customer.address_created', 'saved_address', entry.id); await persist(); res.status(201).json({ address: entry });
});
app.delete('/api/customer/addresses/:id', auth, allow('customer'), async (req, res) => {
  const index = store.savedAddresses.findIndex(item => item.id === req.params.id && item.userId === req.user.id);
  if (index < 0) return res.status(404).json({ error: 'Saved address not found.' });
  const [removed] = store.savedAddresses.splice(index, 1); audit(req.user, 'customer.address_deleted', 'saved_address', removed.id); await persist(); res.status(204).end();
});
app.get('/api/customer/bookings', auth, allow('customer'), (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  res.json({ bookings: store.bookings.filter(item => item.customerEmail === email) });
});
app.post('/api/customer/bookings', auth, allow('customer'), async (req, res) => {
  const quoteId = cleanText(req.body?.quoteId, 80);
  const quote = store.quotes.find(item => item.id === quoteId && String(item.email || '').toLowerCase() === String(req.user.email).toLowerCase());
  if (!quote) return res.status(404).json({ error: 'Quote not found for this customer account.' });
  if (store.bookings.some(item => item.quoteId === quote.id)) return res.status(409).json({ error: 'This quote has already been converted to a booking request.' });
  const booking = { id: randomBytes(12).toString('hex'), reference: `APB-${randomBytes(4).toString('hex').toUpperCase()}`, quoteId: quote.id, quoteReference: quote.reference, customerEmail: String(req.user.email).toLowerCase(), origin: quote.origin, destination: quote.destination, cargoDescription: quote.cargoDescription, servicePreference: quote.servicePreference || 'Help me choose', weight: quote.weight, status: 'requested', createdAt: new Date().toISOString() };
  store.bookings.unshift(booking); quote.status = 'booking_requested'; audit(req.user, 'booking.requested', 'booking', booking.id, { quoteId: quote.id }); await persist();
  res.status(201).json({ booking });
});
app.get('/api/customer/support', auth, allow('customer'), (req, res) => {
  const email = String(req.user.email || '').toLowerCase();
  res.json({ tickets: store.supportTickets.filter(item => item.customerEmail === email) });
});
app.post('/api/customer/support', auth, allow('customer'), async (req, res) => {
  const subject = cleanText(req.body?.subject, 160); const message = cleanText(req.body?.message, 3000);
  const trackingNumber = cleanText(req.body?.trackingNumber, 80).toUpperCase(); const category = cleanText(req.body?.category, 60) || 'General enquiry';
  if (subject.length < 4 || message.length < 8) return res.status(400).json({ error: 'Provide a subject and a message of at least 8 characters.' });
  if (trackingNumber) {
    const ownsShipment = store.shipments.some(item => item.trackingNumber === trackingNumber && (String(item.sender?.email || '').toLowerCase() === String(req.user.email).toLowerCase() || String(item.receiver?.email || '').toLowerCase() === String(req.user.email).toLowerCase()));
    if (!ownsShipment) return res.status(400).json({ error: 'That tracking number is not linked to your customer account.' });
  }
  const ticket = { id: randomBytes(12).toString('hex'), reference: `APS-${randomBytes(4).toString('hex').toUpperCase()}`, customerId: req.user.id, customerEmail: String(req.user.email).toLowerCase(), subject, message, category, trackingNumber: trackingNumber || null, status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.supportTickets.unshift(ticket); audit(req.user, 'support_ticket.created', 'support_ticket', ticket.id); await persist(); res.status(201).json({ ticket });
});
app.patch('/api/customer/profile', auth, allow('customer'), async (req, res) => {
  const name = cleanText(req.body?.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Name must contain at least 2 characters.' });
  req.user.name = name; audit(req.user, 'customer.profile_updated', 'user', req.user.id); await persist(); res.json({ user: publicUser(req.user) });
});
app.patch('/api/customer/password', auth, allow('customer'), async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!(await verifyPassword(currentPassword, req.user))) return res.status(401).json({ error: 'Current password is incorrect.' });
  if (newPassword.length < 10 || newPassword.length > 1024) return res.status(400).json({ error: 'New password must be at least 14 characters.' });
  const credentials = await hashPassword(newPassword); req.user.passwordSalt = credentials.salt; req.user.passwordHash = credentials.hash; req.user.sessionVersion = (req.user.sessionVersion || 0) + 1;
  audit(req.user, 'customer.password_changed', 'user', req.user.id); await persist();
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); res.json({ message: 'Password updated. Sign in again with your new password.' });
});

app.get('/api/shipments', auth, allow('admin', 'operations', 'customs'), (req, res) => {
  const status = cleanText(req.query.status, 60);
  const shipments = (status ? store.shipments.filter(item => item.status === status) : store.shipments).map(({ proofMedia, ...rest }) => rest);
  res.json({ shipments });
});

app.get('/api/vehicles', auth, allow('admin', 'operations'), (_req, res) => res.json({ vehicles: store.vehicles }));
app.post('/api/vehicles', auth, allow('admin', 'operations'), async (req, res) => {
  const identifier = cleanText(req.body?.identifier, 80); const type = cleanText(req.body?.type, 40); const capacityKg = Number(req.body?.capacityKg); const notes = cleanText(req.body?.notes, 500);
  if (!identifier || !['truck', 'van', 'motorbike', 'trailer', 'other'].includes(type) || !Number.isFinite(capacityKg) || capacityKg <= 0 || capacityKg > 1000000) return res.status(400).json({ error: 'Provide a unique identifier, valid vehicle type and positive capacity in kg.' });
  if (store.vehicles.some(item => item.identifier.toLowerCase() === identifier.toLowerCase())) return res.status(409).json({ error: 'That vehicle identifier already exists.' });
  const vehicle = { id: randomBytes(12).toString('hex'), identifier, type, capacityKg, notes, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.vehicles.unshift(vehicle); audit(req.user, 'vehicle.created', 'vehicle', vehicle.id); await persist(); res.status(201).json({ vehicle });
});
app.patch('/api/vehicles/:id/status', auth, allow('admin', 'operations'), async (req, res) => {
  const vehicle = store.vehicles.find(item => item.id === req.params.id); if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
  const status = cleanText(req.body?.status, 30); if (!['active', 'maintenance', 'out_of_service'].includes(status)) return res.status(400).json({ error: 'Choose a valid vehicle status.' });
  vehicle.status = status; vehicle.updatedAt = new Date().toISOString(); audit(req.user, 'vehicle.status_changed', 'vehicle', vehicle.id, { status }); await persist(); res.json({ vehicle });
});
app.delete('/api/vehicles/:id', auth, allow('admin'), async (req, res) => {
  const index = store.vehicles.findIndex(item => item.id === req.params.id); if (index < 0) return res.status(404).json({ error: 'Vehicle not found.' });
  const [vehicle] = store.vehicles.splice(index, 1); for (const shipment of store.shipments) if (shipment.assignedVehicleId === vehicle.id) { shipment.assignedVehicleId = null; shipment.assignedVehicleIdentifier = null; }
  audit(req.user, 'vehicle.deleted', 'vehicle', vehicle.id); await persist(); res.status(204).end();
});
app.get('/api/facilities', auth, allow('admin', 'operations', 'customs'), (_req, res) => res.json({ facilities: store.facilities }));
app.post('/api/facilities', auth, allow('admin', 'operations'), async (req, res) => {
  const name = cleanText(req.body?.name, 120); const type = cleanText(req.body?.type, 40); const city = cleanText(req.body?.city, 120); const country = cleanText(req.body?.country, 120); const address = cleanText(req.body?.address, 240);
  if (!name || !['warehouse', 'hub', 'customs', 'cross_dock', 'office', 'other'].includes(type) || !city || !country) return res.status(400).json({ error: 'Provide a name, facility type, city and country.' });
  const facility = { id: randomBytes(12).toString('hex'), name, type, city, country, address, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.facilities.unshift(facility); audit(req.user, 'facility.created', 'facility', facility.id); await persist(); res.status(201).json({ facility });
});
app.patch('/api/facilities/:id/status', auth, allow('admin', 'operations'), async (req, res) => {
  const facility = store.facilities.find(item => item.id === req.params.id); if (!facility) return res.status(404).json({ error: 'Facility not found.' });
  const status = cleanText(req.body?.status, 30); if (!['active', 'limited', 'closed'].includes(status)) return res.status(400).json({ error: 'Choose a valid facility status.' });
  facility.status = status; facility.updatedAt = new Date().toISOString(); audit(req.user, 'facility.status_changed', 'facility', facility.id, { status }); await persist(); res.json({ facility });
});
app.get('/api/drivers', auth, allow('admin', 'operations'), (_req, res) => res.json({ drivers: store.users.filter(user => user.role === 'driver' && user.active).map(publicUser) }));
app.patch('/api/shipments/:id/assignment', auth, allow('admin', 'operations'), async (req, res) => {
  const shipment = store.shipments.find(item => item.id === req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found.' });
  const driverId = cleanText(req.body?.driverId, 80); const vehicleId = cleanText(req.body?.vehicleId, 80); const sequence = Number(req.body?.dispatchSequence);
  if (driverId) {
    const driver = store.users.find(user => user.id === driverId && user.active && user.role === 'driver');
    if (!driver) return res.status(400).json({ error: 'Choose an active driver account.' });
    shipment.assignedDriverId = driver.id; shipment.assignedDriverName = driver.name;
  } else { shipment.assignedDriverId = null; shipment.assignedDriverName = null; }
  if (vehicleId) {
    const vehicle = store.vehicles.find(item => item.id === vehicleId && item.status === 'active');
    if (!vehicle) return res.status(400).json({ error: 'Choose an active vehicle.' });
    const rawWeight = Number(shipment.packageDetails?.weight); const weightUnit = String(shipment.packageDetails?.unit || 'kg').toLowerCase();
    const weightKg = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight * (weightUnit === 'lb' || weightUnit === 'lbs' ? 0.45359237 : 1) : null;
    if (weightKg !== null && weightKg > Number(vehicle.capacityKg)) return res.status(400).json({ error: `Shipment weight (${weightKg.toFixed(1)} kg) exceeds the selected vehicle capacity (${vehicle.capacityKg} kg).` });
    shipment.assignedVehicleId = vehicle.id; shipment.assignedVehicleIdentifier = vehicle.identifier;
  } else { shipment.assignedVehicleId = null; shipment.assignedVehicleIdentifier = null; }
  if (Number.isFinite(sequence) && sequence >= 0 && sequence <= 10000) shipment.dispatchSequence = Math.floor(sequence);
  shipment.updatedAt = new Date().toISOString(); audit(req.user, 'shipment.dispatch_assignment_changed', 'shipment', shipment.id, { driverId: shipment.assignedDriverId, vehicleId: shipment.assignedVehicleId, dispatchSequence: shipment.dispatchSequence ?? null }); await persist(); res.json({ shipment });
});
app.get('/api/driver/stops', auth, allow('driver'), (req, res) => {
  const stops = store.shipments.filter(item => item.assignedDriverId === req.user.id).sort((a, b) => (a.dispatchSequence ?? 9999) - (b.dispatchSequence ?? 9999)).map(item => ({ id: item.id, trackingNumber: item.trackingNumber, status: item.status, origin: item.origin || item.originHub?.city || 'Origin pending', destination: item.destination || item.destinationHub?.city || 'Destination pending', recipient: item.receiver?.name || 'Recipient not set', recipientPhone: item.receiver?.phone || '', address: item.receiver?.address || '', estimatedDelivery: item.estimatedDelivery || null, vehicle: item.assignedVehicleIdentifier || null, dispatchSequence: item.dispatchSequence ?? null, proofOfDelivery: item.proofOfDelivery ? { recipientName: item.proofOfDelivery.recipientName, relation: item.proofOfDelivery.relation, timestamp: item.proofOfDelivery.timestamp } : null, updatedAt: item.updatedAt || item.createdAt }));
  res.json({ stops });
});


// ---- Customs cases: review -> assessment -> cleared / held, with a document checklist ----
const CUSTOMS_STAGES = ['document_review', 'assessment', 'cleared', 'held'];
const CUSTOMS_DEFAULT_CHECKLIST = [['commercial_invoice', 'Commercial invoice'], ['packing_list', 'Packing list'], ['transport_document', 'Air waybill / bill of lading'], ['importer_details', 'Importer / consignee details'], ['other_permits', 'Permits or licences (if required)']];
app.get('/api/customs/cases', auth, allow('admin', 'operations', 'customs'), (_req, res) => res.json({ cases: [...store.customsCases].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) }));
app.post('/api/customs/cases', auth, allow('admin', 'customs'), async (req, res) => {
  const shipment = store.shipments.find(item => item.id === cleanText(req.body?.shipmentId, 80));
  if (!shipment) return res.status(404).json({ error: 'Shipment not found.' });
  if (store.customsCases.some(item => item.shipmentId === shipment.id && !['cleared'].includes(item.stage))) return res.status(409).json({ error: 'An open customs case already exists for this shipment.' });
  const now = new Date().toISOString();
  const customsCase = { id: randomBytes(12).toString('hex'), shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, stage: 'document_review', checklist: CUSTOMS_DEFAULT_CHECKLIST.map(([key, label]) => ({ key, label, received: false })), duty: null, holdReason: '', notes: '', openedBy: req.user.id, createdAt: now, updatedAt: now, history: [{ at: now, by: req.user.id, stage: 'document_review', note: 'Case opened.' }] };
  store.customsCases.push(customsCase);
  shipment.customsDetails = { ...(shipment.customsDetails || {}), status: 'pending' }; shipment.updatedAt = now;
  audit(req.user, 'customs.case_opened', 'customs_case', customsCase.id, { shipmentId: shipment.id }); await persist();
  res.status(201).json({ case: customsCase });
});
app.patch('/api/customs/cases/:id', auth, allow('admin', 'customs'), async (req, res) => {
  const customsCase = store.customsCases.find(item => item.id === req.params.id);
  if (!customsCase) return res.status(404).json({ error: 'Customs case not found.' });
  const now = new Date().toISOString(); let note = cleanText(req.body?.note, 300);
  if (Array.isArray(req.body?.checklist)) {
    for (const entry of req.body.checklist) { const item = customsCase.checklist.find(row => row.key === entry?.key); if (item && typeof entry.received === 'boolean') item.received = entry.received; }
  }
  if (req.body?.duty !== undefined) {
    if (req.body.duty === null) customsCase.duty = null;
    else { const amount = Number(req.body.duty?.amount); const currency = cleanText(req.body.duty?.currency, 3).toUpperCase(); if (!Number.isFinite(amount) || amount < 0 || amount > 1e9 || !/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: 'Enter a valid duty amount and 3-letter currency code.' }); customsCase.duty = { amount: Math.round(amount * 100) / 100, currency, paid: Boolean(req.body.duty?.paid) }; }
  }
  if (req.body?.stage !== undefined) {
    const stage = cleanText(req.body.stage, 40);
    if (!CUSTOMS_STAGES.includes(stage)) return res.status(400).json({ error: 'Choose a valid customs stage.' });
    const order = { document_review: 0, assessment: 1, cleared: 2, held: 2 };
    if (['cleared', 'assessment'].includes(stage) && !customsCase.checklist.filter(row => row.key !== 'other_permits').every(row => row.received)) return res.status(409).json({ error: 'Receive all required documents before moving past document review.' });
    if (stage === 'cleared' && customsCase.duty && !customsCase.duty.paid) return res.status(409).json({ error: 'Mark the assessed duty as paid before clearing the case.' });
    if (stage === 'held') { const reason = cleanText(req.body?.holdReason, 300); if (!reason) return res.status(400).json({ error: 'Give a reason for the hold.' }); customsCase.holdReason = reason; note = note || reason; } else customsCase.holdReason = '';
    if (order[stage] < order[customsCase.stage] && customsCase.stage !== 'held') return res.status(409).json({ error: 'A case cannot move back to an earlier stage.' });
    customsCase.stage = stage; customsCase.history.unshift({ at: now, by: req.user.id, stage, note: note || `Moved to ${stage.replaceAll('_', ' ')}.` });
    const shipment = store.shipments.find(item => item.id === customsCase.shipmentId);
    if (shipment) { shipment.customsDetails = { ...(shipment.customsDetails || {}), status: stage === 'cleared' ? 'cleared' : 'pending' }; shipment.updatedAt = now; }
  }
  if (req.body?.notes !== undefined) customsCase.notes = cleanText(req.body.notes, 1000);
  customsCase.updatedAt = now; audit(req.user, 'customs.case_updated', 'customs_case', customsCase.id, { stage: customsCase.stage }); await persist();
  res.json({ case: customsCase });
});
app.get('/api/shipments/:id/proof', auth, allow('admin', 'operations', 'customs', 'customer'), (req, res) => {
  const shipment = store.shipments.find(item => item.id === req.params.id);
  if (!shipment || (req.user.role === 'customer' && !customerOwnsShipment(req.user, shipment))) return res.status(404).json({ error: 'Proof of delivery was not found.' });
  const proof = shipment.proofOfDelivery;
  if (!proof) return res.status(404).json({ error: 'No proof of delivery has been recorded.' });
  res.json({ proof: { recipientName: proof.recipientName, relation: proof.relation, timestamp: proof.timestamp, method: proof.method, signature: shipment.proofMedia?.signature || null, photo: shipment.proofMedia?.photo || null } });
});
app.post('/api/driver/stops/:id/events', auth, allow('driver'), async (req, res) => {
  const shipment = store.shipments.find(item => item.id === req.params.id && item.assignedDriverId === req.user.id);
  if (!shipment) return res.status(404).json({ error: 'This shipment is not assigned to your driver account.' });
  const eventType = cleanText(req.body?.eventType, 80); const description = cleanText(req.body?.description, 500);
  const allowedDriverEvents = new Set(['picked_up', 'received_at_facility', 'in_transit', 'out_for_delivery', 'delivered', 'exception_hold']);
  if (!allowedDriverEvents.has(eventType)) return res.status(400).json({ error: 'Choose an available delivery milestone.' });
  const transitions = { manifest_created: ['picked_up', 'exception_hold'], picked_up: ['received_at_facility', 'in_transit', 'exception_hold'], received_at_facility: ['in_transit', 'out_for_delivery', 'exception_hold'], in_transit: ['received_at_facility', 'out_for_delivery', 'exception_hold'], customs_clearance: ['in_transit', 'out_for_delivery', 'exception_hold'], out_for_delivery: ['delivered', 'exception_hold'], exception_hold: ['in_transit', 'out_for_delivery', 'delivered'], delivered: [] };
  if (!(transitions[shipment.status] || []).includes(eventType)) return res.status(409).json({ error: `Cannot move a shipment from ${String(shipment.status).replaceAll('_', ' ')} to ${eventType.replaceAll('_', ' ')}. Contact dispatch if the status is incorrect.` });
  const deliveryProof = req.body?.proofOfDelivery && typeof req.body.proofOfDelivery === 'object' ? req.body.proofOfDelivery : null;
  if (eventType === 'delivered') {
    const recipientName = cleanText(deliveryProof?.recipientName, 120);
    const relation = cleanText(deliveryProof?.relation, 80);
    if (!recipientName || !relation) return res.status(400).json({ error: 'Recipient name and recipient relationship/role are required to confirm delivery.' });
    if (!['Recipient', 'Family member', 'Receptionist', 'Security', 'Authorized representative', 'Other'].includes(relation)) return res.status(400).json({ error: 'Choose a valid recipient relationship.' });
  }
  const signatureCheck = parseProofImage(req.body?.signature, 'signature'); if (!signatureCheck.ok) return res.status(400).json({ error: signatureCheck.error });
  const photoCheck = parseProofImage(req.body?.photo, 'photo'); if (!photoCheck.ok) return res.status(400).json({ error: photoCheck.error });
  const reasonCode = cleanText(req.body?.reasonCode, 40);
  if (eventType === 'exception_hold' && reasonCode && !EXCEPTION_REASON_CODES.includes(reasonCode)) return res.status(400).json({ error: 'Choose a valid exception reason.' });
  const message = eventType === 'delivered' ? `Delivered to ${cleanText(deliveryProof?.recipientName, 120)} (${cleanText(deliveryProof?.relation, 80)}); delivery confirmation recorded by ${req.user.name}.` : (description || `Driver recorded: ${eventType.replaceAll('_', ' ')}.`); const now = new Date().toISOString();
  if (eventType === 'delivered') { shipment.actualDelivery = now; shipment.proofOfDelivery = { recipientName: cleanText(deliveryProof.recipientName, 120), relation: cleanText(deliveryProof.relation, 80), timestamp: now, recordedBy: req.user.id, location: cleanText(req.body?.location, 160), method: 'typed_recipient_acknowledgement', ...(signatureCheck.value ? { method: 'signature_capture' } : {}), hasSignature: Boolean(signatureCheck.value), hasPhoto: Boolean(photoCheck.value) }; if (signatureCheck.value || photoCheck.value) shipment.proofMedia = { signature: signatureCheck.value, photo: photoCheck.value, capturedAt: now }; }
  const event = { id: randomBytes(12).toString('hex'), shipmentId: shipment.id, eventType, description: message, occurredAt: now, location: cleanText(req.body?.location, 160), actorId: req.user.id, visibility: 'public', createdAt: now, ...(eventType === 'exception_hold' && reasonCode ? { metadata: { reasonCode } } : {}) };
  store.events.push(event); shipment.status = eventType; shipment.statusMessage = message; shipment.updatedAt = now;
  shipment.checkpoints = [{ id: event.id, timestamp: now, location: event.location, city: event.location, country: '', status: eventType, title: eventType.replaceAll('_', ' '), description: message, completed: true }, ...(Array.isArray(shipment.checkpoints) ? shipment.checkpoints : [])];
  createCustomerNotifications(shipment, `Shipment update: ${eventType.replaceAll('_', ' ')}`, message); audit(req.user, 'driver.shipment_event_created', 'shipment_event', event.id, { shipmentId: shipment.id }); await persist(); res.status(201).json({ event, shipment });
});
app.post('/api/shipments', auth, allow('admin', 'operations'), async (req, res) => {
  const trackingNumber = cleanText(req.body?.trackingNumber, 80).toUpperCase();
  const origin = cleanText(req.body?.origin, 120); const destination = cleanText(req.body?.destination, 120);
  if (!trackingNumber || !origin || !destination) return res.status(400).json({ error: 'Tracking number, origin and destination are required.' });
  if (store.shipments.some(item => String(item.trackingNumber || '').toUpperCase() === trackingNumber)) return res.status(409).json({ error: 'That tracking number already exists.' });
  const now = new Date().toISOString();
  const serviceType = cleanText(req.body?.serviceType, 80) || 'international_freight';
  const status = cleanText(req.body?.status, 80) || 'manifest_created';
  const allowedStatuses = new Set(['manifest_created', 'picked_up', 'received_at_facility', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered', 'exception_hold']);
  const shipment = {
    ...req.body,
    id: randomBytes(12).toString('hex'), trackingNumber, origin, destination, serviceType,
    status: allowedStatuses.has(status) ? status : 'manifest_created',
    createdAt: now, updatedAt: now,
  };
  delete shipment.passwordHash; delete shipment.passwordSalt;
  store.shipments.unshift(shipment);
  const firstCheckpoint = Array.isArray(shipment.checkpoints) ? shipment.checkpoints[shipment.checkpoints.length - 1] : null;
  if (firstCheckpoint) store.events.push({ id: randomBytes(12).toString('hex'), shipmentId: shipment.id, eventType: firstCheckpoint.status || shipment.status, description: cleanText(firstCheckpoint.description || firstCheckpoint.title, 500), occurredAt: firstCheckpoint.timestamp || now, location: cleanText(firstCheckpoint.location, 160), actorId: req.user.id, visibility: 'public', createdAt: now });
  createCustomerNotifications(shipment, 'Shipment created', firstCheckpoint?.description || `Shipment ${trackingNumber} has been created.`);
  audit(req.user, 'shipment.created', 'shipment', shipment.id); await persist(); res.status(201).json({ shipment });
});
app.patch('/api/shipments/:id', auth, allow('admin', 'operations'), async (req, res) => {
  const index = store.shipments.findIndex(item => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Shipment not found.' });
  const previous = store.shipments[index];
  const now = new Date().toISOString();
  const allowedStatuses = new Set(['manifest_created', 'picked_up', 'received_at_facility', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered', 'exception_hold']);
  const next = { ...previous, ...req.body, id: previous.id, trackingNumber: previous.trackingNumber, updatedAt: now };
  if (!allowedStatuses.has(next.status)) return res.status(400).json({ error: 'Choose a valid shipment status.' });
  next.origin = cleanText(next.origin || next.originHub?.city, 120);
  next.destination = cleanText(next.destination || next.destinationHub?.city, 120);
  delete next.passwordHash; delete next.passwordSalt;
  store.shipments[index] = next;
  const newestCheckpoint = Array.isArray(next.checkpoints) ? next.checkpoints[0] : null;
  let eventRecorded = false;
  if (newestCheckpoint && newestCheckpoint.timestamp !== previous.updatedAt) {
    const alreadyExists = store.events.some(event => event.shipmentId === next.id && event.occurredAt === newestCheckpoint.timestamp && event.description === newestCheckpoint.description);
    if (!alreadyExists) {
      const eventType = allowedStatuses.has(newestCheckpoint.status) ? newestCheckpoint.status : next.status;
      const description = cleanText(newestCheckpoint.description || newestCheckpoint.title, 500) || `Shipment status updated to ${eventType.replaceAll('_', ' ')}.`;
      store.events.push({ id: randomBytes(12).toString('hex'), shipmentId: next.id, eventType, description, occurredAt: newestCheckpoint.timestamp || now, location: cleanText(newestCheckpoint.location, 160), actorId: req.user.id, visibility: 'public', createdAt: now });
      eventRecorded = true;
      createCustomerNotifications(next, `Shipment update: ${eventType.replaceAll('_', ' ')}`, description);
    }
  }
  if (previous.status !== next.status && !eventRecorded) {
    const description = cleanText(next.statusMessage, 500) || `Shipment status updated to ${next.status.replaceAll('_', ' ')}.`;
    const event = { id: randomBytes(12).toString('hex'), shipmentId: next.id, eventType: next.status, description, occurredAt: now, location: cleanText(next.currentLocation?.description || next.currentLocation?.city, 160), actorId: req.user.id, visibility: 'public', createdAt: now };
    store.events.push(event);
    const checkpoint = { id: event.id, timestamp: now, location: event.location, city: next.currentLocation?.city || '', country: next.currentLocation?.country || '', status: next.status, title: next.status.replaceAll('_', ' '), description, completed: true };
    next.checkpoints = [checkpoint, ...(Array.isArray(next.checkpoints) ? next.checkpoints : [])];
    createCustomerNotifications(next, `Shipment update: ${next.status.replaceAll('_', ' ')}`, description);
  }
  audit(req.user, 'shipment.updated', 'shipment', next.id, { status: next.status }); await persist(); res.json({ shipment: next });
});
app.delete('/api/shipments/:id', auth, allow('admin'), async (req, res) => {
  const index = store.shipments.findIndex(item => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Shipment not found.' });
  const [removed] = store.shipments.splice(index, 1);
  store.events = store.events.filter(event => event.shipmentId !== removed.id);
  audit(req.user, 'shipment.deleted', 'shipment', removed.id, { trackingNumber: removed.trackingNumber }); await persist(); res.status(204).end();
});
app.post('/api/shipments/:id/events', auth, allow('admin', 'operations', 'customs'), async (req, res) => {
  const shipment = store.shipments.find(item => item.id === req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found.' });
  const eventType = cleanText(req.body?.eventType, 80); const description = cleanText(req.body?.description, 500);
  const occurredAt = req.body?.occurredAt ? new Date(req.body.occurredAt) : new Date();
  const allowedEventTypes = new Set(['manifest_created', 'picked_up', 'received_at_facility', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered', 'exception_hold']);
  if (!allowedEventTypes.has(eventType) || !description || Number.isNaN(occurredAt.getTime())) return res.status(400).json({ error: 'A valid event type, description and timestamp are required.' });
  if (occurredAt.getTime() > Date.now() + 5 * 60 * 1000) return res.status(400).json({ error: 'Event timestamps cannot be more than five minutes in the future.' });
  const visibility = req.body?.visibility === 'private' ? 'private' : 'public';
  const event = { id: randomBytes(12).toString('hex'), shipmentId: shipment.id, eventType, description, occurredAt: occurredAt.toISOString(), location: cleanText(req.body?.location, 160), facilityId: cleanText(req.body?.facilityId, 80), actorId: req.user.id, visibility, createdAt: new Date().toISOString() };
  store.events.push(event);
  // Private operational notes must not alter the customer-visible status, timeline or notifications.
  if (visibility === 'public') {
    shipment.status = eventType; shipment.updatedAt = new Date().toISOString();
    const checkpoint = { id: event.id, timestamp: event.occurredAt, location: event.location || '', city: event.location || '', country: '', status: event.eventType, title: event.eventType.replaceAll('_', ' '), description: event.description, completed: true };
    shipment.checkpoints = [checkpoint, ...(Array.isArray(shipment.checkpoints) ? shipment.checkpoints : [])];
    createCustomerNotifications(shipment, `Shipment update: ${eventType.replaceAll('_', ' ')}`, description);
  }
  if (req.user.role === 'customs' && ['pending', 'cleared', 'inspected', 'exempt'].includes(req.body?.customsStatus)) shipment.customsDetails = { ...(shipment.customsDetails || { declarationNumber: '' }), status: req.body.customsStatus };
  audit(req.user, 'shipment.event.created', 'shipment_event', event.id, { shipmentId: shipment.id }); await persist(); res.status(201).json({ event, shipment });
});
app.get('/api/quotes', auth, allow('admin', 'operations'), (_req, res) => res.json({ quotes: store.quotes }));
app.get('/api/bookings', auth, allow('admin', 'operations'), (_req, res) => res.json({ bookings: store.bookings }));
app.patch('/api/bookings/:id/status', auth, allow('admin', 'operations'), async (req, res) => { const booking = store.bookings.find(item => item.id === req.params.id); if (!booking) return res.status(404).json({ error: 'Booking request not found.' }); const status = cleanText(req.body?.status, 30); if (!['requested', 'reviewing', 'confirmed', 'declined'].includes(status)) return res.status(400).json({ error: 'Choose a valid booking status.' }); booking.status = status; booking.updatedAt = new Date().toISOString(); const customer = store.users.find(user => user.active && user.role === 'customer' && String(user.email || '').toLowerCase() === booking.customerEmail); if (customer) notifyCustomerAccount(customer, booking.reference, 'Booking request update', `Your booking request is now ${status.replaceAll('_', ' ')}.`, { type: 'booking_update', bookingId: booking.id }); audit(req.user, 'booking.status_changed', 'booking', booking.id, { status }); await persist(); res.json({ booking }); });
app.get('/api/support', auth, allow('admin', 'operations'), (_req, res) => res.json({ tickets: store.supportTickets }));
app.patch('/api/support/:id/status', auth, allow('admin', 'operations'), async (req, res) => { const ticket = store.supportTickets.find(item => item.id === req.params.id); if (!ticket) return res.status(404).json({ error: 'Support ticket not found.' }); const status = cleanText(req.body?.status, 30); if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return res.status(400).json({ error: 'Choose a valid ticket status.' }); ticket.status = status; ticket.updatedAt = new Date().toISOString(); const customer = store.users.find(user => user.active && user.role === 'customer' && user.id === ticket.customerId); if (customer) notifyCustomerAccount(customer, ticket.reference, 'Support request update', `Your support request is now ${status.replaceAll('_', ' ')}.`, { type: 'support_update', ticketId: ticket.id }); audit(req.user, 'support_ticket.status_changed', 'support_ticket', ticket.id, { status }); await persist(); res.json({ ticket }); });
app.get('/api/notification-jobs', auth, allow('admin', 'operations'), (_req, res) => {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);
  res.json({ configured, provider: configured ? 'Resend' : null, jobs: store.notificationJobs.slice(0, 500).map(({ id, to, subject, metadata, status, attempts, maxAttempts, nextAttemptAt, createdAt, lastError, providerId, sentAt }) => ({ id, to, subject, metadata, status, attempts, maxAttempts, nextAttemptAt, createdAt, lastError, providerId, sentAt })) });
});
app.post('/api/notification-jobs/:id/retry', auth, allow('admin', 'operations'), async (req, res) => {
  if (!(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL)) return res.status(503).json({ error: 'Configure RESEND_API_KEY and NOTIFICATION_FROM_EMAIL before retrying email delivery.' });
  const job = store.notificationJobs.find(item => item.id === req.params.id); if (!job) return res.status(404).json({ error: 'Notification job not found.' });
  if (job.status === 'sent') return res.status(409).json({ error: 'This notification was already sent.' });
  job.status = 'queued'; job.attempts = 0; job.nextAttemptAt = new Date().toISOString(); job.lastError = null; audit(req.user, 'notification.retry_requested', 'notification_job', job.id); await persist(); void processNotificationQueue().catch(error => console.error('Notification queue error:', error)); res.json({ job: { id: job.id, status: job.status, to: job.to, subject: job.subject } });
});
app.get('/api/analytics', auth, allow('admin', 'operations'), (_req, res) => {
  const statusCounts = Object.fromEntries([...new Set(store.shipments.map(item => item.status).filter(Boolean))].map(status => [status, store.shipments.filter(item => item.status === status).length]));
  const serviceCounts = Object.fromEntries([...new Set(store.shipments.map(item => item.serviceType).filter(Boolean))].map(service => [service, store.shipments.filter(item => item.serviceType === service).length]));
  const now = new Date(); const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  res.json({ generatedAt: now.toISOString(), totals: { shipments: store.shipments.length, inTransit: store.shipments.filter(item => ['picked_up', 'received_at_facility', 'in_transit', 'out_for_delivery'].includes(item.status)).length, delivered: store.shipments.filter(item => item.status === 'delivered').length, exceptions: store.shipments.filter(item => item.status === 'exception_hold').length, customsQueue: store.shipments.filter(item => item.status === 'customs_clearance').length, quotes: store.quotes.length, bookingRequests: store.bookings.filter(item => ['requested', 'reviewing'].includes(item.status)).length, openSupportTickets: store.supportTickets.filter(item => ['open', 'in_progress'].includes(item.status)).length, eventsLast24Hours: store.events.filter(item => new Date(item.createdAt || item.occurredAt).getTime() >= dayAgo).length }, statusCounts, serviceCounts });
});
app.get('/api/audit-logs', auth, allow('admin'), (_req, res) => res.json({ auditLogs: store.auditLogs.slice(0, 500) }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => { if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'The uploaded document exceeds the 5 MB limit.' }); console.error('API error:', error); res.status(500).json({ error: 'An unexpected server error occurred.' }); });

async function bootstrap() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32 || SESSION_SECRET.includes('replace-with')) throw new Error('SESSION_SECRET must be set to a unique random value of at least 32 characters.');
  await loadStore();
  let recoveredNotificationJobs = false;
  for (const job of store.notificationJobs) { if (job.status === 'sending') { job.status = job.attempts >= job.maxAttempts ? 'failed' : 'retrying'; job.nextAttemptAt = new Date().toISOString(); job.lastError = 'Delivery was interrupted by a server restart.'; recoveredNotificationJobs = true; } }
  if (recoveredNotificationJobs) await persist();
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && !store.users.some(user => user.email === process.env.ADMIN_EMAIL.toLowerCase())) {
    if (process.env.ADMIN_PASSWORD.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters when bootstrapping an administrator.');
    const credentials = await hashPassword(process.env.ADMIN_PASSWORD);
    store.users.push({ id: randomBytes(12).toString('hex'), name: process.env.ADMIN_NAME || 'Apex Administrator', email: process.env.ADMIN_EMAIL.toLowerCase(), role: 'admin', active: true, passwordSalt: credentials.salt, passwordHash: credentials.hash, sessionVersion: 0, createdAt: new Date().toISOString() });
    await persist();
    console.info('Initial administrator created from environment configuration.');
  }
  // Serve the built website (npm run build -> dist) from this same process, with SPA fallback.
  const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
  if (process.env.SERVE_STATIC !== 'false' && (await readFile(path.join(distDir, 'index.html')).then(() => true, () => false))) {
    app.use(express.static(distDir, { index: false, maxAge: '1h', setHeaders: (res, file) => { if (/[\\/]assets[\\/]/.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }
  app.listen(PORT, () => { console.info(`Apex Logistics API listening on port ${PORT}`); void processNotificationQueue().catch(error => console.error('Notification queue error:', error)); setInterval(() => { void processNotificationQueue().catch(error => console.error('Notification queue error:', error)); }, 30_000).unref(); });
}
bootstrap().catch(error => { console.error(error.message); process.exit(1); });
