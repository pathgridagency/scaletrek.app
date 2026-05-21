// ScaleTrek client-side feature flags.
//
// Flip to `true` once the prerequisite infra is in place. Each flag has a
// short note explaining what's gating it. Keep these in source so they ship
// with the bundle — no Supabase round-trip needed to decide whether to render.

export const FEATURES = {
  // AI Pitch Coach (Elite tier). Edge Function `pitch-coach` is deployed but
  // needs an `ANTHROPIC_API_KEY` secret in the Supabase Dashboard before it
  // can actually call Claude. Until then we show a "Coming soon" UI.
  pitchCoach: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;
