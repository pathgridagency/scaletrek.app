/* eslint-disable no-console */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const loadEnv = () => {
  const envPath = path.join(HERE, '..', '.env');
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('='); out[t.slice(0, eq)] = t.slice(eq + 1);
  }
  return out;
};
const main = async () => {
  const env = loadEnv();
  const c = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log('=== triggers on posts ===');
  const t = await c.query(`select tgname, tgfoid::regproc as fn from pg_trigger where tgrelid='public.posts'::regclass and not tgisinternal`);
  for (const r of t.rows) console.log(`  ${r.tgname} -> ${r.fn}`);
  console.log('\n=== trg_showcase_count fn body ===');
  const r = await c.query(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_trigger tr on tr.tgfoid = p.oid where tr.tgname = 'trg_showcase_count'`);
  for (const x of r.rows) console.log(x.def);
  console.log('\n=== updated_at fn ===');
  const r2 = await c.query(`select pg_get_functiondef(p.oid) as def from pg_proc p where proname = 'touch_updated_at'`);
  for (const x of r2.rows) console.log(x.def);
  await c.end();
};
main().catch((e) => { console.error(e); process.exit(1); });
