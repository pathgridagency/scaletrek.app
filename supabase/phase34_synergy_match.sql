-- ScaleTrek — Phase 34: Synergy Match.
--
-- A cross-industry partnership portal. Instead of matching on industry, it
-- matches on mutual problem-solving: User A's `strengths` solving User B's
-- `bottlenecks`, and vice versa. Completely industry-agnostic.
--
-- Flow:
--   1. A user opts in (`open_to_synergy`) and fills strengths + bottlenecks.
--   2. `synergy_candidates()` ranks every other opted-in user by a mutual
--      intersection score.
--   3. A user swipes interested / pass (`synergy_swipe`). When both sides are
--      interested a `partnership_matches` row is created and both are notified.
--
-- Idempotent.

-- ───────────────────── 1. profile columns ─────────────────────
alter table profiles
  add column if not exists strengths                 text[] not null default '{}',
  add column if not exists bottlenecks               text[] not null default '{}',
  add column if not exists open_to_synergy           boolean not null default false,
  add column if not exists synergy_hours_per_week    int,
  add column if not exists synergy_equity_expectation text;

create index if not exists profiles_open_to_synergy_idx
  on profiles(open_to_synergy) where open_to_synergy = true;

-- ───────────────────── 2. overlap helper ──────────────────────
-- Case-insensitive count of tags present in both arrays.
create or replace function synergy_overlap(a text[], b text[])
returns int
language sql
immutable
as $$
  select count(*)::int
  from (
    select lower(trim(unnest(coalesce(a, '{}'::text[]))))
    intersect
    select lower(trim(unnest(coalesce(b, '{}'::text[]))))
  ) t;
$$;

-- Synergy score (0-100) for an ordered pair of strength/bottleneck arrays.
-- Rewards raw overlap in both directions, with a mutuality bonus when both
-- sides solve something for the other.
create or replace function synergy_pair_score(
  a_strengths text[], a_bottlenecks text[],
  b_strengths text[], b_bottlenecks text[]
) returns int
language sql
immutable
as $$
  select least(
    100,
    ( synergy_overlap(a_bottlenecks, b_strengths)
      + synergy_overlap(b_bottlenecks, a_strengths) ) * 18
    + case
        when synergy_overlap(a_bottlenecks, b_strengths) > 0
         and synergy_overlap(b_bottlenecks, a_strengths) > 0
        then 10 else 0
      end
  )::int;
$$;

