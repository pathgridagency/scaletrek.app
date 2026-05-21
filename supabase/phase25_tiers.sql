-- ScaleTrek — Phase 25: 3-tier subscriptions (Free / Pro / Elite, monthly+yearly)
-- Extends Phase 18's `subscriptions` schema with an `elite` enum value, an
-- `interval` column (monthly|yearly), an `is_elite()` helper, and exposes both
-- through `public_profiles`. Also extends `pro_interest` with tier+interval so
-- the register-interest flow distinguishes which plan the user wants.
-- Idempotent.

-- ───────── enum extension ─────────
-- NOTE: `subscription_tier ADD VALUE 'elite'` lives in phase25a_tier_enum.sql
-- because Postgres won't let a newly-added enum value be used in the same
-- transaction. Apply that file first.

do $$ begin
  create type subscription_interval as enum ('monthly', 'yearly');
exception when duplicate_object then null; end $$;

-- ───────── subscriptions columns ─────────
alter table subscriptions
  add column if not exists interval subscription_interval;

-- ───────── helpers ─────────
-- Re-define is_pro() so it covers both pro AND elite tiers.
create or replace function is_pro(uid uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and s.tier in ('pro', 'elite')
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function is_elite(uid uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and s.tier = 'elite'
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ───────── pro_interest extension ─────────
-- Was Phase 19: only captured plan ('monthly' | 'yearly').
-- Now also captures which tier the user wants (pro | elite).
alter table pro_interest
  add column if not exists tier text check (tier in ('pro', 'elite')) default 'pro';

-- ───────── refresh public_profiles to expose is_elite ─────────
drop view if exists public_profiles cascade;
create view public_profiles
  with (security_invoker = false) as
select
  p.id,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then coalesce(p.anon_alias, 'Verified Investor')
       else p.name end                                          as name,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then '@hidden'
       else p.username end                                      as username,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 'IV'
       else p.avatar end                                        as avatar,
  p.role,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 'Identity revealed only after engagement.'
       else coalesce(p.bio, '') end                             as bio,
  p.industry,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.momentum_score end                         as momentum_score,
  p.verification_level,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.followers end                              as followers,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.following end                              as following,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then 0 else p.showcase_count end                         as showcase_count,
  p.suspended,
  p.preferred_currency,
  p.preferred_language,
  p.public_key,
  p.joined_at,
  p.reveal_to_all,
  p.profile_complete,
  p.onboarded,
  is_pro(p.id)                                                  as is_pro,
  is_elite(p.id)                                                as is_elite,
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;
grant select on public_profiles to authenticated;
