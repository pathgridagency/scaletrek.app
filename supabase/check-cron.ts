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
  const r = await client.query<{ jobid: number; schedule: string; jobname: string; active: boolean }>(
    'select jobid, schedule, jobname, active from cron.job order by jobid'
  );
  console.log('Scheduled cron jobs:');
  for (const row of r.rows) {
    console.log(`  · #${row.jobid} ${row.jobname} → "${row.schedule}" · active=${row.active}`);
  }
  await client.end();
};
main().catch((e) => { console.error(e); process.exit(1); });
