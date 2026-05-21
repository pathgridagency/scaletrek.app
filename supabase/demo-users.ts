// One-shot script for a fresh dev project: creates demo accounts via the
// Supabase admin API. Requires SUPABASE_SERVICE_ROLE_KEY (NOT the anon key).
//
//   npx ts-node supabase/demo-users.ts
//
// Safe to re-run: ignores existing emails.

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const demo = [
  { email: 'admin@scaletrek.app', password: 'admin123', name: 'ScaleTrek Admin', username: '@admin', role: 'admin', industry: 'Operations' },
  { email: 'karim@scaletrek.app', password: 'demo1234', name: 'Karim Benali', username: '@karimb', role: 'dreamer', industry: 'AgriTech' },
  { email: 'youssef@scaletrek.app', password: 'demo1234', name: 'Youssef Idrissi', username: '@yidrissi', role: 'dreamer', industry: 'FinTech' },
  { email: 'nour@scaletrek.app', password: 'demo1234', name: 'Nour Hamidi', username: '@nourh', role: 'investor', industry: 'Venture' },
  { email: 'salma@scaletrek.app', password: 'demo1234', name: 'Salma Tazi', username: '@salmatazi', role: 'dreamer', industry: 'EdTech' },
];

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

(async () => {
  for (const u of demo) {
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((x) => x.email?.toLowerCase() === u.email);
    let id = found?.id;
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, username: u.username, avatar: initials(u.name) },
      });
      if (error) { console.error(u.email, error.message); continue; }
      id = data.user!.id;
    }
    await admin
      .from('profiles')
      .upsert({
        id,
        name: u.name,
        username: u.username,
        avatar: initials(u.name),
        role: u.role,
        industry: u.industry,
        verification_level: u.role === 'admin' ? 'elite' : 'basic',
        momentum_score: u.role === 'admin' ? 100 : 80,
      });
    console.log('ok', u.email);
  }
  console.log('Done.');
})();
