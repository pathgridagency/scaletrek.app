/* eslint-disable no-console */
// Removes every demo account created by seed-demo-accounts.ts and all of its
// data (profiles, posts, swipes, matches, etc. cascade via foreign keys).
//
//   npx tsx supabase/clear-demo-accounts.ts
//
// Scoped strictly to the @demo.scaletrek.app email domain — the real admin
// account and any genuine user data are never touched.
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DOMAIN = 'demo.scaletrek.app';

const loadEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(HERE, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const e = t.indexOf('=');
    if (e > 0) out[t.slice(0, e).trim()] = t.slice(e + 1).trim();
  }
  return out;
};

const main = async () => {
  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing from .env');
  const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('connected.');

  const before = await client.query(
    `select count(*)::int as n from auth.users where email like '%@' || $1`,
    [DEMO_DOMAIN],
  );
  const n = before.rows[0].n as number;
  if (n === 0) {
    console.log('no demo accounts found — nothing to delete.');
    await client.end();
    return;
  }

  const del = await client.query(
    `delete from auth.users where email like '%@' || $1`,
    [DEMO_DOMAIN],
  );
  console.log(
    `deleted ${del.rowCount ?? 0} demo accounts — their profiles, posts, swipes and matches cascaded.`,
  );
  await client.end();
};

main().catch((e) => {
  console.error('cleanup failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
