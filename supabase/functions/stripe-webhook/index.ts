// Supabase Edge Function: stripe-webhook
// Receives Stripe webhook events and reconciles the `subscriptions` table.
//
// Deploy (do NOT verify JWT — Stripe is the caller, not the app):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Required Function env:
//   STRIPE_SECRET_KEY        — Stripe secret (used to fetch subscription objects)
//   STRIPE_WEBHOOK_SECRET    — endpoint signing secret from the Stripe dashboard
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-injected
//
// Configure the webhook endpoint in Stripe to:
//   https://<project>.supabase.co/functions/v1/stripe-webhook
// Selected events:
//   checkout.session.completed
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//
// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number;
  canceled_at: number | null;
  start_date: number | null;
  metadata: Record<string, string>;
  items: { data: { price: { id: string } }[] };
}

const verifyStripeSignature = async (
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> => {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k.trim(), (v ?? '').trim()];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const signed = `${t}.${body}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signed));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // constant-time compare
  if (hex.length !== v1.length) return false;
  let result = 0;
  for (let i = 0; i < hex.length; i++) result |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return result === 0;
};

const fetchStripeSubscription = async (id: string): Promise<StripeSubscription | null> => {
  const resp = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as StripeSubscription;
};

const mapStatus = (stripeStatus: string): string => {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      return stripeStatus;
    case 'incomplete_expired':
    case 'unpaid':
      return 'past_due';
    default:
      return 'none';
  }
};

const upsertSubscription = async (
  client: SupabaseClient,
  sub: StripeSubscription,
  userId: string,
) => {
  const status = mapStatus(sub.status);
  const tier = status === 'active' || status === 'trialing' ? 'pro' : 'free';
  const row = {
    user_id: userId,
    tier,
    status,
    provider: 'stripe',
    provider_customer_id: sub.customer,
    provider_subscription_id: sub.id,
    price_id: sub.items?.data?.[0]?.price?.id ?? null,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    started_at: sub.start_date ? new Date(sub.start_date * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  };
  const { error } = await client.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const signature = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();
  const ok = await verifyStripeSignature(rawBody, signature, WEBHOOK_SECRET);
  if (!ok) return new Response('Bad signature', { status: 400 });

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const extractUserId = (obj: any): string | undefined => {
    return obj?.metadata?.supabase_user_id || obj?.client_reference_id || undefined;
  };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId: string | undefined = session.subscription;
        const userId = extractUserId(session);
        if (subscriptionId && userId) {
          const sub = await fetchStripeSubscription(subscriptionId);
          if (sub) await upsertSubscription(client, sub, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        const userId = extractUserId(sub);
        if (userId) {
          // For .deleted Stripe still includes the row with status=canceled.
          await upsertSubscription(client, sub, userId);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('webhook handler failed', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