-- ───────────────────── 3. synergy_swipes ──────────────────────
create table if not exists synergy_swipes (
  swiper_id  uuid not null references profiles(id) on delete cascade,
  target_id  uuid not null references profiles(id) on delete cascade,
  direction  text not null check (direction in ('interested', 'pass')),
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index if not exists synergy_swipes_target_idx on synergy_swipes(target_id);

alter table synergy_swipes enable row level security;

drop policy if exists synergy_swipes_read on synergy_swipes;
create policy synergy_swipes_read on synergy_swipes
  for select to authenticated
  using (swiper_id = auth.uid() or target_id = auth.uid() or is_admin());

drop policy if exists synergy_swipes_self_write on synergy_swipes;
create policy synergy_swipes_self_write on synergy_swipes
  for all to authenticated
  using (swiper_id = auth.uid())
  with check (swiper_id = auth.uid());

-- ──────────────────── 4. partnership_matches ──────────────────
do $$ begin
  create type synergy_match_status as enum ('pending', 'matched', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists partnership_matches (
  id            uuid primary key default gen_random_uuid(),
  user_a        uuid not null references profiles(id) on delete cascade,
  user_b        uuid not null references profiles(id) on delete cascade,
  status        synergy_match_status not null default 'pending',
  synergy_score int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- canonical ordering so (A,B) and (B,A) collapse to one row.
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists partnership_matches_a_idx on partnership_matches(user_a);
create index if not exists partnership_matches_b_idx on partnership_matches(user_b);

alter table partnership_matches enable row level security;

drop policy if exists partnership_matches_read on partnership_matches;
create policy partnership_matches_read on partnership_matches
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or is_admin());

-- A participant may update the status (e.g. reject a match). Creation happens
-- only through the SECURITY DEFINER `synergy_swipe` RPC.
drop policy if exists partnership_matches_participant_update on partnership_matches;
create policy partnership_matches_participant_update on partnership_matches
  for update to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- ──────────────────── 5. candidate ranking ────────────────────
-- Ranked list of opted-in users the caller has not yet swiped, ordered by
-- mutual synergy. Industry-agnostic; only the strength/bottleneck fit matters.
create or replace function synergy_candidates()
returns table (
  id                          uuid,
  name                        text,
  username                    text,
  avatar                      text,
  avatar_url                  text,
  role                        user_role,
  headline                    text,
  industry                    text,
  company_name                text,
  bio                         text,
  verification_level          verification_level,
  strengths                   text[],
  bottlenecks                 text[],
  synergy_hours_per_week      int,
  synergy_equity_expectation  text,
  mine_solved                 int,
  theirs_solved               int,
  synergy_score               int
)
language sql
stable
security definer
set search_path = public
as $$
  select * from (
    select
      p.id, p.name, p.username, p.avatar, p.avatar_url, p.role,
      p.headline, p.industry, p.company_name, p.bio, p.verification_level,
      p.strengths, p.bottlenecks,
      p.synergy_hours_per_week, p.synergy_equity_expectation,
      synergy_overlap(me.bottlenecks, p.strengths)  as mine_solved,
      synergy_overlap(p.bottlenecks, me.strengths)  as theirs_solved,
      synergy_pair_score(me.strengths, me.bottlenecks, p.strengths, p.bottlenecks) as synergy_score
    from profiles p
    cross join (select * from profiles where id = auth.uid()) me
    where p.id <> me.id
      and p.open_to_synergy = true
      and p.suspended = false
      and not exists (
        select 1 from synergy_swipes s
        where s.swiper_id = auth.uid() and s.target_id = p.id
      )
  ) ranked
  where ranked.mine_solved + ranked.theirs_solved > 0
  order by ranked.synergy_score desc, ranked.id
  limit 50;
$$;

grant execute on function synergy_candidates() to authenticated;

-- ──────────────────── 6. swipe + match RPC ────────────────────
-- Records a swipe; when both users are interested it upserts a 'matched' row
-- and notifies both. Returns { matched: bool, match_id: uuid|null }.
create or replace function synergy_swipe(target uuid, dir text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me        uuid := auth.uid();
  is_match  boolean := false;
  the_match uuid;
  lo        uuid;
  hi        uuid;
  sc        int;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if target = me then raise exception 'cannot swipe yourself'; end if;
  if dir not in ('interested', 'pass') then raise exception 'invalid direction'; end if;

  insert into synergy_swipes (swiper_id, target_id, direction)
  values (me, target, dir)
  on conflict (swiper_id, target_id)
    do update set direction = excluded.direction, created_at = now();

  if dir = 'interested'
     and exists (
       select 1 from synergy_swipes s
       where s.swiper_id = target and s.target_id = me and s.direction = 'interested'
     )
  then
    is_match := true;
    lo := least(me, target);
    hi := greatest(me, target);

    select synergy_pair_score(pa.strengths, pa.bottlenecks, pb.strengths, pb.bottlenecks)
      into sc
      from profiles pa, profiles pb
     where pa.id = lo and pb.id = hi;

    insert into partnership_matches (user_a, user_b, status, synergy_score)
    values (lo, hi, 'matched', coalesce(sc, 0))
    on conflict (user_a, user_b)
      do update set status = 'matched', updated_at = now()
    returning id into the_match;

    insert into notifications (recipient_id, actor_id, type, message)
    values
      (target, me, 'system', 'You have a new Synergy Match — a complementary founder is ready to build.'),
      (me, target, 'system', 'You have a new Synergy Match — a complementary founder is ready to build.');
  end if;

  return jsonb_build_object('matched', is_match, 'match_id', the_match);
end;
$$;

grant execute on function synergy_swipe(uuid, text) to authenticated;

-- ──────────────────── 7. match feed view ──────────────────────
-- Each row is one of the caller's matches, flattened against the partner's
-- profile. security_invoker so RLS + auth.uid() resolve to the caller.
drop view if exists synergy_match_feed;
create view synergy_match_feed with (security_invoker = true) as
  select
    m.id,
    m.status,
    m.synergy_score,
    m.created_at,
    pr.id          as partner_id,
    pr.name        as partner_name,
    pr.username    as partner_username,
    pr.avatar      as partner_avatar,
    pr.avatar_url  as partner_avatar_url,
    pr.role        as partner_role,
    pr.headline    as partner_headline,
    pr.industry    as partner_industry,
    pr.company_name as partner_company,
    pr.verification_level as partner_verification,
    pr.strengths   as partner_strengths,
    pr.bottlenecks as partner_bottlenecks,
    pr.synergy_hours_per_week     as partner_hours,
    pr.synergy_equity_expectation as partner_equity
  from partnership_matches m
  join profiles pr
    on pr.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  where auth.uid() in (m.user_a, m.user_b);

grant select on synergy_match_feed to authenticated;

-- ──────────────────── 8. public_profiles — synergy columns ────
-- Rebuild the Phase 32 view, appending the 5 Synergy Match columns. Full
-- column list copied verbatim from Phase 32 so nothing is dropped.
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
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.avatar_url end                          as avatar_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.cover_url end                           as cover_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.headline end                            as headline,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.location end                            as location,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.website end                             as website,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.linkedin_url end                        as linkedin_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.twitter_url end                         as twitter_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.instagram_url end                       as instagram_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.github_url end                          as github_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.facebook_url end                        as facebook_url,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.company_name end                        as company_name,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.sector end                              as sector,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.founded_year end                        as founded_year,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then null else p.team_size end                           as team_size,
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
  case when p.role = 'investor' and not can_see_investor(p.id)
       then '{}'::text[] else p.strengths end                   as strengths,
  case when p.role = 'investor' and not can_see_investor(p.id)
       then '{}'::text[] else p.bottlenecks end                 as bottlenecks,
  p.open_to_synergy,
  p.synergy_hours_per_week,
  p.synergy_equity_expectation,
  case when p.role = 'investor'
       then can_see_investor(p.id)
       else true end                                            as identity_revealed
from profiles p;

grant select on public_profiles to authenticated;

-- ──────────────────── 9. realtime publication ─────────────────
do $$
declare t text;
begin
  for t in select unnest(array['synergy_swipes', 'partnership_matches']) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'skipping % (%): %', t, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
