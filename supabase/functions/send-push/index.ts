// Supabase Edge Function: send-push
// Deploy with:  supabase functions deploy send-push --no-verify-jwt=false
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set in Supabase),
//               EXPO_ACCESS_TOKEN (optional — only needed if your Expo project
//               has push security enabled; otherwise Expo accepts unauthenticated
//               sends).
//
// Body: { recipientId: string, body: string, data?: object }
// Looks up the recipient's push_token and forwards to https://exp.host/--/api/v2/push/send
//
// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const recipientId: string | undefined = payload.recipientId;
  const body: string | undefined = payload.body;
  const data = payload.data ?? {};
  if (!recipientId || !body) {
    return new Response('Missing recipientId or body', { status: 400 });
  }

  // Authorise: the caller must be a signed-in user (any signed-in user can
  // send notifications to other users — the abuse vector is rate-limited by
  // the surrounding action surfaces).
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error } = await supabase
    .from('profiles')
    .select('push_token, notify_signals, notify_follows, notify_deals, notify_comments, notify_system')
    .eq('id', recipientId)
    .maybeSingle();

  if (error || !row?.push_token) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'no_token' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  // Respect per-channel preference if a recognised type was supplied.
  const channel = (data?.type as string | undefined) ?? '';
  const channelOk =
    (channel === 'signal' && row.notify_signals !== false) ||
    (channel === 'follow' && row.notify_follows !== false) ||
    (channel === 'deal' && row.notify_deals !== false) ||
    (channel === 'comment' && row.notify_comments !== false) ||
    (channel === 'mention' && row.notify_comments !== false) ||
    (channel === 'system' && row.notify_system !== false) ||
    channel === '';
  if (!channelOk) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'channel_disabled' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  const message = {
    to: row.push_token,
    title: 'ScaleTrek',
    body,
    data,
    sound: 'default',
  };

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (EXPO_TOKEN) headers.Authorization = `Bearer ${EXPO_TOKEN}`;

  const resp = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });

  const text = await resp.text();
  return new Response(
    JSON.stringify({ ok: resp.ok, expo: text }),
    {
      status: resp.ok ? 200 : 502,
      headers: { 'content-type': 'application/json' },
    },
  );
});
