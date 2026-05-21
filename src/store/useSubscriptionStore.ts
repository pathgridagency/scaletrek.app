import { create } from 'zustand';

// Phase 18 + 25 — ScaleTrek tiered subscription state.
// Hydrated from `subscriptions` table via the sync layer; webhook-reconciled
// server-side. The `tier` field is the source of truth for entitlement gates.

export type SubscriptionTier = 'free' | 'pro' | 'elite';
export type SubscriptionInterval = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'none';

export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  interval?: SubscriptionInterval;
  provider?: 'stripe';
  providerSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  startedAt?: string;
}

interface SubscriptionState {
  subscription: Subscription;
  isPro: boolean;
  isElite: boolean;
  set: (s: Partial<Subscription>) => void;
  reset: () => void;
}

const defaultSubscription: Subscription = {
  tier: 'free',
  status: 'none',
};

const isActive = (s: Subscription) => s.status === 'active' || s.status === 'trialing';

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscription: defaultSubscription,
  isPro: false,
  isElite: false,
  set: (partial) =>
    set((s) => {
      const next: Subscription = { ...s.subscription, ...partial };
      const active = isActive(next);
      return {
        subscription: next,
        // `isPro` is the umbrella entitlement — true for Pro AND Elite.
        isPro: (next.tier === 'pro' || next.tier === 'elite') && active,
        isElite: next.tier === 'elite' && active,
      };
    }),
  reset: () => set({ subscription: defaultSubscription, isPro: false, isElite: false }),
}));
