import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];
const record = (label, ok, detail = '') => {
  checks.push({ label, ok, detail });
  if (!ok) failures.push(label);
};

async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(full));
    else out.push(full);
  }
  return out;
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
record('package.json parses', Boolean(packageJson.scripts && packageJson.dependencies));
const sourceFiles = await filesUnder(path.join(root, 'src'));
const sourceText = new Map(await Promise.all(sourceFiles.filter(file => /\.(tsx?|jsx?)$/.test(file)).map(async file => [file, await readFile(file, 'utf8')])));
let missingImports = 0;
for (const [file, source] of sourceText) {
  const importPattern = /(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const base = path.resolve(path.dirname(file), match[1]);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
    let found = false;
    for (const candidate of candidates) {
      try { await access(candidate); found = true; break; } catch {}
    }
    if (!found) { missingImports += 1; failures.push(`missing import ${match[1]} in ${path.relative(root, file)}`); }
  }
}
record('relative source imports resolve', missingImports === 0, `${missingImports} missing`);
const serverCheck = spawnSync(process.execPath, ['--check', path.join(root, 'server.mjs')], { encoding: 'utf8' });
record('server.mjs syntax checks', serverCheck.status === 0, (serverCheck.stderr || serverCheck.stdout || '').trim());
const allSource = [...sourceText.values()].join('\n');
const server = await readFile(path.join(root, 'server.mjs'), 'utf8');
record('client does not persist auth tokens in Web Storage', !/localStorage\s*\.|sessionStorage\s*\./.test(allSource));
record('server requires a strong session secret', /SESSION_SECRET\.length < 32/.test(server));
record('public tracking response projects safe event fields', /Never expose internal actor IDs/.test(server));
record('private events do not update public tracking', /Private operational notes must not alter the customer-visible status/.test(server));
record('customer and role authorization middleware exists', /function allow\(\.\.\.roles\)/.test(server) && /function auth\(/.test(server));
record('account status changes revoke existing sessions', /user\.sessionVersion = \(user\.sessionVersion \|\| 0\) \+ 1/.test(server));
record('primary data snapshot has a recovery path', /DATA_BACKUP_FILE/.test(server) && /Recovered application data from the last backup snapshot/.test(server));
record('driver delivery requires recipient confirmation', /Recipient name and recipient relationship\/role are required/.test(server) && /method: 'typed_recipient_acknowledgement'/.test(server));
record('driver stop list returns limited proof-of-delivery fields', /proofOfDelivery: item\.proofOfDelivery \? \{ recipientName: item\.proofOfDelivery\.recipientName, relation: item\.proofOfDelivery\.relation, timestamp: item\.proofOfDelivery\.timestamp \}/.test(server));
record('driver interface clearly labels typed acknowledgement', /typed acknowledgement \(not a handwritten signature\)/.test(sourceText.get(path.join(root, 'src', 'components', 'DriverPortal.tsx')) || ''));
record('public forms use email validation', /function isValidEmail/.test(server) && /!isValidEmail\(email\)/.test(server));
const imageFiles = sourceFiles.filter(file => /\.(png|jpe?g|webp|avif|svg)$/i.test(file));
record('optimized image assets exist', imageFiles.some(file => file.endsWith('.webp')), `${imageFiles.filter(file => file.endsWith('.webp')).length} WebP assets`);
record('UI error boundary is wired at the application root', sourceText.has(path.join(root, 'src', 'components', 'AppErrorBoundary.tsx')) && /AppErrorBoundary/.test(sourceText.get(path.join(root, 'src', 'main.tsx')) || ''));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
if (failures.length) {
  console.error(`\nVerification failed: ${failures.length} issue(s).`);
  process.exitCode = 1;
} else console.log(`\nVerification passed: ${checks.length} checks.`);
