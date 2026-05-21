-- ScaleTrek — Phase 7: Investor Privacy
-- "Anonymous until they engage": investor names/bios/momentum stay hidden
-- behind an anon_alias until the investor opts in (per-user or global) OR a
-- deal exists between investor and dreamer.
-- Idempotent: safe to re-run.

-- ────────────────────── 1. Profile columns ──────────────────────
alter table profiles add column if not exists anon_alias text;
alter table profiles add column if not exists reveal_to_all boolean not null default false;

-- Backfill aliases for existing investors that don't have one.
update profiles
   set anon_alias = 'Investor #' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')
 where role = 'investor' and (anon_alias is null or anon_alias = '');

-- Auto-assign on insert / role-change.
create or replace function ensure_investor_alias() returns trigger
language plpgsql as $$
begin
  if new.role = 'investor' and (new.anon_alias is null or new.anon_alias = '') then
    new.anon_alias :=
      'Investor #' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
  end if;
  return new;
end $$;
drop trigger if exists trg_investor_alias on profiles;
create trigger trg_investor_alias before insert or update on profiles
  for each row execute function ensure_investor_alias();

-- ─────────────────── 2. Per-user reveal grants ──────────────────
create table if not exists investor_reveals (
  investor_id uuid not null references profiles(id) on delete cascade,
  to_user_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (investor_id, to_user_id),
  check (investor_id <> to_user_id)
);
alter table investor_reveals enable row level security;

drop policy if exists investor_reveals_read  on investor_reveals;
drop policy if exists investor_reveals_write on investor_reveals;
create policy investor_reveals_read on investor_reveals
  for select to authenticated
  using (investor_id = auth.uid() or to_user_id = auth.uid() or is_admin());
create policy investor_reveals_write on investor_reveals
  for all to authenticated
  using (investor_id = auth.uid()) with check (investor_id = auth.uid());

-- ───────────────────── 3. Visibility helper ─────────────────────
-- True when the calling user is allowed to see investor's real identity.
create or replace function can_see_investor(investor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    investor = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from profiles where id = investor and reveal_to_all = true)
    or exists (
      select 1 from investor_reveals
       where investor_id = investor and to_user_id = auth.uid()
    )
    or exists (
      select 1 from deals
       where deals.investor_id = investor and deals.dreamer_id = auth.uid()
    )
    or exists (
      select 1 from deals
       where deals.dreamer_id  = investor and deals.investor_id = auth.uid()
    );
$$;

-- ─────────────────── 4. public_profiles view ────────────────────
-- Definer-mode view: it bypasses RLS on the underlying profiles row and
-- applies the masking logic itself. Direct reads from profiles are blocked
-- by the tightened RLS below.
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
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;

grant select on public_profiles to authenticated;

-- ─────────────────── 5. Tighten profiles RLS ────────────────────
-- Block raw reads of investor rows for users who can't see them. The app
-- should read from public_profiles for general queries; only self / admin /
-- engaged-counterparties get the raw row directly.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or role <> 'investor'
    or exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
    or can_see_investor(id)
  );
