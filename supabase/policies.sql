-- ScaleTrek Row-Level Security
-- Canonical source of truth for all RLS policies.
-- Run order: schema.sql -> policies.sql -> seed.sql
-- Idempotent: every policy is dropped before re-create. Safe to re-run.

-- ───────────────────────── ENABLE RLS ─────────────────────────
alter table profiles              enable row level security;
alter table posts                 enable row level security;
alter table post_likes            enable row level security;
alter table post_signals          enable row level security;
alter table bookmarks             enable row level security;
alter table comments              enable row level security;
alter table follows               enable row level security;
alter table threads               enable row level security;
alter table messages              enable row level security;
alter table deals                 enable row level security;
alter table notifications         enable row level security;
alter table reports               enable row level security;
alter table verification_requests enable row level security;
alter table currencies            enable row level security;
alter table fx_rates              enable row level security;
alter table feature_flags         enable row level security;
alter table audit_log             enable row level security;

-- ───────────────────────── HELPER FN ──────────────────────────
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and suspended = false
  );
$$;

-- ─────────────────────────── PROFILES ─────────────────────────
-- Read: any authenticated user. Write/Update/Delete: row owner. Admin: all.
drop policy if exists profiles_read           on profiles;
drop policy if exists profiles_insert_self    on profiles;
drop policy if exists profiles_update_self    on profiles;
drop policy if exists profiles_delete_self    on profiles;
drop policy if exists profiles_admin_all      on profiles;

create policy profiles_read on profiles
  for select to authenticated using (true);

create policy profiles_insert_self on profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_delete_self on profiles
  for delete to authenticated using (id = auth.uid());

create policy profiles_admin_all on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- ──────────────────────────── POSTS ───────────────────────────
-- Read: any authenticated user (non-removed, plus owner can see own removed).
-- Insert/Update/Delete: only the post owner. Admin: all.
drop policy if exists posts_read         on posts;
drop policy if exists posts_owner_insert on posts;
drop policy if exists posts_owner_update on posts;
drop policy if exists posts_owner_delete on posts;
drop policy if exists posts_admin_all    on posts;

create policy posts_read on posts
  for select to authenticated
  using (removed = false or user_id = auth.uid() or is_admin());

create policy posts_owner_insert on posts
  for insert to authenticated with check (user_id = auth.uid());

create policy posts_owner_update on posts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy posts_owner_delete on posts
  for delete to authenticated using (user_id = auth.uid());

create policy posts_admin_all on posts
  for all to authenticated using (is_admin()) with check (is_admin());

-- ─────────────────── ENGAGEMENT (likes / signals / bookmarks) ─
drop policy if exists likes_read     on post_likes;
drop policy if exists likes_self     on post_likes;
create policy likes_read on post_likes for select to authenticated using (true);
create policy likes_self on post_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists signals_read on post_signals;
drop policy if exists signals_self on post_signals;
create policy signals_read on post_signals for select to authenticated using (true);
create policy signals_self on post_signals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bookmarks_self on bookmarks;
create policy bookmarks_self on bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────── COMMENTS ────────────────────────
drop policy if exists comments_read  on comments;
drop policy if exists comments_self  on comments;
drop policy if exists comments_admin on comments;
create policy comments_read on comments
  for select to authenticated
  using (removed = false or user_id = auth.uid() or is_admin());
create policy comments_self on comments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_admin on comments for all to authenticated
  using (is_admin()) with check (is_admin());

-- ──────────────────────────── FOLLOWS ─────────────────────────
drop policy if exists follows_read on follows;
drop policy if exists follows_self on follows;
create policy follows_read on follows for select to authenticated using (true);
create policy follows_self on follows for all to authenticated
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- ─────────────────── THREADS / MESSAGES (CHATS) ───────────────
-- Total isolation: only the two participants of a thread (or admin) can read
-- or write. Messages additionally require sender_id = auth.uid() on write.
drop policy if exists threads_participants_read    on threads;
drop policy if exists threads_participants_write   on threads;
drop policy if exists threads_participants_update  on threads;
drop policy if exists threads_participants_delete  on threads;

create policy threads_participants_read on threads
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or is_admin());

create policy threads_participants_write on threads
  for insert to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

create policy threads_participants_update on threads
  for update to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or is_admin())
  with check (user_a = auth.uid() or user_b = auth.uid() or is_admin());

create policy threads_participants_delete on threads
  for delete to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or is_admin());

drop policy if exists messages_participants_read   on messages;
drop policy if exists messages_participants_insert on messages;
drop policy if exists messages_participants_update on messages;
drop policy if exists messages_participants_delete on messages;

create policy messages_participants_read on messages
  for select to authenticated
  using (
    exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and (t.user_a = auth.uid() or t.user_b = auth.uid() or is_admin())
    )
  );

