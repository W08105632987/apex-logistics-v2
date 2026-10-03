import 'dotenv/config';
import { createPool, migrate } from '../db/mysql.mjs';
if (!/^mysql:\/\//i.test(process.env.DATABASE_URL || '')) { console.error('Set DATABASE_URL=mysql://user:password@host:3306/database first.'); process.exit(1); }
const pool = createPool(process.env.DATABASE_URL);
const applied = await migrate(pool);
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
await pool.end();
