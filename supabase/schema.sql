-- ScaleTrek schema
-- Run order: schema.sql -> policies.sql -> seed.sql (optional demo data)
-- This file is idempotent: safe to re-run on a fresh Supabase project.

create extension if not exists pgcrypto;

-- ──────────────────────────── ENUMS ────────────────────────────
do $$ begin
  create type user_role as enum ('dreamer', 'investor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_level as enum ('none', 'basic', 'verified', 'elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feed_type as enum ('dreamer', 'reality');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum ('exploring', 'negotiating', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notif_type as enum ('signal','follow','deal','system','verification','comment','mention');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verif_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_action as enum ('kept','removed');
exception when duplicate_object then null; end $$;

-- ──────────────────────────── TABLES ───────────────────────────

create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  name            text not null,
  username        text unique not null,
  avatar          text not null,
  role            user_role not null default 'dreamer',
  bio             text default '',
  industry        text,
  momentum_score  int not null default 50,
  verification_level verification_level not null default 'none',
  followers       int not null default 0,
  following       int not null default 0,
  showcase_count  int not null default 0,
  suspended       boolean not null default false,
  preferred_currency text not null default 'USD',
  preferred_language text not null default 'en',
  public_key      text,
  push_token      text,
  notify_signals  boolean not null default true,
  notify_follows  boolean not null default true,
  notify_deals    boolean not null default true,
  notify_comments boolean not null default true,
  notify_system   boolean not null default true,
  joined_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists profiles_role_idx on profiles(role);
create index if not exists profiles_industry_idx on profiles(industry);
create index if not exists profiles_momentum_idx on profiles(momentum_score desc);

create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  type            feed_type not null,
  milestone_title text not null,
  description     text not null,
  tags            text[] not null default '{}',
  media_type      text not null default 'metric',
  media_url       text,
  metric_label    text,
  metric_value    text,
  metric_unit     text,
  momentum_score  int not null default 50,
  likes           int not null default 0,
  comments_count  int not null default 0,
  signals         int not null default 0,
  risk_score      numeric(3,1) not null default 5,
  reward_score    numeric(3,1) not null default 5,
  industry        text not null default 'General',
  funding_goal_amount   numeric,
  funding_goal_currency text,
  current_funding_amount   numeric,
  current_funding_currency text,
  removed         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists posts_user_idx on posts(user_id);
create index if not exists posts_type_idx on posts(type);
create index if not exists posts_industry_idx on posts(industry);
create index if not exists posts_created_idx on posts(created_at desc);
create index if not exists posts_tags_idx on posts using gin(tags);

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists post_signals (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  parent_id   uuid references comments(id) on delete cascade,
  content     text not null,
  removed     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists comments_post_idx on comments(post_id, created_at desc);

create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on follows(followee_id);

create table if not exists threads (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references profiles(id) on delete cascade,
  user_b      uuid not null references profiles(id) on delete cascade,
  deal_stage  deal_stage not null default 'exploring',
  last_message text default '',
  last_time   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references threads(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  ciphertext  text not null,
  nonce       text,
  encrypted   boolean not null default true,
  read_by     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages(thread_id, created_at);

create table if not exists deals (
  id          uuid primary key default gen_random_uuid(),
  investor_id uuid not null references profiles(id) on delete cascade,
  dreamer_id  uuid not null references profiles(id) on delete cascade,
  post_id     uuid references posts(id) on delete set null,
  stage       deal_stage not null default 'exploring',
  amount      numeric,
  amount_currency text,
  notes       text default '',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists deals_investor_idx on deals(investor_id);
create index if not exists deals_dreamer_idx on deals(dreamer_id);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  type        notif_type not null,
  actor_id    uuid references profiles(id) on delete set null,
  post_id     uuid references posts(id) on delete set null,
  thread_id   uuid references threads(id) on delete set null,
  message     text not null,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notif_recipient_idx on notifications(recipient_id, created_at desc);

create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason      text not null,
  resolved    boolean not null default false,
  action      report_action,
  created_at  timestamptz not null default now()
);

create table if not exists verification_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  requested_level verification_level not null,
  evidence        text not null,
  status          verif_status not null default 'pending',
  created_at      timestamptz not null default now()
);

create table if not exists currencies (
  code        text primary key,
  name        text not null,
  symbol      text not null,
  decimals    int not null default 2,
  enabled     boolean not null default true,
  sort_order  int not null default 100,
  updated_at  timestamptz not null default now()
);

create table if not exists fx_rates (
  base        text not null,
  quote       text not null,
  rate        numeric not null,
  source      text not null default 'open.er-api.com',
  fetched_at  timestamptz not null default now(),
  primary key (base, quote)
);

create table if not exists feature_flags (
  key         text primary key,
  enabled     boolean not null default true,
  description text default '',
  updated_at  timestamptz not null default now()
);

create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at desc);

-- ───────────────────── TRIGGERS / COUNTERS ─────────────────────

create or replace function bump_post_likes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes = likes + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set likes = greatest(0, likes - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_post_likes on post_likes;
create trigger trg_post_likes after insert or delete on post_likes
for each row execute function bump_post_likes();

create or replace function bump_post_signals() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set signals = signals + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set signals = greatest(0, signals - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_post_signals on post_signals;
create trigger trg_post_signals after insert or delete on post_signals
for each row execute function bump_post_signals();

create or replace function bump_post_comments() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_post_comments on comments;
create trigger trg_post_comments after insert or delete on comments
for each row execute function bump_post_comments();

create or replace function bump_follows() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update profiles set following = following + 1 where id = new.follower_id;
    update profiles set followers = followers + 1 where id = new.followee_id;
    return new;
  elsif tg_op = 'DELETE' then
    update profiles set following = greatest(0, following - 1) where id = old.follower_id;
    update profiles set followers = greatest(0, followers - 1) where id = old.followee_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_follows on follows;
create trigger trg_follows after insert or delete on follows
for each row execute function bump_follows();

create or replace function bump_showcase_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update profiles set showcase_count = showcase_count + 1 where id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update profiles set showcase_count = greatest(0, showcase_count - 1) where id = old.user_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_showcase_count on posts;
create trigger trg_showcase_count after insert or delete on posts
for each row execute function bump_showcase_count();

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles for each row execute function touch_updated_at();
drop trigger if exists trg_posts_updated on posts;
create trigger trg_posts_updated before update on posts for each row execute function touch_updated_at();

-- New auth.users → create empty profile row (filled by client after signup)
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, username, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', '@' || split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', upper(substr(split_part(new.email, '@', 1), 1, 2)))
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists trg_on_auth_user on auth.users;
create trigger trg_on_auth_user after insert on auth.users
for each row execute function handle_new_user();

-- ───────────────────────── HELPER VIEWS ────────────────────────
create or replace view post_feed as
  select p.*, pr.name as user_name, pr.username, pr.avatar as user_avatar,
         pr.verification_level, pr.role as user_role
  from posts p join profiles pr on pr.id = p.user_id
  where p.removed = false;

-- ─────────────────────── RLS / POLICIES ────────────────────────
alter table profiles enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_signals enable row level security;
alter table bookmarks enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;
alter table deals enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table verification_requests enable row level security;
alter table currencies enable row level security;
alter table fx_rates enable row level security;
alter table feature_flags enable row level security;
alter table audit_log enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: anyone can read, only self can update, admin can do anything
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (true);
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update using (id = auth.uid());
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- posts: anyone can read non-removed, owner can CRUD, admin can CRUD
drop policy if exists posts_read on posts;
create policy posts_read on posts for select using (removed = false or user_id = auth.uid() or is_admin());
drop policy if exists posts_owner_write on posts;
create policy posts_owner_write on posts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists posts_admin_all on posts;
create policy posts_admin_all on posts for all using (is_admin()) with check (is_admin());

-- engagement (likes, signals, bookmarks): self
drop policy if exists likes_self on post_likes;
create policy likes_self on post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists likes_read on post_likes;
create policy likes_read on post_likes for select using (true);

drop policy if exists signals_self on post_signals;
create policy signals_self on post_signals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists signals_read on post_signals;
create policy signals_read on post_signals for select using (true);

drop policy if exists bookmarks_self on bookmarks;
create policy bookmarks_self on bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists comments_read on comments;
create policy comments_read on comments for select using (removed = false or user_id = auth.uid() or is_admin());
drop policy if exists comments_self on comments;
create policy comments_self on comments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists comments_admin on comments;
create policy comments_admin on comments for all using (is_admin()) with check (is_admin());

drop policy if exists follows_read on follows;
create policy follows_read on follows for select using (true);
drop policy if exists follows_self on follows;
create policy follows_self on follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- threads / messages: only participants (or admin)
drop policy if exists threads_participants on threads;
create policy threads_participants on threads for all
  using (user_a = auth.uid() or user_b = auth.uid() or is_admin())
  with check (user_a = auth.uid() or user_b = auth.uid() or is_admin());

drop policy if exists messages_participants on messages;
create policy messages_participants on messages for all
  using (
    exists (
      select 1 from threads t
      where t.id = thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid() or is_admin())
    )
  )
  with check (
    sender_id = auth.uid() and exists (
      select 1 from threads t
      where t.id = thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );

drop policy if exists deals_participants on deals;
create policy deals_participants on deals for all
  using (investor_id = auth.uid() or dreamer_id = auth.uid() or is_admin())
  with check (investor_id = auth.uid() or dreamer_id = auth.uid() or is_admin());

drop policy if exists notif_self on notifications;
create policy notif_self on notifications for select using (recipient_id = auth.uid() or is_admin());
drop policy if exists notif_self_write on notifications;
create policy notif_self_write on notifications for update using (recipient_id = auth.uid());
drop policy if exists notif_admin_insert on notifications;
create policy notif_admin_insert on notifications for insert with check (true);

drop policy if exists reports_self_insert on reports;
create policy reports_self_insert on reports for insert with check (reporter_id = auth.uid());
drop policy if exists reports_admin on reports;
create policy reports_admin on reports for all using (is_admin()) with check (is_admin());

drop policy if exists verif_self_insert on verification_requests;
create policy verif_self_insert on verification_requests for insert with check (user_id = auth.uid());
drop policy if exists verif_self_read on verification_requests;
create policy verif_self_read on verification_requests for select using (user_id = auth.uid() or is_admin());
drop policy if exists verif_admin on verification_requests;
create policy verif_admin on verification_requests for all using (is_admin()) with check (is_admin());

-- currencies / FX: public read, admin write
drop policy if exists ccy_read on currencies;
create policy ccy_read on currencies for select using (true);
drop policy if exists ccy_admin on currencies;
create policy ccy_admin on currencies for all using (is_admin()) with check (is_admin());

drop policy if exists fx_read on fx_rates;
create policy fx_read on fx_rates for select using (true);
drop policy if exists fx_admin on fx_rates;
create policy fx_admin on fx_rates for all using (is_admin()) with check (is_admin());

drop policy if exists flags_read on feature_flags;
create policy flags_read on feature_flags for select using (true);
drop policy if exists flags_admin on feature_flags;
create policy flags_admin on feature_flags for all using (is_admin()) with check (is_admin());

drop policy if exists audit_admin on audit_log;
create policy audit_admin on audit_log for all using (is_admin()) with check (true);

-- ───────────────────────── STORAGE BUCKETS ─────────────────────
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true) on conflict do nothing;
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public)
  values ('verification', 'verification', false) on conflict do nothing;

-- Storage policies: authenticated users can upload, public read on public buckets
drop policy if exists "post images upload" on storage.objects;
create policy "post images upload" on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');
drop policy if exists "post images read" on storage.objects;
create policy "post images read" on storage.objects for select
  using (bucket_id = 'post-images');
drop policy if exists "post images owner delete" on storage.objects;
create policy "post images owner delete" on storage.objects for delete
  using (bucket_id = 'post-images' and owner = auth.uid());

drop policy if exists "avatars rw" on storage.objects;
create policy "avatars rw" on storage.objects for all
  using (bucket_id = 'avatars') with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "verification owner upload" on storage.objects;
create policy "verification owner upload" on storage.objects for insert
  with check (bucket_id = 'verification' and auth.role() = 'authenticated');
drop policy if exists "verification admin read" on storage.objects;
create policy "verification admin read" on storage.objects for select
  using (bucket_id = 'verification' and (owner = auth.uid() or is_admin()));
