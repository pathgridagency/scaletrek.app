// Supabase Edge Function: purge-stories
// Deletes stories whose `expires_at` has passed and removes their objects from
// the `stories` storage bucket. Wire this to a daily cron (or run hourly).
//
// Deploy:  supabase functions deploy purge-stories
// Schedule (in Supabase Dashboard → Edge Functions → schedules, every hour):
//   0 * * * *
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set in Supabase).
//
// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Find expired story rows so we can drop their storage objects too.
  const { data: expired, error: selErr } = await supabase
    .from('stories')
    .select('id, storage_path')
    .lte('expires_at', new Date().toISOString())
    .limit(1000);
  if (selErr) {
    return new Response(JSON.stringify({ ok: false, error: selErr.message }), { status: 500 });
  }
  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ ok: true, deleted: 0 }));
  }

  const paths = expired.map((r: any) => r.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from('stories').remove(paths).catch((e) => {
      console.warn('[purge-stories] storage remove warning', e);
    });
  }

  const ids = expired.map((r: any) => r.id);
  const { error: delErr } = await supabase.from('stories').delete().in('id', ids);
  if (delErr) {
    return new Response(JSON.stringify({ ok: false, error: delErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, deleted: ids.length }), {
    headers: { 'content-type': 'application/json' },
  });
});
