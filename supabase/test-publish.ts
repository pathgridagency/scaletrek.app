/* eslint-disable no-console */
// Reproduces what the app does when publishing a milestone, using the admin's
// authenticated session. Reveals the real Supabase error if anything is wrong.
import { createClient } from '@supabase/supabase-js';
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
  const url = env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or anon key missing.');
  const sb = createClient(url, key);

  console.log('signing in as admin...');
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: 'scaletrek.app@gmail.com',
    password: 'KILLMILL2025@@',
  });
  if (authErr) { console.error('login failed:', authErr); process.exit(1); }
  const uid = auth.user!.id;
  console.log('logged in as', uid);

  const row = {
    user_id: uid,
    type: 'dreamer',
    milestone_title: 'Smoke test from server script',
    description: 'Testing if posts insert works after recent migrations.',
    tags: ['test'],
    industry: 'General',
    risk_score: 5,
    reward_score: 5,
  };

  console.log('inserting post...');
  const { data, error } = await sb.from('posts').insert(row).select('id,user_id').single();
  if (error) {
    console.error('INSERT FAILED:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
  console.log('inserted post id =', data.id);

  console.log('reading back from post_feed...');
  const { data: view, error: viewErr } = await sb
    .from('post_feed')
    .select('*')
    .eq('id', data.id)
    .single();
  if (viewErr) {
    console.error('VIEW READ FAILED:', JSON.stringify(viewErr, null, 2));
    process.exit(1);
  }
  console.log('view ok, user_name =', view.user_name);

  console.log('cleaning up...');
  await sb.from('posts').delete().eq('id', data.id);
  console.log('done.');
};
main().catch((e) => { console.error('UNEXPECTED', e); process.exit(1); });
