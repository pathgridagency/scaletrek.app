-- ScaleTrek — Phase 19: payments-coming-soon mode.
-- Stripe is unavailable in Morocco. We keep all of phase-18 infra (subscriptions
-- table, is_pro(), entitlement gates) but the client paywall switches to an
-- "interest list" capture until a region-friendly gateway is wired in.
-- Idempotent.

create table if not exists pro_interest (
  user_id     uuid primary key references profiles(id) on delete cascade,
  plan        text check (plan in ('monthly', 'yearly')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table pro_interest enable row level security;

drop policy if exists pro_interest_self on pro_interest;
create policy pro_interest_self on pro_interest for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists pro_interest_admin on pro_interest;
create policy pro_interest_admin on pro_interest for all
  using (is_admin()) with check (is_admin());

create or replace function touch_pro_interest_updated() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_pro_interest_touch on pro_interest;
create trigger trg_pro_interest_touch before update on pro_interest
  for each row execute function touch_pro_interest_updated();
