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
  const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('\n=== posts columns ===');
  const cols = await client.query(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema='public' and table_name='posts'
    order by ordinal_position
  `);
  for (const c of cols.rows) {
    console.log(`  ${c.column_name.padEnd(30)} ${String(c.data_type).padEnd(28)} null=${c.is_nullable} default=${c.column_default ?? '-'}`);
  }

  console.log('\n=== post_feed columns ===');
  const v = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema='public' and table_name='post_feed'
    order by ordinal_position
  `);
  for (const c of v.rows) {
    console.log(`  ${c.column_name.padEnd(30)} ${c.data_type}`);
  }

  console.log('\n=== posts RLS policies ===');
  const pol = await client.query(`select polname, polcmd from pg_policy where polrelid = 'public.posts'::regclass`);
  for (const p of pol.rows) console.log(`  ${p.polname} (${p.polcmd})`);

  console.log('\n=== triggers on posts ===');
  const trg = await client.query(`select tgname from pg_trigger where tgrelid='public.posts'::regclass and not tgisinternal`);
  for (const t of trg.rows) console.log(`  ${t.tgname}`);

  await client.end();
};
main().catch((e) => { console.error(e); process.exit(1); });
