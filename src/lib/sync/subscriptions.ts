import { supabase } from '../supabase';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionInterval,
} from '../../store/useSubscriptionStore';

interface SubscriptionRow {
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  interval: SubscriptionInterval | null;
  provider: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  started_at: string | null;
}

const rowToSubscription = (row: SubscriptionRow): Subscription => ({
  tier: row.tier,
  status: row.status,
  interval: row.interval ?? undefined,
  provider: (row.provider as 'stripe') ?? undefined,
  providerSubscriptionId: row.provider_subscription_id ?? undefined,
  currentPeriodEnd: row.current_period_end ?? undefined,
  cancelAtPeriodEnd: row.cancel_at_period_end,
  startedAt: row.started_at ?? undefined,
});

export const fetchMySubscription = async (
  userId: string,
): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'user_id,tier,status,interval,provider,provider_subscription_id,current_period_end,cancel_at_period_end,started_at',
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSubscription(data as SubscriptionRow) : null;
};

export const startStripeCheckout = async (
  tier: 'pro' | 'elite',
  interval: SubscriptionInterval,
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'stripe-checkout',
    { body: { tier, interval } },
  );
  if (error) throw error;
  if (!data?.url) throw new Error('No checkout URL returned.');
  return data.url;
};

// Stripe is unavailable in some regions (e.g. Morocco). Until a region-friendly
// gateway is wired in, the SubscriptionScreen captures intent into pro_interest
// so we can email users the moment Pro/Elite launches in their region.
export const registerProInterest = async (
  tier: 'pro' | 'elite',
  interval: SubscriptionInterval,
  notes?: string,
): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('pro_interest')
    .upsert(
      { user_id: userId, tier, plan: interval, notes: notes ?? null },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
};

export const fetchMyProInterest = async (): Promise<{
  tier: 'pro' | 'elite';
  interval: SubscriptionInterval;
  notes?: string;
  updatedAt: string;
} | null> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('pro_interest')
    .select('tier,plan,notes,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { tier: 'pro' | 'elite' | null; plan: SubscriptionInterval; notes: string | null; updated_at: string };
  return {
    tier: row.tier ?? 'pro',
    interval: row.plan,
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at,
  };
};
