// MySQL / MariaDB persistence adapter. Selected when DATABASE_URL starts with mysql://
import mysql from 'mysql2/promise';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const COLLECTIONS = ['users','shipments','events','quotes','bookings','supportTickets','notifications','documents','savedAddresses','vehicles','facilities','notificationJobs','contactRequests','auditLogs','customsCases'];
const table = name => `apex_${name}`;

export function createPool(url) { return mysql.createPool({ uri: url, connectionLimit: 8, waitForConnections: true, charset: 'utf8mb4' }); }

export async function migrate(pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
  const [rows] = await pool.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map(r => r.name));
  const files = (await readdir(path.join(dir, 'migrations'))).filter(f => f.endsWith('.sql')).sort();
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, 'migrations', file), 'utf8');
    const conn = await pool.getConnection();
    try {
      for (const statement of sql.split(/;\s*\n/).map(s => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) await conn.query(statement);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      applied.push(file);
    } finally { conn.release(); }
  }
  return applied;
}

/** Loads every collection into the in-memory store and remembers each row's serialized form. */
export async function loadAll(pool, store, snapshot) {
  for (const name of COLLECTIONS) {
    const [rows] = await pool.query(`SELECT id, data FROM ${table(name)}`);
    store[name] = rows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
    const map = new Map(); for (const item of store[name]) map.set(String(item.id), JSON.stringify(item));
    snapshot[name] = map;
  }
}

/** Writes only rows that changed, inside one transaction so a failure leaves the database untouched. */
export async function saveDiff(pool, store, snapshot) {
  const conn = await pool.getConnection();
  const next = {};
  try {
    await conn.beginTransaction();
    for (const name of COLLECTIONS) {
      const before = snapshot[name] || new Map(); const after = new Map();
      for (const item of store[name] || []) {
        const id = String(item.id); const json = JSON.stringify(item); after.set(id, json);
        if (before.get(id) !== json) await conn.query(`INSERT INTO ${table(name)} (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`, [id, json]);
      }
      for (const id of before.keys()) if (!after.has(id)) await conn.query(`DELETE FROM ${table(name)} WHERE id = ?`, [id]);
      next[name] = after;
    }
    await conn.commit();
    Object.assign(snapshot, next);
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}
