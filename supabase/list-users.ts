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
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
};

const main = async () => {
  const env = loadEnv();
  const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const r = await client.query(
    `select u.id, u.email, p.username, p.role, p.name, u.created_at
       from auth.users u left join profiles p on p.id = u.id
      order by u.created_at`,
  );
  console.log(`auth.users (${r.rowCount}):`);
  for (const row of r.rows) console.log(' ', row);
  await client.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
