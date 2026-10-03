// One-time import of an existing apex-data.json into MySQL. Usage: node scripts/import-json-to-mysql.mjs [path]
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createPool, migrate, saveDiff } from '../db/mysql.mjs';
const file = process.argv[2] || './data/apex-data.json';
if (!/^mysql:\/\//i.test(process.env.DATABASE_URL || '')) { console.error('Set DATABASE_URL=mysql://... first.'); process.exit(1); }
const pool = createPool(process.env.DATABASE_URL); await migrate(pool);
const store = JSON.parse(await readFile(file, 'utf8'));
await saveDiff(pool, store, {});
console.log('Imported records from', file);
await pool.end();
