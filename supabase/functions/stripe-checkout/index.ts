// Supabase Edge Function: stripe-checkout
// Creates a Stripe Checkout session for the calling user and returns the URL
// the app should open in the in-app browser.
//
// Deploy:  supabase functions deploy stripe-checkout
// Required Function env:
//   STRIPE_SECRET_KEY          — your Stripe secret (sk_live_... / sk_test_...)
//   STRIPE_PRICE_MONTHLY       — Stripe price id for the monthly plan
//   STRIPE_PRICE_YEARLY        — Stripe price id for the yearly plan
//   APP_DEEP_LINK_SUCCESS      — defaults to "scaletrek://billing-success"
//   APP_DEEP_LINK_CANCEL       — defaults to "scaletrek://billing-cancel"
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected.
//
// Body: { plan: "monthly" | "yearly" }
// Auth: requires the caller's Supabase JWT in Authorization: Bearer …
//
// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_MONTHLY')!;
const PRICE_YEARLY = Deno.env.get('STRIPE_PRICE_YEARLY')!;
const SUCCESS_URL = Deno.env.get('APP_DEEP_LINK_SUCCESS') ?? 'scaletrek://billing-success';
const CANCEL_URL = Deno.env.get('APP_DEEP_LINK_CANCEL') ?? 'scaletrek://billing-cancel';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  // Verify the JWT and look up the user id + email.
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResp, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userResp.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }
  const user = userResp.user;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const plan: 'monthly' | 'yearly' = body.plan === 'yearly' ? 'yearly' : 'monthly';
  const priceId = plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;
  if (!priceId) {
    return new Response('Stripe price ids not configured', { status: 500, headers: corsHeaders });
  }

  // Reuse an existing customer if we already have one for this user.
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const existingCustomerId = existing?.provider_customer_id ?? undefined;

  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('success_url', SUCCESS_URL);
  params.set('cancel_url', CANCEL_URL);
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('client_reference_id', user.id);
  params.set('metadata[supabase_user_id]', user.id);
  params.set('subscription_data[metadata][supabase_user_id]', user.id);
  if (existingCustomerId) {
    params.set('customer', existingCustomerId);
  } else if (user.email) {
    params.set('customer_email', user.email);
  }
  params.set('allow_promotion_codes', 'true');

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const text = await resp.text();
  if (!resp.ok) {
    return new Response(JSON.stringify({ ok: false, stripe: text }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const session = JSON.parse(text);
  return new Response(JSON.stringify({ url: session.url, id: session.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
