-- ScaleTrek — Phase 14: post media (photos + videos)
-- Adds a post_media table (one post → many ordered media items) and a public
-- post-media storage bucket. Owner-only write; public read; cascade with post.
-- Idempotent.

-- ───────────────────────── storage bucket ─────────────────────────
insert into storage.buckets (id, name, public)
  values ('post-media', 'post-media', true) on conflict do nothing;

-- ───────────────────────── post_media table ───────────────────────
create table if not exists post_media (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references posts(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  url           text not null,
  storage_path  text not null,
  type          text not null check (type in ('image', 'video')),
  width         int,
  height        int,
  duration_ms   int,
  size_bytes    bigint,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists post_media_post_idx on post_media(post_id, position);
create index if not exists post_media_user_idx on post_media(user_id);

alter table post_media enable row level security;

drop policy if exists post_media_read on post_media;
create policy post_media_read on post_media for select
  using (
    exists (
      select 1 from posts p
      where p.id = post_media.post_id
        and (p.removed = false or p.user_id = auth.uid() or is_admin())
    )
  );

drop policy if exists post_media_owner_write on post_media;
create policy post_media_owner_write on post_media for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists post_media_admin_all on post_media;
create policy post_media_admin_all on post_media for all
  using (is_admin()) with check (is_admin());

-- ──────────────────── storage RLS for post-media ──────────────────
-- Authenticated users upload into post-media/<their-uuid>/*. Public read.
drop policy if exists "post media owner upload" on storage.objects;
create policy "post media owner upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post media public read" on storage.objects;
create policy "post media public read" on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "post media owner manage" on storage.objects;
create policy "post media owner manage" on storage.objects for all
  to authenticated
  using (bucket_id = 'post-media' and owner = auth.uid())
  with check (bucket_id = 'post-media' and owner = auth.uid());

drop policy if exists "post media admin all" on storage.objects;
create policy "post media admin all" on storage.objects for all
  to authenticated
  using (bucket_id = 'post-media' and is_admin())
  with check (bucket_id = 'post-media' and is_admin());

-- ───────────────────────── post_feed view refresh ─────────────────
-- Recreate the post_feed view to include a media[] aggregate so the client
-- only does one round-trip. Postgres needs a drop-then-create because the
-- column list changed.
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
  where p.removed = false;
