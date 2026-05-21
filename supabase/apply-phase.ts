/* eslint-disable no-console */
// Apply a single phase SQL file. Usage: npx tsx supabase/apply-phase.ts phase8_oauth.sql
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
  const file = process.argv[2];
  if (!file) {
    console.error('usage: tsx supabase/apply-phase.ts <file.sql>');
    process.exit(2);
  }
  const env = loadEnv();
  const cs = env.DATABASE_URL;
  if (!cs) throw new Error('DATABASE_URL missing.');
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('connected.');
  const sql = fs.readFileSync(path.join(HERE, file), 'utf8');
  await client.query(sql);
  console.log(`${file} applied.`);
  await client.end();
};

main().catch((e) => {
  console.error('apply-phase failed:', e);
  process.exit(1);
});
