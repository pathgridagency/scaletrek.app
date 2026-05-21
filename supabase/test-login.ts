/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';

const URL = 'https://yhezvbyngzimzmoyhtjl.supabase.co';
const KEY = 'sb_publishable_0XPyiIo0IkOG87j0mnvw6g_LxlxLjfU';
const EMAIL = 'scaletrek.app@gmail.com';
const PASSWORD = 'KILLMILL2025@@';

const main = async () => {
  const supabase = createClient(URL, KEY, {
    auth: { persistSession: false },
  });
  console.log('attempting signInWithPassword...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) {
    console.log('  ✗ AUTH FAILED:', error.message);
    console.log('  details:', error);
    return;
  }
  console.log('  ✓ auth OK, user id:', data.user?.id);
  console.log('  fetching profile...');
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, name, username, role, verification_level, momentum_score')
    .eq('id', data.user!.id)
    .maybeSingle();
  if (pErr) {
    console.log('  ✗ profile fetch failed:', pErr.message);
    return;
  }
  console.log('  ✓ profile:', profile);
};

main().catch((err) => {
  console.error('UNEXPECTED:', err);
  process.exit(1);
});
