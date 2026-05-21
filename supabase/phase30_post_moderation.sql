-- ScaleTrek — Phase 30: Reality-Check post moderation.
--
-- Reality-Check posts (claims about real metrics / revenue / users) now go
-- through admin review before they hit the main feed. Dreamer posts publish
-- immediately as before.
--
-- Schema:
--   posts.status enum (pending | approved | rejected) with default 'approved'
--   trigger sets status='pending' for new posts where type='reality' (admins
--   get auto-approve so the migration runner / sample seeds don't sit in queue)
--   post_feed view: hide non-approved posts from non-authors and non-admins
--   moderation_notes: optional rejection reason for the author
--
-- Idempotent.

do $$ begin
  create type post_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

alter table posts
  add column if not exists status         post_status not null default 'approved',
  add column if not exists moderation_reason text,
  add column if not exists moderated_by    uuid references profiles(id) on delete set null,
  add column if not exists moderated_at    timestamptz;

create index if not exists posts_status_idx on posts(status, created_at desc);

-- ─────────────── auto-pending trigger for reality posts ──────────────
-- New reality-check posts from non-admin authors land in 'pending'. Admin
-- authors auto-approve.
create or replace function set_initial_post_status()
returns trigger
language plpgsql
as $$
declare
  author_role user_role;
begin
  -- Don't override explicit status (e.g. migration seeds).
  if new.status is distinct from 'approved' then
    return new;
  end if;
  if new.type = 'reality' then
    select role into author_role from profiles where id = new.user_id;
    if author_role <> 'admin' then
      new.status = 'pending';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_initial_post_status on posts;
create trigger trg_set_initial_post_status
  before insert on posts
  for each row execute function set_initial_post_status();

-- ─────────────── tighten post_feed view ──────────────
drop view if exists post_feed;
create view post_feed with (security_invoker = true) as
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
    and (p.scheduled_for is null or p.scheduled_for <= now() or p.user_id = auth.uid())
    and (
      p.status = 'approved'
      or p.user_id = auth.uid()
      or is_admin()
    );

-- ─────────────── moderation helpers (called from app) ──────────────
-- Approve a post + notify the author.
create or replace function approve_post(post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  post_row record;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  update posts
    set status = 'approved',
        moderation_reason = null,
        moderated_by = caller,
        moderated_at = now()
    where id = post_id
    returning id, user_id, milestone_title into post_row;
  if post_row.id is null then
    raise exception 'post not found';
  end if;
  -- Notify the author.
  insert into notifications (recipient_id, actor_id, type, post_id, message)
  values (
    post_row.user_id, caller, 'system', post_row.id,
    'Your reality check "' || post_row.milestone_title || '" was approved and is now live.'
  );
end;
$$;

create or replace function reject_post(post_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  post_row record;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  update posts
    set status = 'rejected',
        moderation_reason = reason,
        moderated_by = caller,
        moderated_at = now()
    where id = post_id
    returning id, user_id, milestone_title into post_row;
  if post_row.id is null then
    raise exception 'post not found';
  end if;
  insert into notifications (recipient_id, actor_id, type, post_id, message)
  values (
    post_row.user_id, caller, 'system', post_row.id,
    'Your reality check "' || post_row.milestone_title || '" was not approved'
      || coalesce(': ' || reason, '.')
  );
end;
$$;

grant execute on function approve_post(uuid) to authenticated;
grant execute on function reject_post(uuid, text) to authenticated;

-- ─────────────── existing posts: keep approved unless reality+non-admin ──────────────
-- Backfill: leave existing posts alone (already 'approved' via default).
-- Phase reviewer can manually flip any historical reality posts to 'pending'
-- if desired:  update posts set status='pending' where type='reality' and ...
