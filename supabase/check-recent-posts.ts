/* eslint-disable no-console */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const loadEnv = () => {
  const p = path.join(HERE, '..', '.env');
  const out: Record<string, string> = {};
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = l.trim(); if (!t || t.startsWith('#')) continue;
    const e = t.indexOf('='); out[t.slice(0, e)] = t.slice(e + 1);
  }
  return out;
};
const main = async () => {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    select id, user_id, type, milestone_title, removed, scheduled_for, status, created_at
    from posts order by created_at desc limit 10
  `);
  console.log('Last 10 posts:');
  for (const x of r.rows) {
    console.log(`  [${x.created_at.toISOString()}] type=${x.type} status=${x.status} removed=${x.removed} title="${x.milestone_title}"`);
  }
  const v = await c.query(`
    select id, milestone_title, scheduled_for
    from post_feed order by created_at desc limit 10
  `);
  console.log('\nFrom post_feed (server-side, no auth.uid context):');
  for (const x of v.rows) console.log(`  ${x.milestone_title} sched=${x.scheduled_for ?? '-'}`);
  await c.end();
};
main().catch((e) => { console.error(e); process.exit(1); });
