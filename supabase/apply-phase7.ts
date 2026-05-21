/* eslint-disable no-console */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const loadEnv = (): Record<string, string> => {
  const envPath = path.join(HERE, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
};

const main = async () => {
  const env = loadEnv();
  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not configured.');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('connected.');
  const sql = fs.readFileSync(path.join(HERE, 'phase7_privacy.sql'), 'utf8');
  await client.query(sql);
  console.log('phase7_privacy.sql applied.');
  // Sanity probe
  const r = await client.query<{ exists: boolean }>(
    `select exists (select 1 from information_schema.views where table_name = 'public_profiles') as exists`,
  );
  console.log('public_profiles exists:', r.rows[0].exists);
  await client.end();
};

main().catch((e) => {
  console.error('apply-phase7 failed:', e);
  process.exit(1);
});
