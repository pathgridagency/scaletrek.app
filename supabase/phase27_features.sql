-- ScaleTrek — Phase 27: Premium features (saved posts, scheduled posts, handle)
-- Adds:
--   • saved_posts table (Pro)
--   • posts.scheduled_for column for delayed publishing (Elite)
--   • a trending_tags view exposing the hottest tags from the last 7 days
--   • profiles.handle column (lowercase unique slug, distinct from `username`)
-- Idempotent.

-- ──────────────── saved_posts (Pro feature) ────────────────
create table if not exists saved_posts (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists saved_posts_user_idx on saved_posts(user_id, saved_at desc);

alter table saved_posts enable row level security;

drop policy if exists saved_posts_self on saved_posts;
create policy saved_posts_self on saved_posts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ──────────────── scheduled_for (Elite feature) ─────────────
alter table posts
  add column if not exists scheduled_for timestamptz;
create index if not exists posts_scheduled_for_idx on posts(scheduled_for)
  where scheduled_for is not null;

-- The existing feed query / view filters `removed = false` but doesn't filter
-- on scheduled_for. Update post_feed view to hide future-scheduled posts from
-- everyone except the author.
drop view if exists post_feed;
create view post_feed as
  select p.*,
         pr.name              as user_name,
         pr.username,
         pr.avatar            as user_avatar,
         pr.verification_level,
         pr.role              as user_role,
         coalesce(
           (
             select jsonb_agg(
                      jsonb_build_object(
                        'id', m.id,
                        'url', m.url,
                        'type', m.type,
                        'width', m.width,
                        'height', m.height,
                        'duration_ms', m.duration_ms,
                        'position', m.position
                      ) order by m.position, m.created_at
                    )
             from post_media m
             where m.post_id = p.id
           ),
           '[]'::jsonb
         ) as media
  from posts p
  join profiles pr on pr.id = p.user_id
  where p.removed = false
    and (p.scheduled_for is null or p.scheduled_for <= now() or p.user_id = auth.uid());

-- ──────────────── trending_tags view ─────────────
-- Aggregates tags from posts of the last 7 days; counts unique authors per tag
-- so a single spammer can't dominate. Exposed read-only to authenticated users.
drop view if exists trending_tags;
create view trending_tags as
  with recent as (
    select p.id as post_id, p.user_id, unnest(p.tags) as tag
    from posts p
    where p.removed = false
      and p.created_at >= now() - interval '7 days'
      and p.tags is not null
  )
  select
    tag,
    count(*)::int                                                  as post_count,
    count(distinct user_id)::int                                   as author_count,
    rank() over (order by count(distinct user_id) desc, count(*) desc) as rank
  from recent
  group by tag
  having count(distinct user_id) >= 2
  order by author_count desc, post_count desc
  limit 25;

grant select on trending_tags to authenticated;

-- ──────────────── custom @handle (Pro feature) ─────────────
-- profiles.username exists already as the chosen handle; we add a separate
-- `handle` column that's a lowercase, unique slug for sharable URLs and is
-- only editable by Pro+ users (enforced in app code).
alter table profiles
  add column if not exists handle text;

create unique index if not exists profiles_handle_unique_idx
  on profiles(lower(handle))
  where handle is not null;
