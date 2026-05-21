-- ScaleTrek — Phase 24: Stories (24h ephemeral photos + videos)
-- Adds a `stories` table, a public `stories` storage bucket, RLS policies,
-- a `story_feed` view that joins author profile, and a `purge_expired_stories`
-- function so a cron job (pg_cron or an Edge Function) can drop expired media.
-- Idempotent.

-- ───────────────────────── storage bucket ─────────────────────────
insert into storage.buckets (id, name, public)
  values ('stories', 'stories', true) on conflict do nothing;

-- ───────────────────────── stories table ──────────────────────────
create table if not exists stories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  url           text not null,
  storage_path  text not null,
  type          text not null check (type in ('image', 'video')),
  width         int,
  height        int,
  duration_ms   int,
  caption       text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '24 hours')
);
create index if not exists stories_user_idx       on stories(user_id, created_at desc);
create index if not exists stories_expires_idx    on stories(expires_at);
create index if not exists stories_created_at_idx on stories(created_at desc);

alter table stories enable row level security;

drop policy if exists stories_read on stories;
create policy stories_read on stories for select
  using (expires_at > now() or user_id = auth.uid() or is_admin());

drop policy if exists stories_owner_write on stories;
create policy stories_owner_write on stories for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists stories_admin_all on stories;
create policy stories_admin_all on stories for all
  using (is_admin()) with check (is_admin());

-- ────────────────── story views (count per viewer) ────────────────
create table if not exists story_views (
  story_id    uuid not null references stories(id) on delete cascade,
  viewer_id   uuid not null references profiles(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (story_id, viewer_id)
);
create index if not exists story_views_story_idx on story_views(story_id);

alter table story_views enable row level security;

drop policy if exists story_views_owner_or_viewer on story_views;
create policy story_views_owner_or_viewer on story_views for select
  using (
    viewer_id = auth.uid()
    or exists (select 1 from stories s where s.id = story_views.story_id and s.user_id = auth.uid())
    or is_admin()
  );

drop policy if exists story_views_viewer_insert on story_views;
create policy story_views_viewer_insert on story_views for insert
  with check (viewer_id = auth.uid());

-- ──────────────────── storage RLS for stories ─────────────────────
-- Authenticated upload into stories/<their-uuid>/*. Public read.
drop policy if exists "stories owner upload" on storage.objects;
create policy "stories owner upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "stories public read" on storage.objects;
create policy "stories public read" on storage.objects for select
  using (bucket_id = 'stories');

drop policy if exists "stories owner manage" on storage.objects;
create policy "stories owner manage" on storage.objects for all
  to authenticated
  using (bucket_id = 'stories' and owner = auth.uid())
  with check (bucket_id = 'stories' and owner = auth.uid());

drop policy if exists "stories admin all" on storage.objects;
create policy "stories admin all" on storage.objects for all
  to authenticated
  using (bucket_id = 'stories' and is_admin())
  with check (bucket_id = 'stories' and is_admin());

-- ───────────────────────── story_feed view ────────────────────────
-- Grouped per author: returns active stories with profile snapshot. Client
-- groups by user_id to show one circle per author.
-- security_invoker=true so auth.uid() resolves to the calling user (needed
-- for `seen_by_me`); RLS on the underlying tables still applies.
drop view if exists story_feed;
create view story_feed with (security_invoker = true) as
  select s.*,
         pr.name      as user_name,
         pr.username  as user_username,
         pr.avatar    as user_avatar,
         pr.role      as user_role,
         pr.avatar_url,
         (
           select count(*) from story_views v where v.story_id = s.id
         )::int as view_count,
         (
           select count(*) > 0 from story_views v
           where v.story_id = s.id and v.viewer_id = auth.uid()
         ) as seen_by_me
  from stories s
  join profiles pr on pr.id = s.user_id
  where s.expires_at > now();

-- ─────────────── purge function (call from cron / Edge Fn) ────────
create or replace function purge_expired_stories()
returns int
language plpgsql
security definer
as $$
declare
  removed int;
begin
  with deleted as (
    delete from stories where expires_at <= now() returning storage_path
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

grant execute on function purge_expired_stories() to service_role;

-- ───────────────── add to realtime publication ────────────────────
do $$
declare t text;
begin
  for t in select unnest(array['stories','story_views']) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'skipping % (%): %', t, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
