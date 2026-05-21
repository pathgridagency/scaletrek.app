-- ScaleTrek — Phase 35: post comments backend.
--
-- The `comments` table already exists (schema.sql) with reply support
-- (`parent_id`), RLS, and the `bump_post_comments` count trigger. This phase
-- adds what the comments feature still needs:
--   - `edited_at` so comments can be edited with an "edited" marker
--   - `comment_likes` table
--   - `comment_feed` view (author profile + like_count + liked_by_me)
--   - realtime on comments + comment_likes
--
-- Idempotent. Client layer (sync/store/UI + PostDetailScreen) ships next.

-- ───────────────────── edited_at ──────────────────────
alter table comments add column if not exists edited_at timestamptz;

-- ──────────────────── comment_likes ───────────────────
create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_likes_comment_idx on comment_likes(comment_id);

alter table comment_likes enable row level security;

drop policy if exists comment_likes_read on comment_likes;
create policy comment_likes_read on comment_likes
  for select to authenticated using (auth.uid() is not null);

drop policy if exists comment_likes_self on comment_likes;
create policy comment_likes_self on comment_likes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ──────────────────── comment_feed view ───────────────
-- security_invoker = true so the `comments` RLS (hide removed from non-authors)
-- and auth.uid() resolve to the caller.
drop view if exists comment_feed;
create view comment_feed with (security_invoker = true) as
  select
    c.id,
    c.post_id,
    c.user_id,
    c.parent_id,
    c.content,
    c.removed,
    c.edited_at,
    c.created_at,
    pr.name               as user_name,
    pr.username           as user_username,
    pr.avatar             as user_avatar,
    pr.avatar_url         as user_avatar_url,
    pr.role               as user_role,
    pr.verification_level as user_verification,
    (select count(*) from comment_likes l where l.comment_id = c.id)::int as like_count,
    (select count(*) > 0 from comment_likes l
       where l.comment_id = c.id and l.user_id = auth.uid())             as liked_by_me
  from comments c
  join profiles pr on pr.id = c.user_id;

grant select on comment_feed to authenticated;

-- ──────────────────── realtime publication ────────────
do $$
declare t text;
begin
  for t in select unnest(array['comments', 'comment_likes']) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'skipping % (%): %', t, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
