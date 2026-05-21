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

  console.log('=== profiles policies ===');
  const pol = await client.query(`
    select polname, polcmd,
           pg_get_expr(polqual, polrelid)        as using_expr,
           pg_get_expr(polwithcheck, polrelid)   as check_expr
    from pg_policy where polrelid = 'public.profiles'::regclass
  `);
  for (const p of pol.rows) {
    console.log(`\n  POLICY ${p.polname} (cmd=${p.polcmd})`);
    console.log(`    USING: ${p.using_expr}`);
    console.log(`    CHECK: ${p.check_expr}`);
  }

  console.log('\n=== is_admin function ===');
  const fn = await client.query(`
    select pg_get_functiondef(oid) as def
    from pg_proc where proname = 'is_admin'
  `);
  for (const f of fn.rows) console.log(f.def);

  console.log('\n=== can_see_investor function ===');
  const fn2 = await client.query(`
    select pg_get_functiondef(oid) as def
    from pg_proc where proname = 'can_see_investor'
  `);
  for (const f of fn2.rows) console.log(f.def);

  console.log('\n=== enforce_role_change_rules function ===');
  const fn3 = await client.query(`
    select pg_get_functiondef(oid) as def
    from pg_proc where proname = 'enforce_role_change_rules'
  `);
  for (const f of fn3.rows) console.log(f.def);

  await client.end();
};
main().catch((e) => { console.error(e); process.exit(1); });
