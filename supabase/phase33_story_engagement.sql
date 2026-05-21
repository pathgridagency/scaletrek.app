-- ScaleTrek — Phase 33: story engagement (likes + comments).
-- Adds story_likes and story_comments tables, extends the story_feed view with
-- like_count / liked_by_me / comment_count, and wires both into realtime.
-- Idempotent.

-- ───────────────────────── story_likes ────────────────────────────
create table if not exists story_likes (
  story_id   uuid not null references stories(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
create index if not exists story_likes_story_idx on story_likes(story_id);

alter table story_likes enable row level security;

drop policy if exists story_likes_read on story_likes;
create policy story_likes_read on story_likes for select
  using (auth.uid() is not null);

drop policy if exists story_likes_self_insert on story_likes;
create policy story_likes_self_insert on story_likes for insert
  with check (user_id = auth.uid());

drop policy if exists story_likes_self_delete on story_likes;
create policy story_likes_self_delete on story_likes for delete
  using (user_id = auth.uid());

-- ──────────────────────── story_comments ──────────────────────────
create table if not exists story_comments (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references stories(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists story_comments_story_idx on story_comments(story_id, created_at);

alter table story_comments enable row level security;

drop policy if exists story_comments_read on story_comments;
create policy story_comments_read on story_comments for select
  using (auth.uid() is not null);

drop policy if exists story_comments_self_insert on story_comments;
create policy story_comments_self_insert on story_comments for insert
  with check (user_id = auth.uid());

-- A comment can be removed by its author, the story's owner, or an admin.
drop policy if exists story_comments_delete on story_comments;
create policy story_comments_delete on story_comments for delete
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from stories s where s.id = story_comments.story_id and s.user_id = auth.uid())
  );

-- ──────────────────── story_feed view (rebuilt) ───────────────────
-- security_invoker = true so auth.uid() resolves to the caller for
-- seen_by_me / liked_by_me.
drop view if exists story_feed;
create view story_feed with (security_invoker = true) as
  select s.*,
         pr.name      as user_name,
         pr.username  as user_username,
         pr.avatar    as user_avatar,
         pr.role      as user_role,
         pr.avatar_url,
         (select count(*) from story_views v where v.story_id = s.id)::int    as view_count,
         (select count(*) from story_likes l where l.story_id = s.id)::int    as like_count,
         (select count(*) from story_comments c where c.story_id = s.id)::int as comment_count,
         (select count(*) > 0 from story_views v
            where v.story_id = s.id and v.viewer_id = auth.uid())             as seen_by_me,
         (select count(*) > 0 from story_likes l
            where l.story_id = s.id and l.user_id = auth.uid())               as liked_by_me
  from stories s
  join profiles pr on pr.id = s.user_id
  where s.expires_at > now();

grant select on story_feed to authenticated;

-- ───────────────── add to realtime publication ────────────────────
do $$
declare t text;
begin
  for t in select unnest(array['story_likes','story_comments']) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'skipping % (%): %', t, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
