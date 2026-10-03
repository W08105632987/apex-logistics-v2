import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = 4100 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = { email: 'admin@test.dev', password: 'Admin-test-pass-1234' };
const CUST_A = { email: 'a.customer@test.dev', password: 'Customer-A-pass-1234' };
const CUST_B = { email: 'b.customer@test.dev', password: 'Customer-B-pass-1234' };
const DRIVER = { email: 'driver@test.dev', password: 'Driver-test-pass-12345' };
// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
let proc; let dir;

async function call(method, url, { body, cookie } = {}) {
  const res = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, headers: res.headers };
}
async function login(creds) {
  const res = await call('POST', '/api/auth/login', { body: creds });
  assert.equal(res.status, 200, 'login should succeed for ' + creds.email);
  return res.headers.get('set-cookie').split(';')[0];
}

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'apex-test-'));
  proc = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, API_PORT: String(PORT), APEX_DATA_DIR: dir, SESSION_SECRET: 'x'.repeat(64), ADMIN_EMAIL: ADMIN.email, ADMIN_NAME: 'Test Admin', ADMIN_PASSWORD: ADMIN.password }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 150)); }
  const cookie = await login(ADMIN);
  for (const [name, c] of [['Customer A', CUST_A], ['Customer B', CUST_B]]) {
    const r = await call('POST', '/api/users', { cookie, body: { name, email: c.email, password: c.password, role: 'customer' } });
    assert.equal(r.status, 201);
  }
  const mk = async (trackingNumber, email) => call('POST', '/api/shipments', { cookie, body: { trackingNumber, origin: 'Lagos', destination: 'London', sender: { name: 'S', email }, receiver: { name: 'R', email: 'recv@test.dev' } } });
  assert.equal((await mk('APX-A-1', CUST_A.email)).status, 201);
  assert.equal((await mk('APX-B-1', CUST_B.email)).status, 201);
});
after(() => { proc?.kill(); if (dir) rmSync(dir, { recursive: true, force: true }); });

test('health endpoint responds', async () => { assert.equal((await call('GET', '/api/health')).status, 200); });

test('privileged endpoints reject anonymous requests', async () => {
  for (const url of ['/api/shipments', '/api/users', '/api/audit-logs', '/api/analytics', '/api/customer/shipments', '/api/driver/stops']) assert.equal((await call('GET', url)).status, 401, url);
});

test('login rejects wrong credentials', async () => { assert.equal((await call('POST', '/api/auth/login', { body: { email: ADMIN.email, password: 'wrong-password-123456' } })).status, 401); });

test('public tracking returns safe fields and 404 for unknown numbers', async () => {
  assert.equal((await call('GET', '/api/tracking/DOES-NOT-EXIST')).status, 404);
  const r = await call('GET', '/api/tracking/APX-A-1');
  assert.equal(r.status, 200);
  const raw = JSON.stringify(r.json);
  assert.ok(!raw.includes(CUST_A.email), 'public tracking must not leak sender email');
  assert.ok(!raw.includes('recv@test.dev'), 'public tracking must not leak receiver email');
});

test('customer sees only their own shipments (data isolation)', async () => {
  const a = await call('GET', '/api/customer/shipments', { cookie: await login(CUST_A) });
  const b = await call('GET', '/api/customer/shipments', { cookie: await login(CUST_B) });
  const nums = r => (r.json.shipments || []).map(s => s.trackingNumber);
  assert.deepEqual(nums(a), ['APX-A-1']);
  assert.deepEqual(nums(b), ['APX-B-1']);
});

test('customers cannot use staff endpoints', async () => {
  const cookie = await login(CUST_A);
  for (const [m, url] of [['GET', '/api/shipments'], ['GET', '/api/users'], ['GET', '/api/audit-logs'], ['POST', '/api/shipments']]) assert.equal((await call(m, url, { cookie, body: m === 'POST' ? {} : undefined })).status, 403, url);
});

test('admin actions are written to the audit log', async () => {
  const r = await call('GET', '/api/audit-logs', { cookie: await login(ADMIN) });
  assert.equal(r.status, 200);
  assert.ok((r.json.auditLogs || r.json.logs || r.json).length > 0);
});

test('weak passwords are refused when creating accounts', async () => {
  const r = await call('POST', '/api/users', { cookie: await login(ADMIN), body: { name: 'X', email: 'x@test.dev', password: 'short', role: 'customer' } });
  assert.equal(r.status, 400);
});

