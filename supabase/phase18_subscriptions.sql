-- ScaleTrek — Phase 18: ScaleTrek Pro subscription state.
-- One row per user. The Stripe webhook (service-role) is the only writer;
-- the client reads its own row and the realtime channel pushes updates.
-- Idempotent.

do $$ begin
  create type subscription_tier as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'none'
  );
exception when duplicate_object then null; end $$;

create table if not exists subscriptions (
  user_id                  uuid primary key references profiles(id) on delete cascade,
  tier                     subscription_tier   not null default 'free',
  status                   subscription_status not null default 'none',
  provider                 text,
  provider_customer_id     text,
  provider_subscription_id text,
  price_id                 text,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  started_at               timestamptz,
  canceled_at              timestamptz,
  updated_at               timestamptz not null default now()
);
create index if not exists subscriptions_status_idx on subscriptions(status);
create index if not exists subscriptions_provider_sub_idx on subscriptions(provider_subscription_id);

alter table subscriptions enable row level security;

-- Read your own row; admins can read any.
drop policy if exists subscriptions_read_self on subscriptions;
create policy subscriptions_read_self on subscriptions for select
  using (user_id = auth.uid() or is_admin());

-- No client writes — the webhook uses the service role which bypasses RLS.
-- (Admin policy is here for manual maintenance via the dashboard.)
drop policy if exists subscriptions_admin_write on subscriptions;
create policy subscriptions_admin_write on subscriptions for all
  using (is_admin()) with check (is_admin());

create or replace function touch_subscription_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_subscriptions_updated on subscriptions;
create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function touch_subscription_updated_at();

-- Auto-create a free row when a profile is inserted so client reads never miss.
create or replace function ensure_subscription_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (user_id, tier, status)
  values (new.id, 'free', 'none')
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists trg_ensure_subscription_row on profiles;
create trigger trg_ensure_subscription_row after insert on profiles
  for each row execute function ensure_subscription_row();

-- Backfill rows for existing profiles.
insert into subscriptions (user_id, tier, status)
  select p.id, 'free', 'none' from profiles p
   where not exists (select 1 from subscriptions s where s.user_id = p.id);

-- Entitlement helper used by other policies + the client.
create or replace function is_pro(uid uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and s.tier = 'pro'
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- Realtime: include subscriptions so the client picks up webhook-driven flips.
do $$
begin
  begin
    alter publication supabase_realtime add table public.subscriptions;
  exception when duplicate_object then null;
  end;
end $$;

-- Rebuild public_profiles to expose `is_pro` so any list of users (feed cards,
-- chat headers, profile screens) can render the Pro badge with no extra query.
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
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;
grant select on public_profiles to authenticated;