create policy messages_participants_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );

create policy messages_participants_update on messages
  for update to authenticated
  using (
    exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and (t.user_a = auth.uid() or t.user_b = auth.uid() or is_admin())
    )
  );

create policy messages_participants_delete on messages
  for delete to authenticated
  using (sender_id = auth.uid() or is_admin());

-- ──────────────────────────── DEALS ───────────────────────────
-- Total isolation: only the investor or the dreamer (business) on the deal
-- (or admin) can read/write.
drop policy if exists deals_participants_read   on deals;
drop policy if exists deals_participants_insert on deals;
drop policy if exists deals_participants_update on deals;
drop policy if exists deals_participants_delete on deals;

create policy deals_participants_read on deals
  for select to authenticated
  using (investor_id = auth.uid() or dreamer_id = auth.uid() or is_admin());

create policy deals_participants_insert on deals
  for insert to authenticated
  with check (investor_id = auth.uid() or dreamer_id = auth.uid());

create policy deals_participants_update on deals
  for update to authenticated
  using (investor_id = auth.uid() or dreamer_id = auth.uid() or is_admin())
  with check (investor_id = auth.uid() or dreamer_id = auth.uid() or is_admin());

create policy deals_participants_delete on deals
  for delete to authenticated
  using (investor_id = auth.uid() or dreamer_id = auth.uid() or is_admin());

-- ───────────────────────── NOTIFICATIONS ──────────────────────
drop policy if exists notif_self_read   on notifications;
drop policy if exists notif_self_update on notifications;
drop policy if exists notif_self_delete on notifications;
drop policy if exists notif_admin_all   on notifications;

create policy notif_self_read on notifications
  for select to authenticated
  using (recipient_id = auth.uid() or is_admin());

create policy notif_self_update on notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy notif_self_delete on notifications
  for delete to authenticated using (recipient_id = auth.uid() or is_admin());

create policy notif_admin_all on notifications
  for all to authenticated using (is_admin()) with check (is_admin());

-- ──────────────────────────── REPORTS ─────────────────────────
drop policy if exists reports_self_insert on reports;
drop policy if exists reports_self_read   on reports;
drop policy if exists reports_admin       on reports;
create policy reports_self_insert on reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_self_read on reports
  for select to authenticated
  using (reporter_id = auth.uid() or is_admin());
create policy reports_admin on reports
  for all to authenticated using (is_admin()) with check (is_admin());

-- ───────────────────── VERIFICATION REQUESTS ─────────────────
drop policy if exists verif_self_insert on verification_requests;
drop policy if exists verif_self_read   on verification_requests;
drop policy if exists verif_admin       on verification_requests;
create policy verif_self_insert on verification_requests
  for insert to authenticated with check (user_id = auth.uid());
create policy verif_self_read on verification_requests
  for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy verif_admin on verification_requests
  for all to authenticated using (is_admin()) with check (is_admin());

-- ─────────────────── REFERENCE DATA (currencies / fx / flags) ─
drop policy if exists ccy_read  on currencies;
drop policy if exists ccy_admin on currencies;
create policy ccy_read  on currencies for select to authenticated using (true);
create policy ccy_admin on currencies for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists fx_read  on fx_rates;
drop policy if exists fx_admin on fx_rates;
create policy fx_read  on fx_rates for select to authenticated using (true);
create policy fx_admin on fx_rates for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists flags_read  on feature_flags;
drop policy if exists flags_admin on feature_flags;
create policy flags_read  on feature_flags for select to authenticated using (true);
create policy flags_admin on feature_flags for all to authenticated
  using (is_admin()) with check (is_admin());

-- ────────────────────────── AUDIT LOG ─────────────────────────
drop policy if exists audit_admin on audit_log;
create policy audit_admin on audit_log
  for all to authenticated using (is_admin()) with check (is_admin());

-- ────────────────────── STORAGE OBJECT POLICIES ───────────────
drop policy if exists "post images upload"       on storage.objects;
drop policy if exists "post images read"         on storage.objects;
drop policy if exists "post images owner delete" on storage.objects;
create policy "post images upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images');
create policy "post images read" on storage.objects
  for select using (bucket_id = 'post-images');
create policy "post images owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and owner = auth.uid());

drop policy if exists "avatars read"   on storage.objects;
drop policy if exists "avatars upload" on storage.objects;
drop policy if exists "avatars owner"  on storage.objects;
create policy "avatars read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');
create policy "avatars owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "verification owner upload" on storage.objects;
drop policy if exists "verification owner read"   on storage.objects;
create policy "verification owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification');
create policy "verification owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification' and (owner = auth.uid() or is_admin()));