test('driver proof of delivery: signature stored, validated, and access-controlled', async () => {
  const admin = await login(ADMIN);
  const created = await call('POST', '/api/users', { cookie: admin, body: { name: 'Driver One', email: DRIVER.email, password: DRIVER.password, role: 'driver' } });
  assert.equal(created.status, 201);
  const list = await call('GET', '/api/shipments', { cookie: admin });
  const ship = list.json.shipments.find(x => x.trackingNumber === 'APX-A-1');
  const assign = await call('PATCH', `/api/shipments/${ship.id}/assignment`, { cookie: admin, body: { driverId: created.json.user.id } });
  assert.equal(assign.status, 200);
  const driver = await login(DRIVER);
  const send = (body) => call('POST', `/api/driver/stops/${ship.id}/events`, { cookie: driver, body });
  for (const eventType of ['picked_up', 'in_transit', 'out_for_delivery']) assert.equal((await send({ eventType })).status, 201, eventType);
  // invalid signature payloads are rejected
  assert.equal((await send({ eventType: 'delivered', proofOfDelivery: { recipientName: 'Ada', relation: 'Recipient' }, signature: 'not-an-image' })).status, 400);
  assert.equal((await send({ eventType: 'delivered', proofOfDelivery: { recipientName: 'Ada', relation: 'Recipient' }, signature: 'data:image/png;base64,AAAA' })).status, 400);
  // valid signature is accepted
  const ok = await send({ eventType: 'delivered', proofOfDelivery: { recipientName: 'Ada', relation: 'Recipient' }, signature: PNG });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.shipment.proofOfDelivery.method, 'signature_capture');
  // staff and the owning customer can read it; another customer and anonymous cannot
  assert.equal((await call('GET', `/api/shipments/${ship.id}/proof`, { cookie: admin })).json.proof.signature, PNG);
  assert.equal((await call('GET', `/api/shipments/${ship.id}/proof`, { cookie: await login(CUST_A) })).status, 200);
  assert.equal((await call('GET', `/api/shipments/${ship.id}/proof`, { cookie: await login(CUST_B) })).status, 404);
  assert.equal((await call('GET', `/api/shipments/${ship.id}/proof`)).status, 401);
  // proof media never appears in the public tracking response or the staff list
  assert.ok(!JSON.stringify((await call('GET', '/api/tracking/APX-A-1')).json).includes('base64'));
  const staffList = await call('GET', '/api/shipments', { cookie: admin });
  assert.ok(!JSON.stringify(staffList.json).includes('base64'));
});

test('customs case lifecycle enforces documents, duty payment and roles', async () => {
  const admin = await login(ADMIN);
  const ship = (await call('GET', '/api/shipments', { cookie: admin })).json.shipments.find(x => x.trackingNumber === 'APX-B-1');
  // customers and anonymous users cannot touch customs
  assert.equal((await call('GET', '/api/customs/cases', { cookie: await login(CUST_B) })).status, 403);
  assert.equal((await call('POST', '/api/customs/cases', { body: { shipmentId: ship.id } })).status, 401);
  const opened = await call('POST', '/api/customs/cases', { cookie: admin, body: { shipmentId: ship.id } });
  assert.equal(opened.status, 201);
  const id = opened.json.case.id;
  assert.equal((await call('POST', '/api/customs/cases', { cookie: admin, body: { shipmentId: ship.id } })).status, 409, 'duplicate open case');
  // cannot advance without documents
  assert.equal((await call('PATCH', `/api/customs/cases/${id}`, { cookie: admin, body: { stage: 'assessment' } })).status, 409);
  const required = opened.json.case.checklist.filter(r => r.key !== 'other_permits').map(r => ({ key: r.key, received: true }));
  assert.equal((await call('PATCH', `/api/customs/cases/${id}`, { cookie: admin, body: { checklist: required, stage: 'assessment' } })).status, 200);
  // duty must be paid before clearing
  assert.equal((await call('PATCH', `/api/customs/cases/${id}`, { cookie: admin, body: { duty: { amount: 120.5, currency: 'USD', paid: false } } })).status, 200);
  assert.equal((await call('PATCH', `/api/customs/cases/${id}`, { cookie: admin, body: { stage: 'cleared' } })).status, 409);
  assert.equal((await call('PATCH', `/api/customs/cases/${id}`, { cookie: admin, body: { duty: { amount: 120.5, currency: 'USD', paid: true }, stage: 'cleared' } })).status, 200);
  const cases = (await call('GET', '/api/customs/cases', { cookie: admin })).json.cases;
  assert.equal(cases.find(c => c.id === id).stage, 'cleared');
  assert.ok(cases.find(c => c.id === id).history.length >= 3);
});
